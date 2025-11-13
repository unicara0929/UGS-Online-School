import { User, UserRole } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { isConnectionOrTimeoutError, isNotFoundError, isConflictError } from './error-helpers'
import { createTemporaryUserFromSession, extractUserName, extractAndNormalizeRole } from './user-helpers'

// ブラウザ側のSupabaseクライアントを取得（api-client.tsと同じインスタンスを使用）
// 根本的な解決: 同じクライアントインスタンスを使用してセッションを共有
// @/lib/supabase/clientのcreateClientは既にシングルトンとして実装されているため、直接使用
function getSupabaseClient() {
  // サーバーサイドでは実行しない
  if (typeof window === 'undefined') {
    return null
  }
  
  try {
    // @/lib/supabase/clientのcreateClientを使用（Cookieベースのセッション管理）
    // これにより、api-client.tsと同じセッションを共有できる
    // createClientは既にシングルトンとして実装されているため、同じインスタンスが返される
    return createClient()
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    return null
  }
}

const supabase = typeof window !== 'undefined' ? getSupabaseClient() : null
const isSupabaseConfigured = Boolean(supabase && typeof window !== 'undefined')

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  referralCode?: string | null
  createdAt: Date
  updatedAt: Date
}

export class SupabaseAuthService {
  private static currentUser: AuthUser | null = null

  /**
   * プロファイルが見つからない場合の処理
   * プロファイルを作成し、最終ログイン日時を更新
   */
  private static async handleProfileNotFound(
    supabaseUser: { id: string; email?: string | null; user_metadata?: Record<string, any> | null; created_at: string; updated_at?: string | null },
    fallbackEmail: string
  ): Promise<AuthUser> {
    console.log('User profile not found, creating new profile...')
    
    const userName = extractUserName(supabaseUser.user_metadata, supabaseUser.email || fallbackEmail)
    const userRole = extractAndNormalizeRole(supabaseUser.user_metadata)
    
    console.log('Creating profile with:', { 
      userId: supabaseUser.id, 
      email: supabaseUser.email || fallbackEmail, 
      name: userName, 
      role: userRole 
    })
    
    try {
      const newUser = await this.createUserProfile(
        supabaseUser.id,
        supabaseUser.email || fallbackEmail,
        userName,
        userRole
      )
      this.currentUser = newUser
      
      await this.updateLastLoginAt(newUser.id)
      
      console.log('Profile created successfully:', newUser)
      return newUser
    } catch (createError: any) {
      console.error('Failed to create user profile:', createError)
      console.error('Create error details:', {
        message: createError.message,
        stack: createError.stack,
        response: createError.response
      })
      
      return this.handleProfileCreationError(createError, supabaseUser, fallbackEmail)
    }
  }

  /**
   * プロファイル作成のフォールバック処理
   * 404エラー以外の場合でもプロファイル作成を試みる
   */
  private static async handleProfileCreationFallback(
    supabaseUser: { id: string; email?: string | null; user_metadata?: Record<string, any> | null; created_at: string; updated_at?: string | null },
    fallbackEmail: string,
    originalError: unknown
  ): Promise<AuthUser> {
    const userName = extractUserName(supabaseUser.user_metadata, supabaseUser.email || fallbackEmail)
    const userRole = extractAndNormalizeRole(supabaseUser.user_metadata)
    
    try {
      const newUser = await this.createUserProfile(
        supabaseUser.id,
        supabaseUser.email || fallbackEmail,
        userName,
        userRole
      )
      this.currentUser = newUser
      
      await this.updateLastLoginAt(newUser.id)
      
      console.log('Profile created successfully after non-404 error:', newUser)
      return newUser
    } catch (createError: any) {
      return this.handleProfileCreationError(createError, supabaseUser, fallbackEmail, originalError)
    }
  }

  /**
   * プロファイル作成エラーの処理
   */
  private static handleProfileCreationError(
    createError: unknown,
    supabaseUser: { id: string; email?: string | null; user_metadata?: Record<string, any> | null; created_at: string; updated_at?: string | null },
    fallbackEmail: string,
    originalError?: unknown
  ): AuthUser {
    // データベース接続エラーまたはタイムアウトエラーの場合
    if (isConnectionOrTimeoutError(createError)) {
      const tempUser = createTemporaryUserFromSession(supabaseUser, fallbackEmail)
      this.currentUser = tempUser
      console.warn('Returning session-based user info due to database connection/timeout error during profile creation')
      return tempUser
    }
    
    // 既に存在する場合のエラーをチェック
    if (isConflictError(createError)) {
      // 既に存在する場合は、再度取得を試みる
      // 注意: この処理は非同期だが、エラー時は一時ユーザーを返す
      const tempUser = createTemporaryUserFromSession(supabaseUser, fallbackEmail)
      this.currentUser = tempUser
      console.warn('Profile creation conflict detected, returning session-based user info')
      return tempUser
    }
    
    // プロファイル作成に失敗した場合、元のエラーを投げる
    const errorMessage = originalError instanceof Error 
      ? originalError.message 
      : (createError instanceof Error ? createError.message : 'Unknown error')
    throw new Error(`ログインは成功しましたが、ユーザー情報の取得に失敗しました: ${errorMessage}`)
  }

  /**
   * 最終ログイン日時を更新
   */
  private static async updateLastLoginAt(userId: string): Promise<void> {
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.user.update({
        where: { id: userId },
        data: { lastLoginAt: new Date() }
      })
    } catch (updateError) {
      // 最終ログイン日時の更新失敗はログのみ（ログイン自体は成功）
      console.error('Failed to update lastLoginAt:', updateError)
    }
  }

  // ログイン
  static async login(email: string, password: string): Promise<AuthUser> {
    // サーバーサイドでは実行しない
    if (typeof window === 'undefined') {
      throw new Error('ログインはクライアントサイドでのみ実行できます')
    }
    
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('認証サービスが未設定です。環境変数を設定してください。')
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Supabase login error:', error)
        throw new Error(error.message)
      }

      if (!data.user) {
        throw new Error('ログインに失敗しました')
      }

      // ユーザー情報を取得
      try {
        const user = await this.getUserProfile(data.user.id)
        this.currentUser = user
        
        // 最終ログイン日時を更新
        await this.updateLastLoginAt(user.id)
        
        return user
      } catch (profileError: any) {
        console.error('Get user profile error after login:', profileError)
        console.error('Profile error details:', {
          message: profileError.message,
          userId: data.user.id,
          email: data.user.email,
          errorType: profileError.constructor.name,
          errorString: String(profileError)
        })
        
        // データベース接続エラーまたはタイムアウトエラーの場合
        if (isConnectionOrTimeoutError(profileError)) {
          console.error('Database connection or timeout error detected during login')
          const tempUser = createTemporaryUserFromSession(data.user, email)
          this.currentUser = tempUser
          console.warn('Returning session-based user info due to database connection/timeout error')
          return tempUser
        }
        
        // ユーザーが見つからない場合（404）、自動的にプロファイルを作成
        if (isNotFoundError(profileError)) {
          return await this.handleProfileNotFound(data.user, email)
        }
        
        // 404エラーではない場合でも、念のためプロファイル作成を試みる
        console.log('Non-404 error, but attempting to create profile anyway...')
        return await this.handleProfileCreationFallback(data.user, email, profileError)
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  // ログアウト
  static async logout(): Promise<void> {
    // サーバーサイドでは実行しない
    if (typeof window === 'undefined') {
      this.currentUser = null
      return
    }

    const client = getSupabaseClient()
    if (!client) {
      throw new Error('認証サービスが未設定です。環境変数を設定してください。')
    }
    const supabase = client
    if (!isSupabaseConfigured || !supabase) {
      this.currentUser = null
      return
    }
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw new Error(error.message)
      }
      this.currentUser = null
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }

  // ユーザー登録
  static async register(email: string, password: string, name: string): Promise<AuthUser> {
    // サーバーサイドでは実行しない
    if (typeof window === 'undefined') {
      throw new Error('ユーザー登録はクライアントサイドでのみ実行できます')
    }

    const client = getSupabaseClient()
    if (!client) {
      throw new Error('認証サービスが未設定です。環境変数を設定してください。')
    }
    const supabase = client
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('認証サービスが未設定です。環境変数を設定してください。')
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: 'MEMBER'
          }
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      if (!data.user) {
        throw new Error('ユーザー登録に失敗しました')
      }

      // ユーザープロファイルを作成
      const user = await this.createUserProfile(data.user.id, email, name, 'member')
      this.currentUser = user

      return user
    } catch (error) {
      console.error('Register error:', error)
      throw error
    }
  }

  // 現在のユーザーを取得
  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      // サーバーサイドでは実行しない（ブラウザ環境でのみ実行）
      if (typeof window === 'undefined') {
        console.warn('getCurrentUser called on server side, returning null')
        return null
      }

      // 既に取得済みの場合はそれを返す
      if (this.currentUser) {
        return this.currentUser
      }

      // サーバーサイドでは実行しない
      if (typeof window === 'undefined') {
        return null
      }

      const client = getSupabaseClient()
    if (!client) {
      throw new Error('認証サービスが未設定です。環境変数を設定してください。')
    }
    const supabase = client
      if (!isSupabaseConfigured || !supabase) {
        return null
      }

      // Supabaseセッションを確認
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Session error:', error)
        return null
      }

      if (!session?.user) {
        return null
      }

      // ユーザープロファイルを取得
      try {
        const user = await this.getUserProfile(session.user.id)
        this.currentUser = user
        return user
      } catch (profileError: any) {
        console.error('Get user profile error in getCurrentUser:', profileError)
        
        // データベース接続エラーの場合は、セッション情報から基本情報を返す
        if (isConnectionOrTimeoutError(profileError)) {
          console.warn('Database connection error in getCurrentUser, returning session-based user info')
          const tempUser = createTemporaryUserFromSession(session.user, session.user.email || undefined)
          this.currentUser = tempUser
          return tempUser
        }
        
        // 404エラーの場合、自動的にプロファイルを作成
        if (isNotFoundError(profileError)) {
          try {
            const newUser = await this.handleProfileNotFound(session.user, session.user.email || '')
            return newUser
          } catch (createError) {
            console.error('Failed to create user profile in getCurrentUser:', createError)
            
            // 既に存在する場合のエラーをチェック
            if (isConflictError(createError)) {
              try {
                const existingUser = await this.getUserProfile(session.user.id)
                this.currentUser = existingUser
                console.log('Retrieved existing user after create conflict in getCurrentUser:', existingUser)
                return existingUser
              } catch (retryError) {
                console.error('Failed to retrieve existing user in getCurrentUser:', retryError)
                // データベース接続エラーの場合は、セッション情報から基本情報を返す
                if (isConnectionOrTimeoutError(retryError)) {
                  const tempUser = createTemporaryUserFromSession(session.user, session.user.email || undefined)
                  this.currentUser = tempUser
                  return tempUser
                }
                return null
              }
            }
            return null
          }
        }
        return null
      }
    } catch (error) {
      console.error('Get current user error:', error)
      return null
    }
  }

  // ユーザープロファイルを作成
  private static async createUserProfile(
    userId: string, 
    email: string, 
    name: string, 
    role: UserRole
  ): Promise<AuthUser> {
    try {
      const response = await fetch('/api/auth/create-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          email,
          name,
          role
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Create profile API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        throw new Error(errorData.error || `ユーザープロファイルの作成に失敗しました (${response.status})`)
      }

      const userData = await response.json()
      
      if (!userData.user) {
        throw new Error('ユーザープロファイルの作成に失敗しました')
      }
      
      return userData.user
    } catch (error) {
      console.error('Create profile error:', error)
      throw error
    }
  }

  // ユーザープロファイルを取得
  // 根本的な解決: リトライではなく、接続プール設定を最適化することで問題を解決
  private static async getUserProfile(userId: string): Promise<AuthUser> {
    try {
      // 接続プール設定が最適化されていれば、リトライは不要
      const response = await fetch(`/api/auth/profile/${userId}`, {
        signal: AbortSignal.timeout(10000) // 10秒タイムアウト（接続プール設定が最適化されていれば十分）
      })
      
      // レスポンスボディを一度だけ読み込む（テキストとして）
      const responseText = await response.text()
      
      if (!response.ok) {
        let errorData: any = { error: 'Unknown error' }
        
        try {
          if (responseText && responseText.trim()) {
            errorData = JSON.parse(responseText)
          } else {
            errorData = { 
              error: `HTTP ${response.status}: ${response.statusText}`,
              details: 'Empty response body'
            }
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          console.error('Raw response text:', responseText.substring(0, 500))
          errorData = { 
            error: `HTTP ${response.status}: ${response.statusText}`,
            details: responseText || 'No error details available'
          }
        }
        
        console.error('Get profile API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          responseText: responseText.substring(0, 500) // 最初の500文字
        })
        
        // 503エラー（Service Unavailable）の場合、より詳細なエラー情報を提供
        if (response.status === 503) {
          const errorMessage = errorData.error || 'データベースに接続できません'
          const errorDetails = errorData.details || ''
          console.error('Database connection error details:', {
            status: response.status,
            error: errorMessage,
            details: errorDetails
          })
          throw new Error(`${errorMessage}${errorDetails ? `: ${errorDetails}` : ''}`)
        }
        
        // 404エラーの場合、より明確なエラーを投げる
        if (response.status === 404) {
          throw new Error('404: ユーザーが見つかりません')
        }
        
        throw new Error(errorData.error || `ユーザープロファイルの取得に失敗しました (${response.status})`)
      }

      // 成功レスポンスのパース
      let userData: any = {}
      
      try {
        if (responseText && responseText.trim()) {
          userData = JSON.parse(responseText)
        } else {
          console.error('Empty response body for success response')
          throw new Error('レスポンスが空です')
        }
      } catch (parseError) {
        console.error('Failed to parse success response:', parseError)
        console.error('Response text:', responseText.substring(0, 500))
        throw new Error('レスポンスの解析に失敗しました')
      }
      
      if (!userData.user) {
        throw new Error('ユーザープロファイルが見つかりません')
      }
      
      return userData.user
    } catch (error) {
      console.error('Get user profile error:', error)
      if (error instanceof Error) {
        throw error
      }
      throw new Error('ユーザープロファイルの取得に失敗しました')
    }
  }

  // 認証状態を確認
  static isAuthenticated(): boolean {
    return this.currentUser !== null
  }

  // ロールチェック
  static hasRole(role: UserRole): boolean {
    if (!this.currentUser) return false
    return this.currentUser.role === role
  }

  static hasAnyRole(roles: UserRole[]): boolean {
    if (!this.currentUser) return false
    return roles.includes(this.currentUser.role)
  }

  // アクセス権限チェック
  static canAccessFPContent(): boolean {
    return this.hasAnyRole(['fp', 'manager', 'admin'])
  }

  static canAccessManagerContent(): boolean {
    return this.hasAnyRole(['manager', 'admin'])
  }

  static canAccessAdminContent(): boolean {
    return this.hasRole('admin')
  }

  // パスワードリセット
  static async resetPassword(email: string): Promise<void> {
    // サーバーサイドでは実行しない
    if (typeof window === 'undefined') {
      throw new Error('パスワードリセットはクライアントサイドでのみ実行できます')
    }

    const client = getSupabaseClient()
    if (!client) {
      throw new Error('認証サービスが未設定です。環境変数を設定してください。')
    }
    const supabase = client
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('認証サービスが未設定です。環境変数を設定してください。')
    }
    try {
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password`

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      })

      if (error) {
        console.error('Reset password error:', error)
        throw new Error(error.message)
      }
    } catch (error) {
      console.error('Reset password error:', error)
      throw error
    }
  }

  // パスワード更新
  static async updatePassword(newPassword: string): Promise<void> {
    // サーバーサイドでは実行しない
    if (typeof window === 'undefined') {
      throw new Error('パスワード更新はクライアントサイドでのみ実行できます')
    }

    const client = getSupabaseClient()
    if (!client) {
      throw new Error('認証サービスが未設定です。環境変数を設定してください。')
    }
    const supabase = client
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('認証サービスが未設定です。環境変数を設定してください。')
    }
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      console.error('Update password error:', error)
      throw error
    }
  }

  // セッション変更を監視
  static onAuthStateChange(callback: (user: AuthUser | null) => void) {
    // サーバーサイドでは実行しない（ブラウザ環境でのみ実行）
    if (typeof window === 'undefined') {
      console.warn('onAuthStateChange called on server side, returning no-op subscription')
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      }
    }

    const client = getSupabaseClient()
    if (!client) {
      throw new Error('認証サービスが未設定です。環境変数を設定してください。')
    }
    const supabase = client
    if (!isSupabaseConfigured || !supabase) {
      // 監視不可の場合でも同じインターフェースで返す
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      }
    }

    try {
      const subscription = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
        try {
          console.log('Auth state change event:', event, 'Has session:', !!session?.user)

          // セッションがある場合は、プロファイルを取得してユーザー状態を更新
          if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED')) {
            try {
              const user = await this.getUserProfile(session.user.id)
              this.currentUser = user
              callback(user)
            } catch (error) {
              console.error(`Error getting user profile in onAuthStateChange (${event}):`, error)
              // プロファイル取得エラー時も既存のセッションを維持
              if (this.currentUser) {
                console.warn('Keeping current user session despite profile fetch error')
                // 既存のユーザーがいる場合は状態を保持（callback呼び出しなし）
              } else {
                // 初回ログイン時でプロファイル取得に失敗した場合
                // セッション情報から基本的なユーザー情報を作成
                console.warn('Initial session - creating temporary user from session due to profile fetch error')
                const tempUser = createTemporaryUserFromSession(
                  {
                    id: session.user.id,
                    email: session.user.email,
                    user_metadata: session.user.user_metadata,
                    created_at: session.user.created_at || new Date().toISOString(),
                    updated_at: session.user.updated_at || session.user.created_at || new Date().toISOString()
                  },
                  session.user.email || undefined
                )
                this.currentUser = tempUser
                callback(tempUser)
              }
            }
          } else if (event === 'SIGNED_OUT') {
            // ログアウト時のみユーザー状態をクリア
            this.currentUser = null
            callback(null)
          }
          // その他のイベント（PASSWORD_RECOVERYなど）は無視し、現在の状態を維持
        } catch (error) {
          console.error('Error in onAuthStateChange callback:', error)
          // 予期しないエラーでもセッションを保持
          if (this.currentUser) {
            console.warn('Unexpected error but keeping current user session')
          } else {
            callback(null)
          }
        }
      })
      
      // SupabaseのonAuthStateChangeは直接subscriptionオブジェクトを返す
      return {
        data: {
          subscription
        }
      }
    } catch (error) {
      console.error('Error setting up auth state change listener:', error)
      // エラー時も空のsubscriptionを返す
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      }
    }
  }
}

import { User, UserRole } from '@/lib/types'
import { supabase as sharedSupabase } from '@/lib/supabase'

// 共有のSupabaseクライアントを使用（重複インスタンスを避けるため）
const supabase = sharedSupabase
const isSupabaseConfigured = Boolean(supabase)

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

  // ログイン
  static async login(email: string, password: string): Promise<AuthUser> {
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
        try {
          const { prisma } = await import('@/lib/prisma')
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
          })
        } catch (updateError) {
          // 最終ログイン日時の更新失敗はログのみ（ログイン自体は成功）
          console.error('Failed to update lastLoginAt:', updateError)
        }
        
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
        const isConnectionOrTimeoutError = 
          profileError.constructor?.name === 'PrismaClientInitializationError' ||
          profileError.name === 'TimeoutError' ||
          profileError.name === 'AbortError' ||
          profileError.message?.includes('Can\'t reach database server') ||
          profileError.message?.includes('database server') ||
          profileError.message?.includes('timeout') ||
          profileError.message?.includes('Timeout') ||
          profileError.message?.includes('signal timed out')
        
        if (isConnectionOrTimeoutError) {
          console.error('Database connection or timeout error detected during login')
          // セッション情報から基本情報を返す
          const userName = data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User'
          let userRole = data.user.user_metadata?.role || 'MEMBER'
          if (typeof userRole === 'string') {
            userRole = userRole.toLowerCase()
          }
          
          const tempUser: AuthUser = {
            id: data.user.id,
            email: data.user.email || email,
            name: userName,
            role: userRole as UserRole,
            referralCode: null,
            createdAt: new Date(data.user.created_at),
            updatedAt: new Date(data.user.updated_at || data.user.created_at)
          }
          this.currentUser = tempUser
          console.warn('Returning session-based user info due to database connection/timeout error')
          return tempUser
        }
        
        // ユーザーが見つからない場合（404）、自動的にプロファイルを作成
        const errorMessage = String(profileError.message || profileError || '')
        const errorString = String(profileError)
        const isNotFoundError = 
          errorMessage.includes('404') || 
          errorMessage.includes('見つかりません') || 
          errorMessage.includes('not found') ||
          errorString.includes('404') ||
          (profileError instanceof Error && (profileError.message.includes('404') || profileError.message.includes('見つかりません')))
        
        console.log('isNotFoundError check:', {
          errorMessage,
          errorString,
          isNotFoundError,
          includes404: errorMessage.includes('404'),
          includesNotFound: errorMessage.includes('見つかりません')
        })
        
        if (isNotFoundError) {
          console.log('User profile not found, creating new profile...')
          try {
            // Supabaseのユーザー情報から名前を取得
            const userName = data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User'
            // Supabaseのuser_metadataからロールを取得（大文字小文字を考慮）
            let userRole = data.user.user_metadata?.role || 'MEMBER'
            // 大文字の場合は小文字に変換
            if (typeof userRole === 'string') {
              userRole = userRole.toLowerCase()
            }
            
            console.log('Creating profile with:', { userId: data.user.id, email: data.user.email || email, name: userName, role: userRole })
            
            // プロファイルを作成
            const newUser = await this.createUserProfile(
              data.user.id,
              data.user.email || email,
              userName,
              userRole as UserRole
            )
            this.currentUser = newUser
            
            // 最終ログイン日時を更新
            try {
              const { prisma } = await import('@/lib/prisma')
              await prisma.user.update({
                where: { id: newUser.id },
                data: { lastLoginAt: new Date() }
              })
            } catch (updateError) {
              console.error('Failed to update lastLoginAt:', updateError)
            }
            
            console.log('Profile created successfully:', newUser)
            return newUser
          } catch (createError: any) {
            console.error('Failed to create user profile:', createError)
            console.error('Create error details:', {
              message: createError.message,
              stack: createError.stack,
              response: createError.response
            })
            
            // データベース接続エラーまたはタイムアウトエラーの場合
            const isConnectionOrTimeoutError = 
              createError.constructor?.name === 'PrismaClientInitializationError' ||
              createError.name === 'TimeoutError' ||
              createError.name === 'AbortError' ||
              createError.message?.includes('Can\'t reach database server') ||
              createError.message?.includes('database server') ||
              createError.message?.includes('timeout') ||
              createError.message?.includes('Timeout') ||
              createError.message?.includes('signal timed out')
            
            if (isConnectionOrTimeoutError) {
              // セッション情報から基本情報を返す
              const userName = data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User'
              let userRole = data.user.user_metadata?.role || 'MEMBER'
              if (typeof userRole === 'string') {
                userRole = userRole.toLowerCase()
              }
              
              const tempUser: AuthUser = {
                id: data.user.id,
                email: data.user.email || email,
                name: userName,
                role: userRole as UserRole,
                referralCode: null,
                createdAt: new Date(data.user.created_at),
                updatedAt: new Date(data.user.updated_at || data.user.created_at)
              }
              this.currentUser = tempUser
              console.warn('Returning session-based user info due to database connection/timeout error during profile creation')
              return tempUser
            }
            
            // 既に存在する場合のエラーをチェック
            const createErrorMessage = String(createError.message || '')
            if (createErrorMessage.includes('409') || createErrorMessage.includes('既に登録')) {
              // 既に存在する場合は、再度取得を試みる
              try {
                const existingUser = await this.getUserProfile(data.user.id)
                this.currentUser = existingUser
                console.log('Retrieved existing user after create conflict:', existingUser)
                return existingUser
              } catch (retryError) {
                console.error('Failed to retrieve existing user:', retryError)
                throw new Error(`ユーザープロファイルの取得に失敗しました: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`)
              }
            }
            
            throw new Error(`ログインは成功しましたが、ユーザープロファイルの作成に失敗しました: ${createError.message}`)
          }
        } else {
          // 404エラーではない場合でも、念のためプロファイル作成を試みる
          console.log('Non-404 error, but attempting to create profile anyway...')
          try {
            const userName = data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User'
            let userRole = data.user.user_metadata?.role || 'MEMBER'
            if (typeof userRole === 'string') {
              userRole = userRole.toLowerCase()
            }
            
            const newUser = await this.createUserProfile(
              data.user.id,
              data.user.email || email,
              userName,
              userRole as UserRole
            )
            this.currentUser = newUser
            
            // 最終ログイン日時を更新
            try {
              const { prisma } = await import('@/lib/prisma')
              await prisma.user.update({
                where: { id: newUser.id },
                data: { lastLoginAt: new Date() }
              })
            } catch (updateError) {
              console.error('Failed to update lastLoginAt:', updateError)
            }
            
            console.log('Profile created successfully after non-404 error:', newUser)
            return newUser
          } catch (createError: any) {
            // データベース接続エラーまたはタイムアウトエラーの場合
            const isConnectionOrTimeoutError = 
              createError.constructor?.name === 'PrismaClientInitializationError' ||
              createError.name === 'TimeoutError' ||
              createError.name === 'AbortError' ||
              createError.message?.includes('Can\'t reach database server') ||
              createError.message?.includes('database server') ||
              createError.message?.includes('timeout') ||
              createError.message?.includes('Timeout') ||
              createError.message?.includes('signal timed out')
            
            if (isConnectionOrTimeoutError) {
              // セッション情報から基本情報を返す
              const userName = data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User'
              let userRole = data.user.user_metadata?.role || 'MEMBER'
              if (typeof userRole === 'string') {
                userRole = userRole.toLowerCase()
              }
              
              const tempUser: AuthUser = {
                id: data.user.id,
                email: data.user.email || email,
                name: userName,
                role: userRole as UserRole,
                referralCode: null,
                createdAt: new Date(data.user.created_at),
                updatedAt: new Date(data.user.updated_at || data.user.created_at)
              }
              this.currentUser = tempUser
              console.warn('Returning session-based user info due to database connection/timeout error during profile creation (non-404)')
              return tempUser
            }
            // プロファイル作成に失敗した場合、元のエラーを投げる
            throw new Error(`ログインは成功しましたが、ユーザー情報の取得に失敗しました: ${profileError.message}`)
          }
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  // ログアウト
  static async logout(): Promise<void> {
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
      // 既に取得済みの場合はそれを返す
      if (this.currentUser) {
        return this.currentUser
      }

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
        
        const errorMessage = profileError.message || ''
        const isNotFoundError = 
          errorMessage.includes('404') || 
          errorMessage.includes('見つかりません') || 
          errorMessage.includes('not found') ||
          (profileError instanceof Error && profileError.message.includes('404'))
        
        // データベース接続エラーの場合は、セッション情報から基本情報を返す
        const isConnectionError = 
          errorMessage.includes('connection') ||
          errorMessage.includes('Connection') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('Timeout') ||
          errorMessage.includes('TimeoutError') ||
          errorMessage.includes('signal timed out') ||
          errorMessage.includes('AbortError') ||
          profileError.name === 'TimeoutError' ||
          profileError.name === 'AbortError' ||
          errorMessage.includes('PrismaClientInitializationError')
        
        if (isConnectionError) {
          console.warn('Database connection error in getCurrentUser, returning session-based user info')
          // セッション情報から基本情報を構築
          const userName = session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User'
          let userRole = session.user.user_metadata?.role || 'MEMBER'
          if (typeof userRole === 'string') {
            userRole = userRole.toLowerCase()
          }
          
          // 一時的なユーザー情報を返す（データベース接続が復旧したら再取得される）
          const tempUser: AuthUser = {
            id: session.user.id,
            email: session.user.email || '',
            name: userName,
            role: userRole as UserRole,
            referralCode: null,
            createdAt: new Date(session.user.created_at),
            updatedAt: new Date(session.user.updated_at || session.user.created_at)
          }
          this.currentUser = tempUser
          return tempUser
        }
        
        // 404エラーの場合、自動的にプロファイルを作成
        if (isNotFoundError) {
          console.log('User profile not found in getCurrentUser, creating new profile...')
          try {
            // Supabaseのユーザー情報から名前を取得
            const userName = session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User'
            // Supabaseのuser_metadataからロールを取得（大文字小文字を考慮）
            let userRole = session.user.user_metadata?.role || 'MEMBER'
            // 大文字の場合は小文字に変換
            if (typeof userRole === 'string') {
              userRole = userRole.toLowerCase()
            }
            
            console.log('Creating profile in getCurrentUser with:', { 
              userId: session.user.id, 
              email: session.user.email, 
              name: userName, 
              role: userRole 
            })
            
            // プロファイルを作成
            const newUser = await this.createUserProfile(
              session.user.id,
              session.user.email || '',
              userName,
              userRole as UserRole
            )
            this.currentUser = newUser
            console.log('Profile created successfully in getCurrentUser:', newUser)
            return newUser
          } catch (createError: any) {
            console.error('Failed to create user profile in getCurrentUser:', createError)
            // 既に存在する場合のエラーをチェック
            const createErrorMessage = createError.message || ''
            if (createErrorMessage.includes('409') || createErrorMessage.includes('既に登録')) {
              // 既に存在する場合は、再度取得を試みる
              try {
                const existingUser = await this.getUserProfile(session.user.id)
                this.currentUser = existingUser
                console.log('Retrieved existing user after create conflict in getCurrentUser:', existingUser)
                return existingUser
              } catch (retryError) {
                console.error('Failed to retrieve existing user in getCurrentUser:', retryError)
                // データベース接続エラーの場合は、セッション情報から基本情報を返す
                const retryErrorMessage = retryError instanceof Error ? retryError.message : String(retryError)
                if (retryErrorMessage.includes('connection') || retryErrorMessage.includes('timeout')) {
                  const userName = session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User'
                  let userRole = session.user.user_metadata?.role || 'MEMBER'
                  if (typeof userRole === 'string') {
                    userRole = userRole.toLowerCase()
                  }
                  const tempUser: AuthUser = {
                    id: session.user.id,
                    email: session.user.email || '',
                    name: userName,
                    role: userRole as UserRole,
                    referralCode: null,
                    createdAt: new Date(session.user.created_at),
                    updatedAt: new Date(session.user.updated_at || session.user.created_at)
                  }
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
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Get profile API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        
        // 503エラー（Service Unavailable）の場合、接続プール設定の問題を示す
        if (response.status === 503) {
          throw new Error('データベース接続プールの設定が不適切です。PRISMA-OPTIMIZATION-GUIDE.mdを参照してください。')
        }
        
        // 404エラーの場合、より明確なエラーを投げる
        if (response.status === 404) {
          throw new Error('404: ユーザーが見つかりません')
        }
        
        throw new Error(errorData.error || `ユーザープロファイルの取得に失敗しました (${response.status})`)
      }

      const userData = await response.json()
      
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
      const subscription = supabase.auth.onAuthStateChange(async (event, session) => {
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            try {
              const user = await this.getUserProfile(session.user.id)
              this.currentUser = user
              callback(user)
            } catch (error) {
              console.error('Error getting user profile in onAuthStateChange:', error)
              // エラー時はnullを返すが、ログインは成功しているのでセッション情報からユーザーを作成
              callback(null)
            }
          } else if (event === 'SIGNED_OUT') {
            this.currentUser = null
            callback(null)
          } else if (event === 'TOKEN_REFRESHED' && session?.user) {
            try {
              const user = await this.getUserProfile(session.user.id)
              this.currentUser = user
              callback(user)
            } catch (error) {
              console.error('Error getting user profile in onAuthStateChange (TOKEN_REFRESHED):', error)
              callback(null)
            }
          } else {
            // その他のイベントの場合はnullを返す
            callback(null)
          }
        } catch (error) {
          console.error('Error in onAuthStateChange callback:', error)
          callback(null)
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

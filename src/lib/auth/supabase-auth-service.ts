import { createClient } from '@supabase/supabase-js'
import { User, UserRole } from '@/lib/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null

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
        
        // データベース接続エラーの場合
        if (profileError.constructor?.name === 'PrismaClientInitializationError' || 
            profileError.message?.includes('Can\'t reach database server') ||
            profileError.message?.includes('database server')) {
          console.error('Database connection error detected during login')
          throw new Error('データベースに接続できません。しばらく待ってから再度お試しください。')
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
            
            // データベース接続エラーの場合
            if (createError.constructor?.name === 'PrismaClientInitializationError' || 
                createError.message?.includes('Can\'t reach database server') ||
                createError.message?.includes('database server')) {
              throw new Error('データベースに接続できません。しばらく待ってから再度お試しください。')
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
            // データベース接続エラーの場合
            if (createError.constructor?.name === 'PrismaClientInitializationError' || 
                createError.message?.includes('Can\'t reach database server') ||
                createError.message?.includes('database server')) {
              throw new Error('データベースに接続できません。しばらく待ってから再度お試しください。')
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
        
        // 404エラーの場合、自動的にプロファイルを作成
        const errorMessage = profileError.message || ''
        const isNotFoundError = 
          errorMessage.includes('404') || 
          errorMessage.includes('見つかりません') || 
          errorMessage.includes('not found') ||
          (profileError instanceof Error && profileError.message.includes('404'))
        
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
  private static async getUserProfile(userId: string): Promise<AuthUser> {
    try {
      // リトライロジック付きでAPIを呼び出す
      let retryCount = 0
      const maxRetries = 3
      const retryDelay = 1000

      while (retryCount < maxRetries) {
        try {
          const response = await fetch(`/api/auth/profile/${userId}`, {
            signal: AbortSignal.timeout(10000) // 10秒タイムアウト
          })
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
            console.error('Get profile API error:', {
              status: response.status,
              statusText: response.statusText,
              error: errorData
            })
            
            // 503エラー（Service Unavailable）の場合はリトライ
            if (response.status === 503 && retryCount < maxRetries - 1) {
              retryCount++
              const waitTime = retryDelay * Math.pow(2, retryCount - 1)
              console.warn(`Database connection failed, retrying in ${waitTime}ms... (attempt ${retryCount}/${maxRetries})`)
              await new Promise(resolve => setTimeout(resolve, waitTime))
              continue
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
        } catch (fetchError: any) {
          // タイムアウトエラーの場合もリトライ
          if (
            (fetchError.name === 'AbortError' || fetchError.name === 'TimeoutError') &&
            retryCount < maxRetries - 1
          ) {
            retryCount++
            const waitTime = retryDelay * Math.pow(2, retryCount - 1)
            console.warn(`Request timeout, retrying in ${waitTime}ms... (attempt ${retryCount}/${maxRetries})`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
            continue
          }
          
          // リトライできないエラーまたは最大リトライ回数に達した場合
          throw fetchError
        }
      }
      
      throw new Error('ユーザープロファイルの取得に失敗しました（最大リトライ回数に達しました）')
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

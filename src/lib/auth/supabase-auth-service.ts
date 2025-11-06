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
        throw new Error(error.message)
      }

      if (!data.user) {
        throw new Error('ログインに失敗しました')
      }

      // ユーザー情報を取得
      const user = await this.getUserProfile(data.user.id)
      this.currentUser = user

      return user
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
      const user = await this.getUserProfile(session.user.id)
      this.currentUser = user

      return user
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
        throw new Error('ユーザープロファイルの作成に失敗しました')
      }

      const userData = await response.json()
      return userData.user
    } catch (error) {
      console.error('Create profile error:', error)
      throw error
    }
  }

  // ユーザープロファイルを取得
  private static async getUserProfile(userId: string): Promise<AuthUser> {
    try {
      const response = await fetch(`/api/auth/profile/${userId}`)
      
      if (!response.ok) {
        throw new Error('ユーザープロファイルの取得に失敗しました')
      }

      const userData = await response.json()
      return userData.user
    } catch (error) {
      console.error('Get profile error:', error)
      throw error
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
      })

      if (error) {
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
      } as any
    }
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const user = await this.getUserProfile(session.user.id)
        this.currentUser = user
        callback(user)
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null
        callback(null)
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        const user = await this.getUserProfile(session.user.id)
        this.currentUser = user
        callback(user)
      }
    })
  }
}

'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { AuthUser } from '@/lib/auth/supabase-auth-service'
import { SupabaseAuthService } from '@/lib/auth/supabase-auth-service'

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  isAuthenticated: boolean
  hasRole: (role: string) => boolean
  hasAnyRole: (roles: string[]) => boolean
  canAccessFPContent: () => boolean
  canAccessManagerContent: () => boolean
  canAccessAdminContent: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    let subscription: { unsubscribe: () => void } | null = null

    // 初期化時に現在のユーザーを取得
    const initializeAuth = async () => {
      try {
        const currentUser = await SupabaseAuthService.getCurrentUser()
        if (isMounted) {
          setUser(currentUser)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (isMounted) {
          setUser(null)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    initializeAuth()

    // 認証状態の変更を監視
    try {
      const result = SupabaseAuthService.onAuthStateChange((user) => {
        if (isMounted) {
          setUser(user)
          setIsLoading(false)
        }
      })
      
      if (result?.data?.subscription) {
        subscription = result.data.subscription
      }
    } catch (error) {
      console.error('Error setting up auth state change listener:', error)
    }

    return () => {
      isMounted = false
      if (subscription) {
        try {
          subscription.unsubscribe()
        } catch (error) {
          console.error('Error unsubscribing from auth state change:', error)
        }
      }
    }
  }, [])

  const login = async (email: string, password: string) => {
    const user = await SupabaseAuthService.login(email, password)
    setUser(user)
  }

  const logout = async () => {
    await SupabaseAuthService.logout()
    setUser(null)
  }

  const register = async (email: string, password: string, name: string) => {
    const user = await SupabaseAuthService.register(email, password, name)
    setUser(user)
  }

  const hasRole = (role: string) => {
    return user?.role === role
  }

  const hasAnyRole = (roles: string[]) => {
    return user ? roles.includes(user.role) : false
  }

  const canAccessFPContent = () => {
    return hasAnyRole(['fp', 'manager', 'admin'])
  }

  const canAccessManagerContent = () => {
    return hasAnyRole(['manager', 'admin'])
  }

  const canAccessAdminContent = () => {
    return hasRole('admin')
  }

  const value = {
    user,
    isLoading,
    login,
    logout,
    register,
    isAuthenticated: !!user,
    hasRole,
    hasAnyRole,
    canAccessFPContent,
    canAccessManagerContent,
    canAccessAdminContent,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

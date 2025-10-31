'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // 認証済みの場合はダッシュボードにリダイレクト
        window.location.href = '/dashboard'
      } else {
        // 未認証の場合はLPにリダイレクト
        window.location.href = '/lp'
      }
    }
  }, [isAuthenticated, isLoading])

  // ローディング中はスピナーを表示
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700"></div>
    </div>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { authenticatedFetch } from '@/lib/utils/api-client'
import { Loader2 } from 'lucide-react'

interface FPOnboardingGuardProps {
  children: React.ReactNode
}

/**
 * FPエイド向け動画ガイダンス未完了の場合にガイダンスページにリダイレクト
 */
export function FPOnboardingGuard({ children }: FPOnboardingGuardProps) {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      // 認証が完了していない場合は待機
      if (authLoading) return

      // FPエイドでない場合はチェック不要
      if (!user || user.role !== 'fp') {
        setIsChecking(false)
        return
      }

      try {
        const response = await authenticatedFetch('/api/user/fp-onboarding-status')
        
        if (response.ok) {
          const data = await response.json()
          
          // 未完了の場合はガイダンスページにリダイレクト
          if (!data.completed) {
            router.push('/dashboard/fp-onboarding')
            return
          }
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error)
        // エラー時はチェックをスキップ（既存ユーザーへの影響を最小化）
      } finally {
        setIsChecking(false)
      }
    }

    checkOnboardingStatus()
  }, [user, authLoading, router])

  if (authLoading || isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-600 mx-auto mb-4" />
          <p className="text-slate-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}


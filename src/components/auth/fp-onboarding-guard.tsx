'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { authenticatedFetch } from '@/lib/utils/api-client'
import { Loader2 } from 'lucide-react'

interface FPOnboardingGuardProps {
  children: React.ReactNode
}

interface FPOnboardingStatus {
  complianceTestPassed: boolean
  fpOnboardingCompleted: boolean
}

/**
 * FPエイドのオンボーディングフローを制御するガード
 * 1. コンプライアンステスト未合格 → /dashboard/compliance-test
 * 2. ガイダンス動画未視聴 → /dashboard/fp-onboarding
 */
export function FPOnboardingGuard({ children }: FPOnboardingGuardProps) {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
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

      // 既にオンボーディング関連ページにいる場合はチェック不要
      const onboardingPages = [
        '/dashboard/compliance-test',
        '/dashboard/fp-onboarding'
      ]
      if (onboardingPages.includes(pathname)) {
        setIsChecking(false)
        return
      }

      try {
        const response = await authenticatedFetch('/api/user/fp-onboarding-status')

        if (response.ok) {
          const data: FPOnboardingStatus = await response.json()

          // 1. コンプライアンステスト未合格 → テストページへ
          if (!data.complianceTestPassed) {
            router.push('/dashboard/compliance-test')
            // リダイレクト時はisCheckingをtrueのままにしてローディング画面を維持
            return
          }

          // 2. ガイダンス動画未視聴 → ガイダンスページへ
          if (!data.fpOnboardingCompleted) {
            router.push('/dashboard/fp-onboarding')
            // リダイレクト時はisCheckingをtrueのままにしてローディング画面を維持
            return
          }
        }

        // 完了している場合のみisCheckingをfalseに
        setIsChecking(false)
      } catch (error) {
        console.error('Error checking onboarding status:', error)
        // エラー時はチェックをスキップ（既存ユーザーへの影響を最小化）
        setIsChecking(false)
      }
    }

    checkOnboardingStatus()
  }, [user, authLoading, router, pathname])

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

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { authenticatedFetch } from '@/lib/utils/api-client'
import { Button } from '@/components/ui/button'
import {
  GraduationCap,
  CheckCircle,
  Circle,
  ArrowRight,
  X,
  Building2
} from 'lucide-react'

interface FPOnboardingStatus {
  needsOnboarding: boolean
  fpPromotionApproved: boolean
  managerContactConfirmed: boolean
  complianceTestPassed: boolean
  fpOnboardingCompleted: boolean
  bankAccountRegistered: boolean
}

/**
 * FPエイドオンボーディングバナー
 *
 * FPエイドに昇格後、オンボーディングが未完了の場合に表示。
 * クリックするとオンボーディングの続きから再開できる。
 */
export function FPOnboardingBanner() {
  const { user } = useAuth()
  const router = useRouter()
  const [status, setStatus] = useState<FPOnboardingStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    const fetchStatus = async () => {
      // ユーザーがいない場合はスキップ
      if (!user) {
        setIsLoading(false)
        return
      }

      try {
        const response = await authenticatedFetch('/api/user/fp-onboarding-status')
        if (response.ok) {
          const data = await response.json()
          setStatus(data)
        }
      } catch (error) {
        console.error('Error fetching FP onboarding status:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStatus()
  }, [user])

  // ロード中、ステータスなし、閉じた場合は非表示
  if (isLoading || !status || isDismissed) {
    return null
  }

  // オンボーディング不要の場合は非表示
  if (!status.needsOnboarding) {
    return null
  }

  // 全てのステップが完了している場合は非表示
  if (status.managerContactConfirmed && status.complianceTestPassed && status.fpOnboardingCompleted && status.bankAccountRegistered) {
    return null
  }

  // 完了したステップ数を計算
  const completedSteps = [
    status.managerContactConfirmed,
    status.complianceTestPassed,
    status.fpOnboardingCompleted,
    status.bankAccountRegistered
  ].filter(Boolean).length

  // 次に進むべきページを決定
  const getNextPage = () => {
    if (!status.managerContactConfirmed) {
      return '/dashboard/manager-contact'
    }
    if (!status.complianceTestPassed) {
      return '/dashboard/compliance-test'
    }
    if (!status.fpOnboardingCompleted) {
      return '/dashboard/fp-onboarding'
    }
    if (!status.bankAccountRegistered) {
      return '/dashboard/fp-bank-account'
    }
    return '/dashboard'
  }

  // 次のステップの名前を取得
  const getNextStepName = () => {
    if (!status.managerContactConfirmed) {
      return 'マネージャー連絡先の確認'
    }
    if (!status.complianceTestPassed) {
      return 'コンプライアンステスト'
    }
    if (!status.fpOnboardingCompleted) {
      return 'ガイダンス動画の視聴'
    }
    if (!status.bankAccountRegistered) {
      return '口座情報の登録'
    }
    return ''
  }

  const handleClick = () => {
    router.push(getNextPage())
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="py-2 sm:py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          {/* 上段: タイトルと進捗 */}
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" aria-hidden="true" />
              <span className="font-medium text-sm sm:text-base truncate">FPエイド昇格</span>
            </div>

            {/* 進捗インジケーター - PC表示 */}
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-1">
                {status.managerContactConfirmed ? (
                  <CheckCircle className="h-4 w-4 text-green-300" aria-hidden="true" />
                ) : (
                  <Circle className="h-4 w-4 text-white/50" aria-hidden="true" />
                )}
                <span className="text-xs text-white/80">連絡先</span>
              </div>
              <div className="w-4 h-px bg-white/30" />
              <div className="flex items-center gap-1">
                {status.complianceTestPassed ? (
                  <CheckCircle className="h-4 w-4 text-green-300" aria-hidden="true" />
                ) : (
                  <Circle className="h-4 w-4 text-white/50" aria-hidden="true" />
                )}
                <span className="text-xs text-white/80">テスト</span>
              </div>
              <div className="w-4 h-px bg-white/30" />
              <div className="flex items-center gap-1">
                {status.fpOnboardingCompleted ? (
                  <CheckCircle className="h-4 w-4 text-green-300" aria-hidden="true" />
                ) : (
                  <Circle className="h-4 w-4 text-white/50" aria-hidden="true" />
                )}
                <span className="text-xs text-white/80">動画</span>
              </div>
              <div className="w-4 h-px bg-white/30" />
              <div className="flex items-center gap-1">
                {status.bankAccountRegistered ? (
                  <CheckCircle className="h-4 w-4 text-green-300" aria-hidden="true" />
                ) : (
                  <Circle className="h-4 w-4 text-white/50" aria-hidden="true" />
                )}
                <span className="text-xs text-white/80">口座</span>
              </div>
            </div>

            <span className="text-xs sm:text-sm text-white/80 flex-shrink-0">
              ({completedSteps}/4)
            </span>

            {/* 閉じるボタン - SP表示では上段右端 */}
            <button
              onClick={() => setIsDismissed(true)}
              className="sm:hidden p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0"
              aria-label="閉じる"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* 下段: アクションボタン */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClick}
              className="bg-white text-blue-600 hover:bg-blue-50 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3 flex-1 sm:flex-none"
            >
              <span className="truncate">{getNextStepName()}</span>
              <ArrowRight className="ml-1 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" aria-hidden="true" />
            </Button>
            {/* 閉じるボタン - PC表示 */}
            <button
              onClick={() => setIsDismissed(true)}
              className="hidden sm:block p-1 hover:bg-white/10 rounded transition-colors"
              aria-label="閉じる"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

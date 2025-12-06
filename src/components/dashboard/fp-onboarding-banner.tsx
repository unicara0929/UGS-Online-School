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
  X
} from 'lucide-react'

interface FPOnboardingStatus {
  needsOnboarding: boolean
  fpPromotionApproved: boolean
  managerContactConfirmed: boolean
  complianceTestPassed: boolean
  fpOnboardingCompleted: boolean
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
  if (status.managerContactConfirmed && status.complianceTestPassed && status.fpOnboardingCompleted) {
    return null
  }

  // 完了したステップ数を計算
  const completedSteps = [
    status.managerContactConfirmed,
    status.complianceTestPassed,
    status.fpOnboardingCompleted
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
    return ''
  }

  const handleClick = () => {
    router.push(getNextPage())
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              <span className="font-medium">FPエイド オンボーディング</span>
            </div>

            {/* 進捗インジケーター */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center gap-1">
                {status.managerContactConfirmed ? (
                  <CheckCircle className="h-4 w-4 text-green-300" />
                ) : (
                  <Circle className="h-4 w-4 text-white/50" />
                )}
                <span className="text-xs text-white/80">連絡先</span>
              </div>
              <div className="w-4 h-px bg-white/30" />
              <div className="flex items-center gap-1">
                {status.complianceTestPassed ? (
                  <CheckCircle className="h-4 w-4 text-green-300" />
                ) : (
                  <Circle className="h-4 w-4 text-white/50" />
                )}
                <span className="text-xs text-white/80">テスト</span>
              </div>
              <div className="w-4 h-px bg-white/30" />
              <div className="flex items-center gap-1">
                {status.fpOnboardingCompleted ? (
                  <CheckCircle className="h-4 w-4 text-green-300" />
                ) : (
                  <Circle className="h-4 w-4 text-white/50" />
                )}
                <span className="text-xs text-white/80">動画</span>
              </div>
            </div>

            <span className="text-sm text-white/80">
              ({completedSteps}/3 完了)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClick}
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              {getNextStepName()}を始める
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              aria-label="閉じる"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

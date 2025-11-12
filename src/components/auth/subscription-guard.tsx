'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { authenticatedFetch } from '@/lib/utils/api-client'

interface SubscriptionStatus {
  status: string
  stripeDetails: {
    status: string
  } | null
}

interface SubscriptionGuardProps {
  children: React.ReactNode
  allowAccess?: boolean
}

/**
 * サブスクリプション状態に基づいてアクセスを制限するコンポーネント
 */
export function SubscriptionGuard({ children, allowAccess = false }: SubscriptionGuardProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (allowAccess || !user?.id) {
      setIsChecking(false)
      return
    }

    const checkSubscription = async () => {
      try {
        const response = await authenticatedFetch('/api/user/subscription', {
          credentials: 'include', // Cookieも送信
        })
        if (!response.ok) {
          setIsChecking(false)
          return
        }
        const data = await response.json()
        setSubscriptionStatus(data.subscription)
      } catch (error) {
        console.error('Error checking subscription:', error)
      } finally {
        setIsChecking(false)
      }
    }

    checkSubscription()
  }, [user?.id, allowAccess])

  // 管理者は常にアクセス可能
  if (user?.role === 'admin') {
    return <>{children}</>
  }

  if (isLoading || isChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!subscriptionStatus) {
    // サブスクリプションがない場合はアクセス可能（新規登録フロー）
    return <>{children}</>
  }

  const status = subscriptionStatus.stripeDetails?.status || subscriptionStatus.status.toLowerCase()
  const restrictedStatuses = ['past_due', 'unpaid', 'canceled', 'cancelled']

  if (restrictedStatuses.includes(status)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-pink-50 flex items-center justify-center">
        <div className="max-w-md mx-auto p-8 bg-white rounded-xl shadow-lg">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              {status === 'past_due' || status === 'unpaid' 
                ? '決済が完了していません' 
                : 'サブスクリプションが無効です'}
            </h2>
            <p className="text-slate-600 mb-6">
              {status === 'past_due' || status === 'unpaid'
                ? 'お支払いが完了していないため、サービスへのアクセスが制限されています。カード情報を更新して決済を完了してください。'
                : 'サブスクリプションがキャンセルされているため、サービスへのアクセスが制限されています。'}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard/settings/subscription')}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition-all duration-200"
              >
                サブスクリプション管理へ
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 px-6 py-3 rounded-lg font-medium transition-all duration-200"
              >
                ダッシュボードに戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}


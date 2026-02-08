'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
  /** 決済エラー時でもアクセスを許可するパス */
  allowedPaths?: string[]
}

/**
 * サブスクリプション状態に基づいてアクセスを制限するコンポーネント
 */
export function SubscriptionGuard({ children, allowAccess = false, allowedPaths = [] }: SubscriptionGuardProps) {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false)
  const [hasError, setHasError] = useState(false)

  // 現在のパスが許可リストに含まれているかチェック
  const isPathAllowed = allowedPaths.some(path => pathname?.startsWith(path))

  useEffect(() => {
    if (allowAccess || isPathAllowed || !user?.id) {
      setIsChecking(false)
      return
    }

    const checkSubscription = async () => {
      try {
        const response = await authenticatedFetch('/api/user/subscription', {
          credentials: 'include', // Cookieも送信
        })
        if (!response.ok) {
          // APIエラー時はセキュリティのためエラー状態にする
          setHasError(true)
          setIsChecking(false)
          return
        }
        const data = await response.json()
        setSubscriptionStatus(data.subscription)
        setHasError(false)
      } catch (error) {
        console.error('Error checking subscription:', error)
        // ネットワークエラー等でもセキュリティのためエラー状態にする
        setHasError(true)
      } finally {
        setIsChecking(false)
      }
    }

    checkSubscription()
  }, [user?.id, allowAccess, isPathAllowed])

  // ログアウト処理（エラー画面でも使用するため早めに定義）
  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      // エラーでもログインページへ
      window.location.href = '/login'
    }
  }

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

  // APIエラー時はアクセスをブロック（セキュリティ重視）
  if (hasError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-yellow-50 to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full mx-auto p-6 sm:p-8 bg-white rounded-xl shadow-lg">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              接続エラー
            </h2>
            <p className="text-slate-600 mb-6">
              サブスクリプション情報の確認中にエラーが発生しました。ページを再読み込みしてください。
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition-all duration-200"
              >
                ページを再読み込み
              </button>
              <button
                onClick={handleLogout}
                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-lg font-medium transition-all duration-200"
              >
                ログアウト
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-6">
              問題が解決しない場合は、サポートまでお問い合わせください。
            </p>
          </div>
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

  // カード情報更新ページを直接開く
  const handleUpdatePaymentMethod = async () => {
    setIsUpdatingPayment(true)
    try {
      const response = await authenticatedFetch('/api/user/subscription/update-payment-method', {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'カード情報更新ページの作成に失敗しました')
      }
      const data = await response.json()
      window.location.href = data.url
    } catch (error: any) {
      alert(error.message || 'カード情報更新ページの作成に失敗しました')
      setIsUpdatingPayment(false)
    }
  }

  if (restrictedStatuses.includes(status)) {
    const isPastDueOrUnpaid = status === 'past_due' || status === 'unpaid'

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full mx-auto p-6 sm:p-8 bg-white rounded-xl shadow-lg">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              {isPastDueOrUnpaid
                ? '決済が完了していません'
                : 'サブスクリプションが無効です'}
            </h2>
            <p className="text-slate-600 mb-6">
              {isPastDueOrUnpaid
                ? 'お支払いが完了していないため、サービスへのアクセスが制限されています。カード情報を更新して決済を完了してください。'
                : 'サブスクリプションがキャンセルされているため、サービスへのアクセスが制限されています。'}
            </p>
            <div className="space-y-3">
              {/* 決済更新ボタン（直接Stripeへ） */}
              {isPastDueOrUnpaid && (
                <button
                  onClick={handleUpdatePaymentMethod}
                  disabled={isUpdatingPayment}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-400 disabled:to-indigo-400 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition-all duration-200 flex items-center justify-center"
                >
                  {isUpdatingPayment ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      処理中...
                    </>
                  ) : (
                    'カード情報を更新する'
                  )}
                </button>
              )}

              {/* サブスクリプション管理へ（キャンセル済みの場合のみ表示） */}
              {!isPastDueOrUnpaid && (
                <button
                  onClick={() => {
                    // router.pushではSubscriptionGuardの再評価タイミングの問題でナビゲーションが
                    // 正しく動作しないため、window.location.hrefでフルリロードを行う
                    window.location.href = '/dashboard/settings/subscription'
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition-all duration-200"
                >
                  サブスクリプション管理へ
                </button>
              )}

              {/* ログアウト */}
              <button
                onClick={handleLogout}
                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-lg font-medium transition-all duration-200"
              >
                ログアウト
              </button>
            </div>

            {/* サポート案内 */}
            <p className="text-xs text-slate-500 mt-6">
              ご不明な点がございましたら、サポートまでお問い合わせください。
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}


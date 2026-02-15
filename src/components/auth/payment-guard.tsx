'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Loader2, AlertCircle } from 'lucide-react'

interface PaymentGuardProps {
  children: React.ReactNode
}

type CheckStatus = 'checking' | 'allowed' | 'blocked' | 'error'

/**
 * PaymentGuard - 決済状態をチェックし、未決済の場合は決済ページにリダイレクト
 *
 * セキュリティポリシー: Fail Secure（エラー時は拒否）
 * - APIエラー時はアクセス拒否（管理者を除く）
 * - ネットワークエラー時もアクセス拒否（管理者を除く）
 * - 管理者は常にアクセス可能（デバッグ・メンテナンス用）
 */
export function PaymentGuard({ children }: PaymentGuardProps) {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [status, setStatus] = useState<CheckStatus>('checking')
  const [errorMessage, setErrorMessage] = useState('')

  // 決済ページと設定ページはチェックをスキップ
  const isExcludedPage =
    pathname === '/complete-payment' ||
    pathname.startsWith('/dashboard/settings')

  useEffect(() => {
    if (!user?.id || isExcludedPage) {
      setStatus('allowed')
      return
    }

    checkSubscriptionStatus()
  }, [user?.id, isExcludedPage])

  const checkSubscriptionStatus = async () => {
    try {
      setStatus('checking')

      const response = await fetch('/api/subscription/status', {
        credentials: 'include'
      })

      if (!response.ok) {
        // APIエラー（4xx/5xx）の場合
        if (response.status === 401) {
          // 認証エラーはログインページへ
          router.push('/login')
          return
        }

        // その他のAPIエラーはFail Secure（アクセス拒否）
        // ただし管理者は例外
        if (user?.role === 'admin') {
          console.warn('Admin user allowed despite API error')
          setStatus('allowed')
          return
        }

        setErrorMessage('決済状態の確認に失敗しました。しばらくしてから再度お試しください。')
        setStatus('error')
        return
      }

      const data = await response.json()

      // 管理者は常にアクセス可能
      if (data.isAdmin || user?.role === 'admin') {
        setStatus('allowed')
        return
      }

      // サブスクリプションがアクティブでない場合は決済ページへ
      if (!data.hasActiveSubscription) {
        router.push('/complete-payment')
        setStatus('blocked')
        return
      }

      setStatus('allowed')
    } catch (error) {
      console.error('Error checking subscription:', error)

      // ネットワークエラー等の場合もFail Secure
      // ただし、管理者は例外的に許可
      if (user?.role === 'admin') {
        console.warn('Admin user allowed despite network error')
        setStatus('allowed')
      } else {
        setErrorMessage('ネットワークエラーが発生しました。インターネット接続を確認してください。')
        setStatus('error')
      }
    }
  }

  if (isExcludedPage) {
    return <>{children}</>
  }

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" aria-hidden="true" />
          <p className="text-slate-600">決済状態を確認中...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8 bg-white rounded-2xl shadow-xl">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" aria-hidden="true" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            アクセスエラー
          </h2>
          <p className="text-slate-600 mb-6">
            {errorMessage}
          </p>
          <button
            onClick={() => {
              setStatus('checking')
              checkSubscriptionStatus()
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            再試行
          </button>
          <div className="mt-4">
            <a
              href="/dashboard/settings/subscription"
              className="text-sm text-blue-600 hover:underline"
            >
              設定ページへ
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'blocked') {
    return null // リダイレクト中
  }

  return <>{children}</>
}

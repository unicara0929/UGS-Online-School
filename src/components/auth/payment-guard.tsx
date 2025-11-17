'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Loader2 } from 'lucide-react'

interface PaymentGuardProps {
  children: React.ReactNode
}

/**
 * PaymentGuard - 決済状態をチェックし、未決済の場合は決済ページにリダイレクト
 *
 * 使用例:
 * <PaymentGuard>
 *   <DashboardContent />
 * </PaymentGuard>
 */
export function PaymentGuard({ children }: PaymentGuardProps) {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  // 決済ページ自体はチェックをスキップ
  const isPaymentPage = pathname === '/complete-payment'

  useEffect(() => {
    if (!user?.id || isPaymentPage) {
      setIsChecking(false)
      setHasAccess(true)
      return
    }

    checkSubscriptionStatus()
  }, [user?.id, isPaymentPage])

  const checkSubscriptionStatus = async () => {
    try {
      setIsChecking(true)

      const response = await fetch('/api/subscription/status', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()

        // サブスクリプションがアクティブでない場合は決済ページへ
        if (!data.hasActiveSubscription) {
          router.push('/complete-payment')
          return
        }

        setHasAccess(true)
      } else {
        // APIエラーの場合はアクセスを許可（フォールバック）
        setHasAccess(true)
      }
    } catch (error) {
      console.error('Error checking subscription:', error)
      // エラー時もアクセスを許可（UXを優先）
      setHasAccess(true)
    } finally {
      setIsChecking(false)
    }
  }

  if (isPaymentPage) {
    return <>{children}</>
  }

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">決済状態を確認中...</p>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return null // リダイレクト中
  }

  return <>{children}</>
}

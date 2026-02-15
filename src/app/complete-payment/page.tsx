'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Clock, CreditCard, AlertCircle, Loader2 } from 'lucide-react'

export default function CompletePaymentPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [expirationDate, setExpirationDate] = useState<string | null>(null)

  useEffect(() => {
    checkSubscriptionStatus()
  }, [user])

  const checkSubscriptionStatus = async () => {
    if (!user?.id) {
      router.push('/login')
      return
    }

    try {
      const response = await fetch('/api/subscription/status', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setHasActiveSubscription(data.hasActiveSubscription)

        // 仮登録の有効期限を計算（登録から7日後）
        if (!data.hasActiveSubscription && user.email) {
          const createdAt = new Date(user.createdAt || Date.now())
          const expiration = new Date(createdAt)
          expiration.setDate(expiration.getDate() + 7)
          setExpirationDate(expiration.toLocaleDateString('ja-JP'))
        }

        // 既に決済済みの場合はダッシュボードへリダイレクト
        if (data.hasActiveSubscription) {
          router.push('/dashboard')
          return
        }
      }
    } catch (error) {
      console.error('Error checking subscription:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartPayment = async () => {
    try {
      // Stripe Checkoutセッションを作成
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: user?.email,
          name: user?.name
        })
      })

      if (response.ok) {
        const { url } = await response.json()
        if (url) {
          window.location.href = url
        }
      } else {
        alert('決済ページの作成に失敗しました')
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('決済ページの作成に失敗しました')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-white" aria-hidden="true" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-slate-900">
              🎉 ようこそ、{user?.name || user?.email?.split('@')[0]}さん！
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              アカウントの登録がもう少しで完了します
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* 現在の状態 */}
            <div className="bg-slate-50 rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-slate-600" aria-hidden="true" />
                現在の状態
              </h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" aria-hidden="true" />
                  <span className="text-slate-700">メールアドレス認証：<strong className="text-green-600">完了</strong></span>
                </div>
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mr-3" aria-hidden="true" />
                  <span className="text-slate-700">お支払い：<strong className="text-yellow-600">未完了</strong></span>
                </div>
              </div>
            </div>

            {/* 料金プラン */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
              <div className="text-center space-y-2">
                {process.env.NEXT_PUBLIC_STRIPE_SETUP_FEE_ENABLED === 'true' ? (
                  <>
                    <div className="text-sm text-slate-600">
                      <div className="flex justify-between px-4">
                        <span>初回登録費用</span>
                        <span>¥33,000</span>
                      </div>
                      <div className="flex justify-between px-4">
                        <span>月額利用料（1ヶ月目）</span>
                        <span>¥5,500</span>
                      </div>
                    </div>
                    <div className="border-t pt-2">
                      <div className="text-sm text-slate-500 mb-1">今日のお支払い</div>
                      <p className="text-4xl font-bold text-slate-900">¥38,500</p>
                      <p className="text-sm text-slate-600 mt-1">(税込)</p>
                    </div>
                    <div className="text-sm text-slate-600 pt-2">
                      <span className="text-slate-900 font-semibold">2ヶ月目以降：</span> ¥5,500/月
                    </div>
                  </>
                ) : (
                  <>
                    <div className="border-t pt-2">
                      <div className="text-sm text-slate-500 mb-1">月額料金</div>
                      <p className="text-4xl font-bold text-slate-900">¥5,500</p>
                      <p className="text-sm text-slate-600 mt-1">(税込)</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 決済ボタン */}
            <Button
              onClick={handleStartPayment}
              className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-shadow"
            >
              <CreditCard className="h-5 w-5 mr-2" aria-hidden="true" />
              {process.env.NEXT_PUBLIC_STRIPE_SETUP_FEE_ENABLED === 'true'
                ? '¥38,500で決済して利用開始'
                : '¥5,500で決済して利用開始'}
            </Button>

            {/* 注意事項 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <div className="text-sm text-yellow-800 space-y-1">
                  <p className="font-semibold">決済を完了してサービスをご利用ください</p>
                  {expirationDate && (
                    <p>有効期限：<strong>{expirationDate}</strong>まで</p>
                  )}
                  <p className="text-xs text-yellow-700 mt-2">
                    ※ 期限を過ぎるとアカウント情報は削除されます
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* サポート情報 */}
        <div className="text-center mt-6 text-sm text-slate-600">
          <p>ご不明な点がございましたら、</p>
          <a href="mailto:support@ugs.example.com" className="text-blue-600 hover:underline">
            support@ugs.example.com
          </a>
          <p>までお気軽にお問い合わせください</p>
        </div>
      </div>
    </div>
  )
}

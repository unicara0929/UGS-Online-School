'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, CreditCard, Shield, ArrowLeft } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'

function CheckoutContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [emailVerified, setEmailVerified] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const name = searchParams.get('name')
  const verified = searchParams.get('verified') // メール認証完了フラグ

  // メールアドレス認証チェック
  useEffect(() => {
    const checkEmailVerification = async () => {
      if (!email) {
        setError('メールアドレスが指定されていません')
        setCheckingEmail(false)
        return
      }

      // URLパラメータでverified=trueがある場合は認証済みとみなす
      if (verified === 'true') {
        setEmailVerified(true)
        setCheckingEmail(false)
        return
      }

      try {
        // PendingUserのメール認証状態を確認
        const res = await fetch(`/api/pending-users/check?email=${encodeURIComponent(email)}`)
        const data = await res.json()

        if (res.ok && data.emailVerified) {
          setEmailVerified(true)
        } else {
          setError('メールアドレスの確認が完了していません。メールボックスを確認してください。')
        }
      } catch (err) {
        console.error('Email verification check error:', err)
        setError('メール認証状態の確認に失敗しました')
      } finally {
        setCheckingEmail(false)
      }
    }

    checkEmailVerification()
  }, [email, verified])

  // LocalStorageから紹介コードを取得
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRef = localStorage.getItem('referralCode')
      if (savedRef) {
        setReferralCode(savedRef)
        console.log('Referral code loaded for checkout:', savedRef)
      }
    }
  }, [])

  const handleCheckout = async () => {
    setIsLoading(true)
    setError('')

    try {
      // Stripe Checkout Sessionを作成（紹介コードも含める）
      console.log('Sending request to create checkout session...')
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          name: name,
          referralCode: referralCode, // 紹介コードを追加
        }),
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      // レスポンスのテキストを取得してJSONパースを試みる
      const responseText = await response.text()
      console.log('Response text:', responseText)

      let data
      try {
        data = JSON.parse(responseText)
        console.log('Parsed data:', data)
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError)
        setError('サーバーからの応答の解析に失敗しました')
        return
      }

      const { sessionId, url, error: sessionError, details, code } = data

      if (!response.ok || sessionError) {
        const errorMessage = details || sessionError || '決済セッションの作成に失敗しました'
        const errorCode = code ? ` (${code})` : ''
        setError(`${errorMessage}${errorCode}`)
        console.error('API Error Details:', {
          status: response.status,
          sessionError,
          details,
          code,
          fullData: data
        })
        return
      }

      console.log('Session ID:', sessionId)
      console.log('Checkout URL:', url)

      // Stripeが返したURLを使用（最も確実な方法）
      if (url) {
        window.location.href = url
      } else if (sessionId) {
        // URLが取得できない場合は、セッションIDから構築
        window.location.href = `https://checkout.stripe.com/c/pay/${sessionId}`
      } else {
        setError('決済セッションの作成に失敗しました')
      }
    } catch (err: any) {
      const errorMessage = err.message || '決済処理中にエラーが発生しました'
      setError(errorMessage)
      console.error('Checkout error:', err)
      console.error('Error details:', {
        message: err.message,
        stack: err.stack
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!email || !name) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-slate-900 mb-2">エラー</h2>
              <p className="text-slate-600 mb-4">必要な情報が不足しています。</p>
              <Link href="/register">
                <Button>登録ページに戻る</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/lp">
                <h1 className="text-2xl font-bold text-slate-900">UGSオンラインスクール</h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="outline">ログイン</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 決済情報 */}
          <div className="space-y-6">
            <div>
              <Link href="/register">
                <Button variant="ghost" size="sm" className="mb-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  登録ページに戻る
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">決済情報</h1>
              <p className="text-slate-600">UGSオンラインスクールのサブスクリプションを開始します</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  お支払い情報
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    お名前
                  </label>
                  <div className="p-3 bg-slate-50 rounded-lg border">
                    {name}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    メールアドレス
                  </label>
                  <div className="p-3 bg-slate-50 rounded-lg border">
                    {email}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  セキュリティ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    SSL暗号化通信
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Stripeによる安全な決済処理
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    クレジットカード情報は保存されません
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 料金プラン */}
          <div className="space-y-6">
            <Card className="border-2 border-slate-700">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">UGSオンラインスクール</CardTitle>
                <CardDescription>全機能利用可能</CardDescription>
                {process.env.NEXT_PUBLIC_STRIPE_SETUP_FEE_ENABLED === 'true' ? (
                  <div className="mt-4 space-y-2">
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
                      <span className="text-4xl font-bold text-slate-900">¥38,500</span>
                    </div>
                    <div className="text-sm text-slate-600 pt-2">
                      <span className="text-slate-900 font-semibold">2ヶ月目以降：</span> ¥5,500/月
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-slate-900">¥5,500</span>
                    <span className="text-slate-600">/月</span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span>全教育コンテンツへのアクセス</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span>昇格システム</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span>報酬管理機能</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span>イベント参加</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span>LP面談サポート</span>
                  </div>
                </div>

                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleCheckout}
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? '処理中...' :
                   process.env.NEXT_PUBLIC_STRIPE_SETUP_FEE_ENABLED === 'true'
                     ? '¥38,500で決済する'
                     : '¥5,500で決済する'}
                </Button>

                <p className="text-xs text-slate-500 text-center">
                  {process.env.NEXT_PUBLIC_STRIPE_SETUP_FEE_ENABLED === 'true'
                    ? '初回のみ登録費用が含まれます。2ヶ月目以降は月額¥5,500'
                    : '月額¥5,500でいつでもキャンセル可能'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">決済後の流れ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-slate-700 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                      1
                    </div>
                    <div>
                      <p className="font-medium">決済完了</p>
                      <p className="text-sm text-slate-600">Stripeで安全に決済処理</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-slate-700 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="font-medium">確認メール送信</p>
                      <p className="text-sm text-slate-600">決済完了メールが送信されます</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-slate-700 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="font-medium">ログイン開始</p>
                      <p className="text-sm text-slate-600">メール内のリンクからログイン</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700 mx-auto mb-4"></div>
          <p className="text-slate-600">読み込み中...</p>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}

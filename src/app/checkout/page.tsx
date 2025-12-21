'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, CreditCard, Shield, ArrowLeft, Users, Tag, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export const dynamic = 'force-dynamic'

interface ReferrerInfo {
  name: string
}

interface PromoCodeInfo {
  promoCodeId: string
  code: string
  discountDescription: string
  durationDescription: string
  estimatedMonthlyPrice: number
}

function CheckoutContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [referrerInfo, setReferrerInfo] = useState<ReferrerInfo | null>(null)
  const [emailVerified, setEmailVerified] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(true)
  const [promoCodeInput, setPromoCodeInput] = useState('')
  const [promoCodeInfo, setPromoCodeInfo] = useState<PromoCodeInfo | null>(null)
  const [promoCodeError, setPromoCodeError] = useState('')
  const [isValidatingPromo, setIsValidatingPromo] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const name = searchParams.get('name')
  const verified = searchParams.get('verified') // メール認証完了フラグ

  // メールアドレス認証チェック + 本登録済みチェック
  useEffect(() => {
    const checkEmailVerification = async () => {
      if (!email) {
        setError('メールアドレスが指定されていません')
        setCheckingEmail(false)
        return
      }

      try {
        // ユーザー状態を確認（本登録済み or 仮登録）
        const res = await fetch(`/api/pending-users/check?email=${encodeURIComponent(email)}`)
        const data = await res.json()

        if (res.ok) {
          // 本登録済みユーザーの場合はログインページへリダイレクト
          if (data.isFullyRegistered) {
            router.push(`/already-registered?email=${encodeURIComponent(email)}`)
            return
          }

          // 仮登録ユーザーの場合
          if (data.exists) {
            if (data.emailVerified || verified === 'true') {
              setEmailVerified(true)
            } else {
              setError('メールアドレスの確認が完了していません。メールボックスを確認してください。')
            }
          } else {
            // PendingUserが存在しない（新規登録からやり直しが必要）
            setError('登録情報が見つかりません。新規登録からやり直してください。')
          }
        } else {
          // APIエラー時はURLパラメータで判断
          if (verified === 'true') {
            setEmailVerified(true)
          } else {
            setError('メール認証状態の確認に失敗しました')
          }
        }
      } catch (err) {
        console.error('Email verification check error:', err)
        // エラー時はURLパラメータで判断
        if (verified === 'true') {
          setEmailVerified(true)
        } else {
          setError('メール認証状態の確認に失敗しました')
        }
      } finally {
        setCheckingEmail(false)
      }
    }

    checkEmailVerification()
  }, [email, verified, router])

  // 紹介情報を取得（PendingUserから）
  useEffect(() => {
    const fetchReferralInfo = async () => {
      if (!email) return

      try {
        const res = await fetch(`/api/pending-users/referral-info?email=${encodeURIComponent(email)}`)
        const data = await res.json()

        if (res.ok && data.hasReferral) {
          setReferralCode(data.referralCode)
          setReferrerInfo(data.referrer)
          console.log('Referral info loaded:', {
            code: data.referralCode,
            referrer: data.referrer?.name
          })
        }
      } catch (err) {
        console.error('Failed to fetch referral info:', err)
        // エラーでも処理は続行
      }
    }

    fetchReferralInfo()
  }, [email])

  // プロモコード検証
  const handleValidatePromoCode = async () => {
    if (!promoCodeInput.trim()) {
      setPromoCodeError('プロモーションコードを入力してください')
      return
    }

    setIsValidatingPromo(true)
    setPromoCodeError('')

    try {
      const response = await fetch('/api/promo-code/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: promoCodeInput.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        setPromoCodeError(data.error || '無効なプロモーションコードです')
        setPromoCodeInfo(null)
        return
      }

      setPromoCodeInfo({
        promoCodeId: data.promoCodeId,
        code: data.code,
        discountDescription: data.discountDescription,
        durationDescription: data.durationDescription,
        estimatedMonthlyPrice: data.estimatedMonthlyPrice,
      })
      setPromoCodeError('')
    } catch (err) {
      console.error('Promo code validation error:', err)
      setPromoCodeError('プロモーションコードの検証に失敗しました')
      setPromoCodeInfo(null)
    } finally {
      setIsValidatingPromo(false)
    }
  }

  // プロモコードをクリア
  const handleClearPromoCode = () => {
    setPromoCodeInput('')
    setPromoCodeInfo(null)
    setPromoCodeError('')
  }

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
          promoCodeId: promoCodeInfo?.promoCodeId, // プロモーションコードID
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
              <h2 className="text-xl font-semibold text-slate-900 mb-2">情報が不足しています</h2>
              <p className="text-slate-600 mb-2">
                {!email && !name
                  ? 'メールアドレスとお名前が指定されていません。'
                  : !email
                  ? 'メールアドレスが指定されていません。'
                  : 'お名前が指定されていません。'}
              </p>
              <p className="text-sm text-slate-500 mb-4">
                登録ページからやり直すか、認証メール内のリンクをクリックしてください。
              </p>
              <div className="space-y-2">
                <Link href="/register">
                  <Button className="w-full">新規登録ページへ</Button>
                </Link>
                <Link href="/verify-email-error">
                  <Button variant="outline" className="w-full">登録状況を確認する</Button>
                </Link>
              </div>
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
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center">
              <Link href="/lp">
                <h1 className="text-lg sm:text-2xl font-bold text-slate-900">UGS（UGS）</h1>
              </Link>
            </div>
            <div className="flex items-center">
              <Link href="/login">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm">ログイン</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* 決済情報 */}
          <div className="space-y-4 sm:space-y-6">
            <div>
              <Link href="/register">
                <Button variant="ghost" size="sm" className="mb-2 sm:mb-4 text-xs sm:text-sm">
                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  登録ページに戻る
                </Button>
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">決済情報</h1>
              <p className="text-sm sm:text-base text-slate-600">UGS（UGS）のサブスクリプションを開始します</p>
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

                {/* 紹介情報 */}
                {referralCode && referrerInfo && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <Users className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="font-semibold text-blue-900">紹介情報</span>
                    </div>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p>
                        <strong>{referrerInfo.name}</strong>さんの紹介で登録されました
                      </p>
                      <p className="text-xs text-blue-600">
                        紹介コード: <span className="font-mono">{referralCode}</span>
                      </p>
                      <Badge variant="secondary" className="mt-2 bg-blue-100 text-blue-800 border-blue-300">
                        紹介特典適用
                      </Badge>
                    </div>
                  </div>
                )}

                {/* プロモーションコード入力 */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Tag className="h-4 w-4 inline mr-1" />
                    プロモーションコード（お持ちの方）
                  </label>
                  {promoCodeInfo ? (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                          <span className="font-semibold text-green-900">コード適用済み</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleClearPromoCode}
                          className="text-slate-500 hover:text-slate-700"
                        >
                          取り消す
                        </Button>
                      </div>
                      <div className="text-sm text-green-800 space-y-1">
                        <p className="font-mono text-xs bg-green-100 inline-block px-2 py-1 rounded">
                          {promoCodeInfo.code}
                        </p>
                        <p className="font-semibold text-lg text-green-700">
                          {promoCodeInfo.discountDescription}（{promoCodeInfo.durationDescription}）
                        </p>
                        <p className="text-green-600">
                          月額料金: <span className="font-bold">¥{promoCodeInfo.estimatedMonthlyPrice.toLocaleString()}</span>/月
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="コードを入力"
                          value={promoCodeInput}
                          onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                          className="uppercase"
                          disabled={isValidatingPromo}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleValidatePromoCode}
                          disabled={isValidatingPromo || !promoCodeInput.trim()}
                        >
                          {isValidatingPromo ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            '適用'
                          )}
                        </Button>
                      </div>
                      {promoCodeError && (
                        <p className="text-sm text-red-600">{promoCodeError}</p>
                      )}
                    </div>
                  )}
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
            <Card className={`border-2 ${promoCodeInfo ? 'border-green-500' : 'border-slate-700'}`}>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">UGS（UGS）</CardTitle>
                <CardDescription>全機能利用可能</CardDescription>
                {promoCodeInfo ? (
                  <div className="mt-4 space-y-2">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-2">
                      <div className="flex items-center justify-center mb-1">
                        <Tag className="h-4 w-4 text-green-600 mr-1" />
                        <span className="text-green-700 font-semibold text-sm">プロモーション適用中</span>
                      </div>
                      <p className="text-green-600 text-xs">{promoCodeInfo.code}: {promoCodeInfo.discountDescription}（{promoCodeInfo.durationDescription}）</p>
                    </div>
                    <div className="text-sm text-slate-600">
                      <div className="flex justify-between px-4">
                        <span>初回登録費用</span>
                        <span className="line-through text-slate-400">¥33,000</span>
                        <span className="text-green-600 font-semibold">¥0（無料）</span>
                      </div>
                      <div className="flex justify-between px-4">
                        <span>月額利用料</span>
                        <span className="line-through text-slate-400">¥5,500</span>
                        <span className="text-green-600 font-semibold">¥{promoCodeInfo.estimatedMonthlyPrice.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="border-t pt-2">
                      <div className="text-sm text-slate-500 mb-1">今日のお支払い</div>
                      <span className="text-4xl font-bold text-green-600">¥{promoCodeInfo.estimatedMonthlyPrice.toLocaleString()}</span>
                    </div>
                    <div className="text-sm text-green-600 pt-2">
                      <span className="font-semibold">毎月：</span> ¥{promoCodeInfo.estimatedMonthlyPrice.toLocaleString()}/月
                    </div>
                  </div>
                ) : process.env.NEXT_PUBLIC_STRIPE_SETUP_FEE_ENABLED === 'true' ? (
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
                  className={`w-full ${promoCodeInfo ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  size="lg"
                >
                  {isLoading ? '処理中...' :
                   promoCodeInfo
                     ? `¥${promoCodeInfo.estimatedMonthlyPrice.toLocaleString()}で決済する`
                     : process.env.NEXT_PUBLIC_STRIPE_SETUP_FEE_ENABLED === 'true'
                       ? '¥38,500で決済する'
                       : '¥5,500で決済する'}
                </Button>

                <p className="text-xs text-slate-500 text-center">
                  {promoCodeInfo
                    ? `プロモーション適用: 登録費用無料、月額¥${promoCodeInfo.estimatedMonthlyPrice.toLocaleString()}（${promoCodeInfo.durationDescription}）`
                    : process.env.NEXT_PUBLIC_STRIPE_SETUP_FEE_ENABLED === 'true'
                      ? '初回のみ登録費用が含まれます。2ヶ月目以降は月額¥5,500'
                      : '月額¥5,500'}
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

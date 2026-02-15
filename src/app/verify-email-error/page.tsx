'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Mail, RefreshCw, ArrowRight, Loader2, CreditCard, CheckCircle } from 'lucide-react'
import Link from 'next/link'

function VerifyEmailErrorContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [email, setEmail] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [name, setName] = useState('')
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState('')
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showEmailInput, setShowEmailInput] = useState(false)

  useEffect(() => {
    const reasonParam = searchParams.get('reason')
    const emailParam = searchParams.get('email')
    if (reasonParam) setReason(reasonParam)
    if (emailParam) {
      setEmail(emailParam)
      setEmailInput(emailParam)
      // メールがある場合、認証状態を確認
      checkEmailStatus(emailParam)
    }
  }, [searchParams])

  const checkEmailStatus = async (emailAddr: string) => {
    try {
      const res = await fetch(`/api/pending-users/check?email=${encodeURIComponent(emailAddr)}`)
      const data = await res.json()
      if (res.ok && data.exists) {
        setName(data.name || '')
        setIsEmailVerified(data.emailVerified || false)
      }
    } catch (err) {
      console.error('Failed to check email status:', err)
    }
  }

  const handleCheckEmail = async () => {
    if (!emailInput) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/pending-users/check?email=${encodeURIComponent(emailInput)}`)
      const data = await res.json()
      if (res.ok) {
        if (data.isFullyRegistered) {
          // 本登録済み → ログインページへ
          router.push('/login')
          return
        }
        if (data.exists) {
          setEmail(emailInput)
          setName(data.name || '')
          setIsEmailVerified(data.emailVerified || false)
          setShowEmailInput(false)
        } else {
          setResendError('このメールアドレスでの仮登録が見つかりません。新規登録をお願いします。')
        }
      }
    } catch (err) {
      setResendError('確認に失敗しました。')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoToCheckout = () => {
    if (!email) return
    const checkoutUrl = `/checkout?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&verified=true`
    router.push(checkoutUrl)
  }

  const handleResendVerification = async () => {
    if (!email) {
      setResendError('メールアドレスが指定されていません。再度登録してください。')
      return
    }

    setIsResending(true)
    setResendError('')

    try {
      const response = await fetch('/api/pending-users/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '再送信に失敗しました')
      }

      setResendSuccess(true)
    } catch (error: any) {
      setResendError(error.message || '再送信に失敗しました')
    } finally {
      setIsResending(false)
    }
  }

  const getErrorMessage = () => {
    // 認証済みの場合は専用メッセージ
    if (isEmailVerified) {
      return {
        title: 'メール認証は完了しています',
        description: '決済を完了すると、すぐにサービスをご利用いただけます。',
        canResend: false,
        showCheckout: true
      }
    }

    switch (reason) {
      case 'expired':
        return {
          title: '認証リンクの有効期限が切れています',
          description: '認証リンクは24時間有効です。新しい認証メールを再送信してください。',
          canResend: true,
          showCheckout: false
        }
      case 'invalid_token':
        return {
          title: '認証リンクが無効です',
          description: '認証リンクが無効か、既に使用済みです。下記から状況を確認できます。',
          canResend: !!email,
          showCheckout: false
        }
      case 'error':
      default:
        return {
          title: 'メール認証でエラーが発生しました',
          description: '処理中にエラーが発生しました。再度お試しください。',
          canResend: !!email,
          showCheckout: false
        }
    }
  }

  const errorInfo = getErrorMessage()

  if (resendSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <Card className="shadow-2xl border-0">
            <CardHeader className="text-center pb-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <Mail className="h-8 w-8 text-white" aria-hidden="true" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-slate-900">
                認証メールを再送信しました
              </CardTitle>
              <CardDescription className="text-lg mt-2">
                {email}宛に新しい認証メールを送信しました
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  メールボックスを確認し、認証リンクをクリックしてください。
                  メールが届かない場合は、迷惑メールフォルダもご確認ください。
                </p>
              </div>
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  ログインページに戻る
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                isEmailVerified
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                  : 'bg-gradient-to-br from-red-500 to-orange-600'
              }`}>
                {isEmailVerified ? (
                  <CheckCircle className="h-8 w-8 text-white" aria-hidden="true" />
                ) : (
                  <AlertCircle className="h-8 w-8 text-white" aria-hidden="true" />
                )}
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              {errorInfo.title}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {errorInfo.description}
            </CardDescription>
            {email && (
              <p className="text-sm text-slate-600 mt-2">
                メールアドレス: <span className="font-medium">{email}</span>
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {resendError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{resendError}</p>
              </div>
            )}

            {/* 認証済みで決済待ちの場合 */}
            {errorInfo.showCheckout && email && (
              <Button
                onClick={handleGoToCheckout}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <CreditCard className="h-4 w-4 mr-2" aria-hidden="true" />
                決済を完了して本登録する
              </Button>
            )}

            {/* メール認証が必要な場合の再送信ボタン */}
            {errorInfo.canResend && email && !isEmailVerified && (
              <Button
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full"
              >
                {isResending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                    送信中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                    認証メールを再送信
                  </>
                )}
              </Button>
            )}

            {/* メールアドレスがない場合の入力フォーム */}
            {(!email || showEmailInput) && (
              <div className="space-y-3 bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-sm text-slate-700 font-medium">
                  登録時のメールアドレスを入力してください
                </p>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  spellCheck={false}
                />
                <Button
                  onClick={handleCheckEmail}
                  disabled={isLoading || !emailInput}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                      確認中...
                    </>
                  ) : (
                    '登録状況を確認'
                  )}
                </Button>
              </div>
            )}

            {/* メールアドレスがある場合、別のメールで確認するオプション */}
            {email && !showEmailInput && (
              <Button
                variant="ghost"
                onClick={() => setShowEmailInput(true)}
                className="w-full text-slate-600"
              >
                別のメールアドレスで確認する
              </Button>
            )}

            <div className="border-t border-slate-200 pt-4 space-y-3">
              <Link href="/register">
                <Button variant="outline" className="w-full">
                  新規登録ページへ
                  <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
                </Button>
              </Link>

              <div className="text-center">
                <Link href="/login" className="text-sm text-blue-600 hover:underline">
                  既にアカウントをお持ちの方はこちら
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function VerifyEmailErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" aria-hidden="true" />
      </div>
    }>
      <VerifyEmailErrorContent />
    </Suspense>
  )
}

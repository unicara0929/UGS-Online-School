'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Mail, RefreshCw, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'

function VerifyEmailErrorContent() {
  const searchParams = useSearchParams()
  const [reason, setReason] = useState('')
  const [email, setEmail] = useState('')
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState('')

  useEffect(() => {
    const reasonParam = searchParams.get('reason')
    const emailParam = searchParams.get('email')
    if (reasonParam) setReason(reasonParam)
    if (emailParam) setEmail(emailParam)
  }, [searchParams])

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
    switch (reason) {
      case 'expired':
        return {
          title: '認証リンクの有効期限が切れています',
          description: '認証リンクは24時間有効です。新しい認証メールを再送信してください。',
          canResend: true
        }
      case 'invalid_token':
        return {
          title: '認証リンクが無効です',
          description: '認証リンクが無効か、既に使用済みです。',
          canResend: !!email
        }
      case 'error':
      default:
        return {
          title: 'メール認証でエラーが発生しました',
          description: '処理中にエラーが発生しました。再度お試しください。',
          canResend: !!email
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
                  <Mail className="h-8 w-8 text-white" />
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
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              {errorInfo.title}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {errorInfo.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {resendError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{resendError}</p>
              </div>
            )}

            {errorInfo.canResend && email && (
              <Button
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full"
              >
                {isResending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    送信中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    認証メールを再送信
                  </>
                )}
              </Button>
            )}

            <Link href="/register">
              <Button variant="outline" className="w-full">
                新規登録ページへ
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>

            <div className="text-center pt-4">
              <Link href="/login" className="text-sm text-blue-600 hover:underline">
                既にアカウントをお持ちの方はこちら
              </Link>
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
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    }>
      <VerifyEmailErrorContent />
    </Suspense>
  )
}

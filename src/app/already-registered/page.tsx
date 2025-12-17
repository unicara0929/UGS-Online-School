'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, LogIn, CreditCard, AlertCircle } from 'lucide-react'
import Link from 'next/link'

function AlreadyRegisteredContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [isFullyRegistered, setIsFullyRegistered] = useState(false)
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const emailParam = searchParams.get('email')
    const statusParam = searchParams.get('status')
    const nameParam = searchParams.get('name')

    if (emailParam) {
      setEmail(emailParam)
      // URLパラメータから名前を取得（セキュリティ上、APIからは取得しない）
      if (nameParam) {
        setName(nameParam)
      }
      // 常にユーザー状態を確認
      checkUserStatus(emailParam, statusParam)
    } else {
      setIsChecking(false)
    }
  }, [searchParams])

  const checkUserStatus = async (emailAddr: string, statusHint: string | null) => {
    setIsChecking(true)
    try {
      const res = await fetch(`/api/pending-users/check?email=${encodeURIComponent(emailAddr)}`)
      const data = await res.json()
      if (res.ok) {
        if (data.isFullyRegistered) {
          // 本登録済みユーザー
          setIsFullyRegistered(true)
          setIsPending(false)
          setIsEmailVerified(true)
        } else if (data.exists) {
          // PendingUser（仮登録）
          setIsPending(true)
          setIsFullyRegistered(false)
          // セキュリティ: 名前はURLパラメータから取得済み（APIからは取得しない）
          setIsEmailVerified(data.emailVerified || false)
        } else {
          // どちらにも存在しない（新規登録可能）
          setIsPending(false)
          setIsFullyRegistered(false)
        }
      } else {
        // APIエラー時はURLパラメータのヒントを使用
        if (statusHint === 'pending') {
          setIsPending(true)
        }
      }
    } catch (err) {
      console.error('Failed to check user status:', err)
      // エラー時はURLパラメータのヒントを使用
      if (statusHint === 'pending') {
        setIsPending(true)
      }
    } finally {
      setIsChecking(false)
    }
  }

  const handleGoToCheckout = () => {
    if (!email) return
    setIsLoading(true)
    // checkoutページへ直接リダイレクト
    const checkoutUrl = `/checkout?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&verified=${isEmailVerified}`
    router.push(checkoutUrl)
  }

  const handleResendVerification = async () => {
    if (!email) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/pending-users/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      if (res.ok) {
        alert('認証メールを再送信しました。メールボックスをご確認ください。')
      } else {
        alert('再送信に失敗しました。')
      }
    } catch (err) {
      console.error('Failed to resend verification:', err)
      alert('再送信に失敗しました。')
    } finally {
      setIsLoading(false)
    }
  }

  // ローディング中
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700 mx-auto mb-4"></div>
          <p className="text-slate-600">登録状態を確認中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-4 sm:pb-6 px-4 sm:px-6">
            <div className="flex justify-center mb-3 sm:mb-4">
              <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center ${
                isFullyRegistered
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                  : 'bg-gradient-to-br from-yellow-500 to-orange-600'
              }`}>
                {isFullyRegistered ? (
                  <LogIn className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                ) : (
                  <Mail className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                )}
              </div>
            </div>
            <CardTitle className="text-xl sm:text-3xl font-bold text-slate-900">
              {isFullyRegistered ? '✅ 登録完了済みです' : '📧 既にご登録いただいています'}
            </CardTitle>
            <CardDescription className="text-sm sm:text-lg mt-2">
              {email && (
                <span className="font-semibold text-slate-700 break-all">{email}</span>
              )}
              {!email && 'このメールアドレス'}は既に登録済みです
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
            {/* ステータス説明 */}
            {isPending ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 sm:p-6">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-yellow-900 mb-1 sm:mb-2 text-sm sm:text-base">
                      {isEmailVerified ? '決済が未完了です' : 'メール認証が必要です'}
                    </h3>
                    <p className="text-xs sm:text-sm text-yellow-800 mb-2 sm:mb-3">
                      {isEmailVerified
                        ? 'アカウントの仮登録は完了していますが、決済が完了していません。下記のボタンから決済を完了すると、すぐにサービスをご利用いただけます。'
                        : 'アカウントの仮登録は完了していますが、メール認証がまだ完了していません。メールボックスを確認するか、認証メールを再送信してください。'}
                    </p>
                    <p className="text-xs text-yellow-700">
                      ※ 仮登録から7日経過すると、アカウント情報は削除されます
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1 sm:mb-2 text-sm sm:text-base">
                      既に本登録が完了しています
                    </h3>
                    <p className="text-xs sm:text-sm text-blue-800">
                      このメールアドレスは既に登録・決済が完了しています。
                      ログインしてサービスをご利用ください。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* アクションボタン */}
            <div className="space-y-2 sm:space-y-3 pt-2 sm:pt-4">
              {isPending ? (
                <>
                  {isEmailVerified ? (
                    <Button
                      onClick={handleGoToCheckout}
                      disabled={isLoading}
                      className="w-full h-12 sm:h-14 text-sm sm:text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
                    >
                      <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      {isLoading ? '処理中...' : '決済を完了して本登録する'}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleResendVerification}
                      disabled={isLoading}
                      className="w-full h-12 sm:h-14 text-sm sm:text-lg bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 shadow-lg hover:shadow-xl transition-all"
                    >
                      <Mail className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      {isLoading ? '送信中...' : '認証メールを再送信'}
                    </Button>
                  )}
                  <Button
                    onClick={() => router.push('/login')}
                    variant="outline"
                    className="w-full h-10 sm:h-12 text-sm"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    ログインする
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => router.push('/login')}
                    className="w-full h-12 sm:h-14 text-sm sm:text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
                  >
                    <LogIn className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    ログインする
                  </Button>
                  <Link href="/forgot-password">
                    <Button variant="link" className="w-full text-sm sm:text-base text-blue-600">
                      パスワードをお忘れの場合
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* ヘルプ情報 */}
            <div className="bg-slate-50 rounded-lg p-3 sm:p-4 mt-4 sm:mt-6 border border-slate-200">
              <h4 className="font-semibold text-slate-900 mb-1 sm:mb-2 text-xs sm:text-sm">
                💡 ログインできない場合
              </h4>
              <ul className="text-xs sm:text-sm text-slate-600 space-y-1">
                <li>• パスワードを忘れた場合は「パスワードをお忘れの場合」からリセットできます</li>
                <li>• メールアドレスが間違っている可能性があります</li>
                <li>• それでも解決しない場合は、サポートまでお問い合わせください</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* サポート情報 */}
        <div className="text-center mt-4 sm:mt-6 text-xs sm:text-sm text-slate-600">
          <p>ご不明な点がございましたら、</p>
          <a href="mailto:support@ugs.example.com" className="text-blue-600 hover:underline font-semibold">
            support@ugs.example.com
          </a>
          <p>までお気軽にお問い合わせください</p>
        </div>
      </div>
    </div>
  )
}

export default function AlreadyRegisteredPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700 mx-auto mb-4"></div>
          <p className="text-slate-600">読み込み中...</p>
        </div>
      </div>
    }>
      <AlreadyRegisteredContent />
    </Suspense>
  )
}

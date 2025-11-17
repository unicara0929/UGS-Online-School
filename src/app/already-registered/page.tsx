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
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    const emailParam = searchParams.get('email')
    const statusParam = searchParams.get('status')

    if (emailParam) {
      setEmail(emailParam)
    }

    if (statusParam === 'pending') {
      setIsPending(true)
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-slate-900">
              📧 既にご登録いただいています
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              {email && (
                <span className="font-semibold text-slate-700">{email}</span>
              )}
              {!email && 'このメールアドレス'}は既に登録済みです
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* ステータス説明 */}
            {isPending ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <div className="flex items-start">
                  <AlertCircle className="h-6 w-6 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-yellow-900 mb-2">
                      決済が未完了です
                    </h3>
                    <p className="text-sm text-yellow-800 mb-3">
                      アカウントの仮登録は完了していますが、決済が完了していません。
                      下記のボタンから決済を完了すると、すぐにサービスをご利用いただけます。
                    </p>
                    <p className="text-xs text-yellow-700">
                      ※ 仮登録から7日経過すると、アカウント情報は削除されます
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start">
                  <AlertCircle className="h-6 w-6 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">
                      既に本登録が完了しています
                    </h3>
                    <p className="text-sm text-blue-800">
                      このメールアドレスは既に登録・決済が完了しています。
                      ログインしてサービスをご利用ください。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* アクションボタン */}
            <div className="space-y-3 pt-4">
              {isPending ? (
                <>
                  <Button
                    onClick={() => router.push('/complete-payment')}
                    className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    決済を完了して本登録する
                  </Button>
                  <Button
                    onClick={() => router.push('/login')}
                    variant="outline"
                    className="w-full h-12"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    ログインする
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => router.push('/login')}
                    className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
                  >
                    <LogIn className="h-5 w-5 mr-2" />
                    ログインする
                  </Button>
                  <Link href="/forgot-password">
                    <Button variant="link" className="w-full text-blue-600">
                      パスワードをお忘れの場合
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* ヘルプ情報 */}
            <div className="bg-slate-50 rounded-lg p-4 mt-6 border border-slate-200">
              <h4 className="font-semibold text-slate-900 mb-2 text-sm">
                💡 ログインできない場合
              </h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• パスワードを忘れた場合は「パスワードをお忘れの場合」からリセットできます</li>
                <li>• メールアドレスが間違っている可能性があります</li>
                <li>• それでも解決しない場合は、サポートまでお問い合わせください</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* サポート情報 */}
        <div className="text-center mt-6 text-sm text-slate-600">
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

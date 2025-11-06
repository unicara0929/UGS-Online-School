'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Mail, Clock, ArrowRight } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'

function PaymentSuccessContent() {
  const [isLoading, setIsLoading] = useState(true)
  const [sessionData, setSessionData] = useState<any>(null)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (sessionId) {
      // セッション情報を取得
      fetch(`/api/get-session?session_id=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            setError(data.error)
          } else {
            setSessionData(data.session)
            
            // 決済完了メールを送信
            if (data.session?.metadata?.userEmail && data.session?.metadata?.userName) {
              fetch('/api/send-payment-success-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  to: data.session.metadata.userEmail, 
                  name: data.session.metadata.userName 
                }),
              }).catch(err => {
                console.error('Failed to send email:', err)
              })

              // 登録完了処理（仮登録ユーザーを正式ユーザーに移行）
              fetch('/api/complete-registration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: data.session.metadata.userEmail,
                  name: data.session.metadata.userName,
                  stripeCustomerId: data.session.customer,
                  stripeSubscriptionId: data.session.subscription,
                  currentPeriodEnd: data.session.current_period_end ? new Date(data.session.current_period_end * 1000).toISOString() : null,
                }),
              })
              .then(regRes => {
                if (!regRes.ok) {
                  console.error('Failed to complete user registration')
                } else {
                  console.log('User registration completed successfully.')
                }
              })
              .catch(regErr => console.error('Error completing user registration:', regErr))
            }
          }
        })
        .catch(err => {
          setError('セッション情報の取得に失敗しました')
          console.error('Error fetching session:', err)
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      setError('セッションIDが見つかりません')
      setIsLoading(false)
    }
  }, [sessionId])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700 mx-auto mb-4"></div>
          <p className="text-slate-600">決済情報を確認中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-600 mb-2">エラー</h2>
              <p className="text-slate-600 mb-4">{error}</p>
              <Link href="/lp">
                <Button>ホームに戻る</Button>
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
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">決済完了！</h1>
          <p className="text-slate-600">UGSオンラインスクールへのご登録が完了しました</p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>決済情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessionData && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-600">お支払い金額</span>
                  <span className="font-semibold">¥5,500</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">サブスクリプションID</span>
                  <span className="font-mono text-sm">{sessionData.subscription?.id || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">決済日時</span>
                  <span>{new Date().toLocaleString('ja-JP')}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="h-5 w-5 mr-2" />
              確認メールについて
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">
              決済完了の確認メールを送信いたしました。メール内のリンクからログインして学習を開始できます。
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>注意:</strong> メールが届かない場合は、迷惑メールフォルダをご確認ください。
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              次のステップ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="w-6 h-6 bg-slate-700 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-medium">確認メールをチェック</p>
                  <p className="text-sm text-slate-600">送信されたメールを確認してください</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-slate-700 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-medium">ログインリンクをクリック</p>
                  <p className="text-sm text-slate-600">メール内のリンクからログインページへ</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-slate-700 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-medium">学習開始</p>
                  <p className="text-sm text-slate-600">ダッシュボードから学習を開始できます</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link href={`/login?email=${encodeURIComponent(sessionData?.metadata?.userEmail || '')}`}>
            <Button size="lg" className="mr-4">
              ログインページへ
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <Link href="/lp">
            <Button variant="outline" size="lg">
              ホームに戻る
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700 mx-auto mb-4"></div>
          <p className="text-slate-600">読み込み中...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}

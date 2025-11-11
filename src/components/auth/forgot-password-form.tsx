'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const [waitTime, setWaitTime] = useState<number | null>(null)
  const router = useRouter()

  // カウントダウンタイマー
  useEffect(() => {
    if (waitTime && waitTime > 0) {
      const timer = setTimeout(() => {
        setWaitTime(waitTime - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (waitTime === 0) {
      setWaitTime(null)
      setError('')
    }
  }, [waitTime])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess(false)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        // レート制限エラーの場合
        if (response.status === 429 && data.code === 'RATE_LIMIT') {
          const waitTime = data.waitTime || 60
          setWaitTime(waitTime)
          throw new Error(data.error || `セキュリティのため、${waitTime}秒後に再度お試しください。`)
        }
        
        throw new Error(data.error || 'パスワードリセットリクエストの送信に失敗しました')
      }

      setSuccess(true)
    } catch (err) {
      console.error('パスワードリセットエラー:', err)
      setError(err instanceof Error ? err.message : 'パスワードリセットリクエストの送信に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="flex items-center justify-center space-x-3">
            {logoError ? (
              <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center">
                <span className="text-white text-xs font-bold">UG</span>
              </div>
            ) : (
              <Image 
                src="/ロゴ1.jpg" 
                alt="Unicara Growth Salon" 
                width={32} 
                height={32} 
                className="object-contain"
                priority
                onError={() => setLogoError(true)}
              />
            )}
            <CardTitle className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Unicara Growth Salon
            </CardTitle>
          </div>
          <CardDescription className="text-sm text-slate-600 pt-2">
            パスワードをリセット
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {success ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">メールを送信しました</p>
                  <p className="text-sm text-green-700 mt-1">
                    {email} にパスワードリセット用のメールを送信しました。
                    メール内のリンクをクリックして、新しいパスワードを設定してください。
                  </p>
                </div>
              </div>
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  ログインページに戻る
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">エラー</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                    {waitTime !== null && waitTime > 0 && (
                      <p className="text-xs text-red-600 mt-2">
                        あと {waitTime} 秒で再度お試しいただけます
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                  メールアドレス
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all shadow-sm hover:shadow-md"
                    placeholder="example@email.com"
                    required
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  登録済みのメールアドレスを入力してください
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl"
                disabled={isLoading || (waitTime !== null && waitTime > 0)}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    送信中...
                  </span>
                ) : waitTime !== null && waitTime > 0 ? (
                  `あと ${waitTime} 秒で送信可能`
                ) : (
                  'パスワードリセットメールを送信'
                )}
              </Button>

              <div className="text-center">
                <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">
                  <ArrowLeft className="h-4 w-4 inline mr-1" />
                  ログインページに戻る
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


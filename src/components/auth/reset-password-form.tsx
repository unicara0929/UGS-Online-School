'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SupabaseAuthService } from '@/lib/auth/supabase-auth-service'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Lock, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // URLパラメータからトークンを確認
    const token = searchParams.get('token')
    if (!token) {
      setError('無効なリセットリンクです')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess(false)

    // パスワードのバリデーション
    if (password.length < 6) {
      setError('パスワードは6文字以上である必要があります')
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      setIsLoading(false)
      return
    }

    try {
      await SupabaseAuthService.updatePassword(password)
      setSuccess(true)
      // 3秒後にログインページにリダイレクト
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err) {
      console.error('パスワード更新エラー:', err)
      setError(err instanceof Error ? err.message : 'パスワードの更新に失敗しました')
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
            新しいパスワードを設定
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {success ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">パスワードを更新しました</p>
                  <p className="text-sm text-green-700 mt-1">
                    パスワードが正常に更新されました。ログインページにリダイレクトします...
                  </p>
                </div>
              </div>
              <Link href="/login">
                <Button className="w-full">
                  ログインページに移動
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
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                  新しいパスワード
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all shadow-sm hover:shadow-md"
                    placeholder="6文字以上"
                    required
                    minLength={6}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  パスワードは6文字以上である必要があります
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700">
                  パスワード（確認）
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all shadow-sm hover:shadow-md"
                    placeholder="パスワードを再入力"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    更新中...
                  </span>
                ) : (
                  'パスワードを更新'
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


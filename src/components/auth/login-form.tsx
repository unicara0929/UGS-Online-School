'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Mail, Lock, AlertCircle, Users, HelpCircle } from 'lucide-react'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [logoError, setLogoError] = useState(false)
  const { login } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // URLパラメータからメールアドレスを取得
  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      await login(email, password)
      // リダイレクトを確実にするため、window.locationを使用
      window.location.href = '/dashboard'
    } catch (err) {
      console.error('ログインエラー:', err)
      setError(err instanceof Error ? err.message : 'ログインに失敗しました')
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
            学び → 実践 → 自立を一体化したFP育成プラットフォーム
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                  パスワード
                </label>
                <Link href="/forgot-password" className="text-xs text-slate-600 hover:text-slate-900">
                  <HelpCircle className="h-3 w-3 inline mr-1" />
                  パスワードを忘れた場合
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all shadow-sm hover:shadow-md"
                  placeholder="パスワードを入力"
                  required
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
                  ログイン中...
                </span>
              ) : (
                'ログイン'
              )}
            </Button>
          </form>

          <div className="pt-6 border-t border-slate-200">
            <div className="flex items-center space-x-2 mb-4">
              <Users className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-700">デモアカウント</h3>
            </div>
            <div className="space-y-2.5">
              <div className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <p className="text-xs font-medium text-slate-700 mb-1">UGS会員</p>
                <p className="text-xs text-slate-600 font-mono">member@example.com / 123</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <p className="text-xs font-medium text-slate-700 mb-1">FPエイド</p>
                <p className="text-xs text-slate-600 font-mono">fp@example.com / 123</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <p className="text-xs font-medium text-slate-700 mb-1">マネージャー</p>
                <p className="text-xs text-slate-600 font-mono">manager@example.com / 123</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <p className="text-xs font-medium text-slate-700 mb-1">運営</p>
                <p className="text-xs text-slate-600 font-mono">admin@example.com / 123</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

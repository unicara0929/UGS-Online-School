'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export function RegisterForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
    agreePrivacy: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [logoError, setLogoError] = useState(false)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const { register } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // URLから紹介コードを取得し、LocalStorageに保存
  useEffect(() => {
    const refParam = searchParams.get('ref')
    if (refParam) {
      // LocalStorageに保存（ページ遷移しても保持）
      localStorage.setItem('referralCode', refParam)
      setReferralCode(refParam)
      console.log('Referral code saved:', refParam)
    } else {
      // URLにrefがない場合、LocalStorageから取得
      const savedRef = localStorage.getItem('referralCode')
      if (savedRef) {
        setReferralCode(savedRef)
        console.log('Referral code loaded from storage:', savedRef)
      }
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // バリデーション
    if (formData.password !== formData.confirmPassword) {
      setError('パスワードが一致しません')
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      setIsLoading(false)
      return
    }

    if (!formData.agreeTerms || !formData.agreePrivacy) {
      setError('利用規約とプライバシーポリシーに同意してください')
      setIsLoading(false)
      return
    }

    try {
      // 仮登録ユーザーを保存（パスワードはサーバーサイドでハッシュ化される）
      const response = await fetch('/api/pending-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          password: formData.password, // プレーンパスワードを送信（サーバーサイドでハッシュ化）
          referralCode: referralCode // 紹介コードを含める
        })
      })

      if (!response.ok) {
        const errorData = await response.json()

        // 重複メールアドレスの場合は専用ページにリダイレクト
        if (errorData.errorCode === 'ALREADY_REGISTERED_PENDING') {
          window.location.href = `/already-registered?email=${encodeURIComponent(formData.email)}&status=pending`
          return
        } else if (errorData.errorCode === 'ALREADY_REGISTERED') {
          window.location.href = `/already-registered?email=${encodeURIComponent(formData.email)}`
          return
        }

        throw new Error(errorData.error || '仮登録に失敗しました')
      }

      // 登録完了後、LocalStorageから紹介コードをクリア
      localStorage.removeItem('referralCode')

      // メール確認待ちページにリダイレクト
      const params = new URLSearchParams({
        email: formData.email,
      })

      window.location.href = `/verify-email-pending?${params.toString()}`
    } catch (err) {
      console.error('登録エラー:', err)
      setError(err instanceof Error ? err.message : '登録に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center space-y-3 sm:space-y-4 pb-6 sm:pb-8 px-4 sm:px-6">
          <div className="flex items-center justify-center space-x-2 sm:space-x-3">
            {logoError ? (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-slate-800 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">UG</span>
              </div>
            ) : (
              <Image
                src="/ロゴ1.jpg"
                alt="Unicara Growth Salon"
                width={32}
                height={32}
                className="object-contain w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0"
                priority
                onError={() => setLogoError(true)}
              />
            )}
            <CardTitle className="text-lg sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Unicara Growth Salon
            </CardTitle>
          </div>
          <CardDescription className="text-xs sm:text-sm text-slate-600 pt-1 sm:pt-2">
            "勉強だけで終わらない"「お金の知識×稼げる力」がコンセプトのビジネスコミュニティ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                お名前
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="田中 太郎"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="6文字以上で入力"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
                パスワード（確認）
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="パスワードを再入力"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <span className="text-sm text-slate-600">
                  <Link href="/terms" className="text-blue-600 hover:underline" target="_blank">
                    利用規約
                  </Link>
                  に同意する
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="agreePrivacy"
                  checked={formData.agreePrivacy}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <span className="text-sm text-slate-600">
                  <Link href="/privacy" className="text-blue-600 hover:underline" target="_blank">
                    プライバシーポリシー
                  </Link>
                  に同意する
                </span>
              </label>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? 'アカウント作成中...' : 'アカウントを作成'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              既にアカウントをお持ちですか？{' '}
              <Link href="/login" className="text-blue-600 hover:underline font-medium">
                ログイン
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

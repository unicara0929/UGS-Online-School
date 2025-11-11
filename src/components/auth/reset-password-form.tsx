'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Lock, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // supabaseは常に有効なクライアントを返すため、nullチェックは不要

    // URLハッシュフラグメントからエラーを確認
    const hash = window.location.hash
    const hashParams = new URLSearchParams(hash.substring(1)) // #を削除
    
    // エラーが含まれている場合
    if (hashParams.has('error')) {
      const errorCode = hashParams.get('error_code')
      const errorDescription = hashParams.get('error_description')
      
      if (errorCode === 'otp_expired') {
        setError('リセットリンクが期限切れです。再度パスワードリセットを申請してください。')
      } else if (errorCode === 'access_denied') {
        setError('アクセスが拒否されました。リセットリンクが無効または期限切れの可能性があります。')
      } else {
        setError(errorDescription || 'リセットリンクの処理中にエラーが発生しました。')
      }
      setIsCheckingSession(false)
      return
    }

    // Supabaseのセッションを確認（リセットリンクから自動的にセッションが確立される）
    const checkSession = async () => {
      try {
        // まず現在のセッションを確認
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (session) {
          // セッションが既に確立されている
          console.log('Session established:', session.user.email)
          setIsCheckingSession(false)
          return
        }

        // URLハッシュフラグメントを確認
        if (hash.includes('access_token') || hash.includes('type=recovery')) {
          // ハッシュフラグメントがある場合、Supabaseが自動的にセッションを確立するのを待つ
          console.log('Hash fragment detected, waiting for session...')
          
          // 認証状態の変更を監視
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
              console.log('Session established via recovery:', session?.user.email)
              setIsCheckingSession(false)
              subscription.unsubscribe()
            }
          })

          // タイムアウトを設定（10秒）
          setTimeout(() => {
            subscription.unsubscribe()
            supabase.auth.getSession().then(({ data: { session }, error }) => {
              if (error || !session) {
                setError('リセットリンクが無効または期限切れです。再度パスワードリセットを申請してください。')
              }
              setIsCheckingSession(false)
            })
          }, 10000)
        } else {
          // ハッシュフラグメントがない場合、エラーを表示
          setError('リセットリンクが無効または期限切れです。再度パスワードリセットを申請してください。')
          setIsCheckingSession(false)
        }
      } catch (err) {
        console.error('Check session error:', err)
        setError('セッションの確認中にエラーが発生しました')
        setIsCheckingSession(false)
      }
    }

    checkSession()
  }, [])

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

    // supabaseは常に有効なクライアントを返すため、nullチェックは不要

    try {
      // セッションを再確認
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        throw new Error('セッションが無効です。リセットリンクが期限切れの可能性があります。再度パスワードリセットを申請してください。')
      }

      // パスワードを更新
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        // エラーメッセージを日本語に変換
        const errorMessage = translateErrorMessage(updateError.message)
        throw new Error(errorMessage)
      }

      setSuccess(true)
      // 3秒後にログインページにリダイレクト
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err) {
      console.error('パスワード更新エラー:', err)
      const errorMessage = err instanceof Error ? err.message : 'パスワードの更新に失敗しました'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // エラーメッセージを日本語に変換する関数
  const translateErrorMessage = (message: string): string => {
    const errorTranslations: Record<string, string> = {
      'New password should be different from the old password.': '新しいパスワードは現在のパスワードと異なる必要があります。',
      'Password should be at least 6 characters': 'パスワードは6文字以上である必要があります',
      'Invalid password': '無効なパスワードです',
      'Password is too weak': 'パスワードが弱すぎます',
      'User not found': 'ユーザーが見つかりません',
      'Session expired': 'セッションが期限切れです',
      'Invalid session': '無効なセッションです',
    }

    // 完全一致をチェック
    if (errorTranslations[message]) {
      return errorTranslations[message]
    }

    // 部分一致をチェック
    for (const [key, value] of Object.entries(errorTranslations)) {
      if (message.includes(key)) {
        return value
      }
    }

    // 翻訳が見つからない場合は元のメッセージを返す
    return message
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
          {isCheckingSession ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start space-x-3">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800">セッションを確認中...</p>
                  <p className="text-sm text-blue-700 mt-1">
                    リセットリンクを確認しています。しばらくお待ちください。
                  </p>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">エラー</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
              <div className="space-y-3">
                <Link href="/forgot-password">
                  <Button className="w-full" variant="outline">
                    パスワードリセットを再申請
                  </Button>
                </Link>
                <Link href="/login">
                  <Button className="w-full" variant="ghost">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    ログインページに戻る
                  </Button>
                </Link>
              </div>
            </div>
          ) : success ? (
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


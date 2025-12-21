'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Lock, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// =====================================
// 定数
// =====================================

/** パスワードの最小文字数 */
const MIN_PASSWORD_LENGTH = 6

/** 成功後のリダイレクト待機時間（ミリ秒） */
const REDIRECT_DELAY_MS = 3000

/** エラーメッセージの翻訳マップ */
const ERROR_TRANSLATIONS: Record<string, string> = {
  'New password should be different from the old password.': '新しいパスワードは現在のパスワードと異なる必要があります。',
  'Password should be at least 6 characters': 'パスワードは6文字以上である必要があります',
  'Invalid password': '無効なパスワードです',
  'Password is too weak': 'パスワードが弱すぎます',
  'User not found': 'ユーザーが見つかりません',
  'Session expired': 'セッションが期限切れです',
  'Invalid session': '無効なセッションです',
}

/** セッションエラーを判定するキーワード */
const SESSION_ERROR_KEYWORDS = ['セッション', '期限切れ', '無効']

// =====================================
// ヘルパー関数
// =====================================

/**
 * エラーメッセージを日本語に翻訳
 * @param message 英語のエラーメッセージ
 * @returns 日本語のエラーメッセージ
 */
function translateErrorMessage(message: string): string {
  // 完全一致をチェック
  if (ERROR_TRANSLATIONS[message]) {
    return ERROR_TRANSLATIONS[message]
  }

  // 部分一致をチェック
  for (const [key, value] of Object.entries(ERROR_TRANSLATIONS)) {
    if (message.includes(key)) {
      return value
    }
  }

  // 翻訳が見つからない場合は元のメッセージを返す
  return message
}

/**
 * エラーメッセージがセッション関連かどうかを判定
 * @param errorMessage エラーメッセージ
 * @returns セッション関連エラーの場合true
 */
function isSessionError(errorMessage: string): boolean {
  return SESSION_ERROR_KEYWORDS.some(keyword => errorMessage.includes(keyword))
}

export function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [sessionError, setSessionError] = useState('') // セッション関連のエラー（リンク期限切れなど）
  const [formError, setFormError] = useState('') // フォーム入力のエラー（パスワード不一致など）
  const [success, setSuccess] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const router = useRouter()
  
  // SupabaseクライアントをuseRefで保持（クライアントサイドでのみ初期化）
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  
  const getSupabase = () => {
    if (typeof window === 'undefined') {
      throw new Error('createClientはクライアントサイドでのみ実行できます')
    }
    
    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    
    return supabaseRef.current
  }

  useEffect(() => {
    // クライアントサイドでのみSupabaseクライアントを初期化
    if (typeof window === 'undefined') {
      return
    }

    const supabase = getSupabase()

    // URLハッシュフラグメントからエラーを確認
    const hash = window.location.hash
    const hashParams = new URLSearchParams(hash.substring(1)) // #を削除

    // エラーが含まれている場合
    if (hashParams.has('error')) {
      const errorCode = hashParams.get('error_code')
      const errorDescription = hashParams.get('error_description')

      if (errorCode === 'otp_expired') {
        setSessionError('リセットリンクが期限切れです。再度パスワードリセットを申請してください。')
      } else if (errorCode === 'access_denied') {
        setSessionError('アクセスが拒否されました。リセットリンクが無効または期限切れの可能性があります。')
      } else {
        setSessionError(errorDescription || 'リセットリンクの処理中にエラーが発生しました。')
      }
      setIsCheckingSession(false)
      return
    }

    // Supabaseのセッションを確認（リセットリンクから自動的にセッションが確立される）
    const checkSession = async () => {
      try {
        console.log('Checking session with hash:', hash)

        // URLハッシュフラグメントにaccess_tokenが含まれている場合、手動でセッションを確立
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const tokenType = hashParams.get('type')

        if (accessToken && refreshToken && tokenType === 'recovery') {
          console.log('Manual session setup with tokens from hash fragment...')

          // 手動でセッションを設定
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            console.error('Failed to set session:', error)
            setSessionError('セッションの確立に失敗しました。リンクが無効または期限切れの可能性があります。')
            setIsCheckingSession(false)
            return
          }

          if (data.session) {
            console.log('✓ Session manually established:', data.session.user.email)
            setIsCheckingSession(false)

            // URLからハッシュフラグメントを削除（クリーンなURLにする）
            window.history.replaceState({}, document.title, window.location.pathname)
            return
          }
        }

        // 既存のセッションを確認
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (session) {
          console.log('✓ Session already established:', session.user.email)
          setIsCheckingSession(false)
          return
        }

        // ハッシュフラグメントもセッションもない場合
        console.warn('No valid hash fragment or session found')
        setSessionError('リセットリンクが無効または期限切れです。再度パスワードリセットを申請してください。')
        setIsCheckingSession(false)
      } catch (err) {
        console.error('Check session error:', err)
        setSessionError('セッションの確認中にエラーが発生しました')
        setIsCheckingSession(false)
      }
    }

    checkSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setFormError('')
    setSessionError('')
    setSuccess(false)

    // パスワードのバリデーション
    if (password.length < MIN_PASSWORD_LENGTH) {
      setFormError(`パスワードは${MIN_PASSWORD_LENGTH}文字以上である必要があります`)
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setFormError('パスワードが一致しません')
      setIsLoading(false)
      return
    }

    try {
      const supabase = getSupabase()

      // セッションを再確認
      const { data: { session }, error: checkSessionError } = await supabase.auth.getSession()

      if (checkSessionError || !session) {
        setSessionError('セッションが無効です。リセットリンクが期限切れの可能性があります。再度パスワードリセットを申請してください。')
        setIsLoading(false)
        return
      }

      // パスワードを更新
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        // エラーメッセージを日本語に変換
        const errorMessage = translateErrorMessage(updateError.message)

        // セッション関連のエラーかどうかを判定
        if (isSessionError(errorMessage)) {
          setSessionError(errorMessage)
        } else {
          // 入力関連のエラー（パスワードが前回と同じなど）
          setFormError(errorMessage)
        }
        setIsLoading(false)
        return
      }

      setSuccess(true)
      // リダイレクト待機時間後にログインページへ遷移
      setTimeout(() => {
        router.push('/login')
      }, REDIRECT_DELAY_MS)
    } catch (err) {
      console.error('パスワード更新エラー:', err)
      const errorMessage = err instanceof Error ? err.message : 'パスワードの更新に失敗しました'

      // セッション関連のエラーかどうかを判定
      if (isSessionError(errorMessage)) {
        setSessionError(errorMessage)
      } else {
        setFormError(errorMessage)
      }
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
                alt="UGS" 
                width={32} 
                height={32} 
                className="object-contain"
                priority
                onError={() => setLogoError(true)}
              />
            )}
            <CardTitle className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              UGS
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
          ) : sessionError ? (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">セッションエラー</p>
                  <p className="text-sm text-red-700 mt-1">{sessionError}</p>
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
              {formError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">入力エラー</p>
                    <p className="text-sm text-red-700 mt-1">{formError}</p>
                    <p className="text-sm text-red-600 mt-2">
                      修正して再度送信してください。
                    </p>
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
                    placeholder={`${MIN_PASSWORD_LENGTH}文字以上`}
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  パスワードは{MIN_PASSWORD_LENGTH}文字以上である必要があります
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
                    minLength={MIN_PASSWORD_LENGTH}
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


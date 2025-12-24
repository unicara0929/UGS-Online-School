'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { authenticatedFetch } from '@/lib/utils/api-client'
import { Play, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

// Vimeo Player APIの型定義
declare global {
  interface Window {
    Vimeo?: {
      Player: new (element: HTMLIFrameElement) => {
        on: (event: string, callback: (data: any) => void) => void
        off: (event: string) => void
        getDuration: () => Promise<number>
        getCurrentTime: () => Promise<number>
      }
    }
  }
}

// Vimeo動画ID（環境変数から取得、デフォルトはテスト用動画）
// Vimeoの動画URL（例: https://vimeo.com/123456789）または動画ID（例: 123456789）を設定
const FP_ONBOARDING_VIMEO_ID = process.env.NEXT_PUBLIC_FP_ONBOARDING_VIMEO_ID || '1135031850'
const COMPLETION_THRESHOLD = 0.9 // 90%以上視聴で完了

// VimeoのURLから動画IDを抽出する関数
function extractVimeoId(urlOrId: string): string | null {
  if (!urlOrId) return null
  
  // 既に数字のみの場合はそのまま返す
  if (/^\d+$/.test(urlOrId)) {
    return urlOrId
  }
  
  // URLから動画IDを抽出
  const match = urlOrId.match(/vimeo\.com\/(\d+)/)
  return match ? match[1] : null
}

export default function FPOnboardingPage() {
  const { user } = useAuth()
  const router = useRouter()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [watchProgress, setWatchProgress] = useState(0)
  const [isCompleting, setIsCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasCompleted, setHasCompleted] = useState(false)
  const [showCompletionBanner, setShowCompletionBanner] = useState(false)
  const [vimeoPlayer, setVimeoPlayer] = useState<any>(null)
  const vimeoId = extractVimeoId(FP_ONBOARDING_VIMEO_ID)

  // 完了処理（useCallbackでメモ化してクロージャの問題を解決）
  const handleComplete = useCallback(async () => {
    if (isCompleting || hasCompleted) return

    setIsCompleting(true)
    setError(null)

    try {
      const response = await authenticatedFetch('/api/user/fp-onboarding/complete', {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '完了処理に失敗しました')
      }

      setHasCompleted(true)
      setShowCompletionBanner(true)
      console.log('FP onboarding completed successfully')
    } catch (err) {
      console.error('Error completing onboarding:', err)
      setError(err instanceof Error ? err.message : '完了処理に失敗しました')
      setIsCompleting(false)
    }
  }, [isCompleting, hasCompleted])

  // ダッシュボードに移動
  const handleGoToDashboard = useCallback(() => {
    router.push('/dashboard')
  }, [router])

  // FP昇格申請が承認されていない場合のみダッシュボードにリダイレクト
  // （承認済みMEMBERはオンボーディングが必要）
  // リダイレクトチェックはステータス確認後に行う

  // 既に完了しているか確認
  useEffect(() => {
    checkCompletionStatus()
  }, [user])

  // Vimeo Player APIスクリプトを読み込む（1回のみ）
  useEffect(() => {
    if (!vimeoId) return

    // 既にスクリプトが読み込まれているかチェック
    const existingScript = document.querySelector('script[src="https://player.vimeo.com/api/player.js"]')

    if (!existingScript) {
      console.log('Loading Vimeo Player API script...')
      const script = document.createElement('script')
      script.src = 'https://player.vimeo.com/api/player.js'
      script.async = true
      document.body.appendChild(script)

      script.onload = () => {
        console.log('Vimeo Player API script loaded successfully')
        // スクリプト読み込み完了後、iframeが既にある場合はPlayerを初期化
        if (iframeRef.current && !hasCompleted) {
          handleIframeLoad()
        }
      }

      script.onerror = () => {
        console.error('Failed to load Vimeo Player API script')
        // CSPエラーの場合は動画自体は視聴可能なのでエラー表示しない
        // setError('動画プレイヤーの読み込みに失敗しました')
        console.warn('Vimeo Player API failed to load - video playback still works via iframe')
      }
    }
  }, [vimeoId])

  // iframeがロードされたときにVimeo Playerを初期化
  const handleIframeLoad = useCallback(() => {
    if (!iframeRef.current) {
      console.log('Skipping Player initialization - iframe not ready')
      return
    }

    if (hasCompleted) {
      console.log('Already completed - skipping Player initialization')
      return
    }

    // @ts-ignore - Vimeo Player APIはグローバルに読み込まれる
    if (!window.Vimeo) {
      console.warn('Vimeo Player API not loaded yet - video playback still works via iframe')
      // APIが読み込まれていなくても動画は視聴可能なのでエラーは表示しない
      return
    }

    // 既にプレイヤーが初期化されている場合はスキップ
    if (vimeoPlayer) {
      console.log('Player already initialized')
      return
    }

    try {
      console.log('Initializing Vimeo Player...')
      // @ts-ignore
      const player = new window.Vimeo.Player(iframeRef.current)
      setVimeoPlayer(player)

      // 動画の時間更新を監視
      player.on('timeupdate', (data: { seconds: number; duration: number }) => {
        if (data.duration > 0) {
          const progress = data.seconds / data.duration
          setWatchProgress(progress)

          // 90%以上視聴したら自動的に完了処理を実行
          if (progress >= COMPLETION_THRESHOLD) {
            console.log('90% threshold reached, triggering completion...')
            handleComplete()
          }
        }
      })

      // 動画終了時も完了処理を実行
      player.on('ended', () => {
        console.log('Video ended, triggering completion...')
        handleComplete()
      })

      console.log('✓ Vimeo Player initialized successfully')
    } catch (err) {
      console.error('Error initializing Vimeo Player:', err)
      // 初期化に失敗しても動画自体は視聴可能なのでエラーは表示しない
      console.warn('Player initialization failed - video playback still works via iframe')
    }
  }, [hasCompleted, handleComplete, vimeoPlayer])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (vimeoPlayer) {
        try {
          vimeoPlayer.off('timeupdate')
          vimeoPlayer.off('ended')
        } catch (err) {
          console.error('Error cleaning up Vimeo Player:', err)
        }
      }
    }
  }, [vimeoPlayer])

  const checkCompletionStatus = async () => {
    if (!user?.id) return

    try {
      const response = await authenticatedFetch(`/api/user/fp-onboarding-status`)
      if (response.ok) {
        const data = await response.json()

        // オンボーディングが不要（承認されていないMEMBERなど）の場合はリダイレクト
        if (data.needsOnboarding === false) {
          router.push('/dashboard')
          return
        }

        if (data.fpOnboardingCompleted) {
          setHasCompleted(true)
          setShowCompletionBanner(true)
          // 既に完了している場合は完了バナーを表示（自動リダイレクトはしない）
        }
      }
    } catch (err) {
      console.error('Error checking completion status:', err)
    } finally {
      setIsLoading(false)
    }
  }


  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-600 mx-auto mb-4" />
            <p className="text-slate-600">読み込み中...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }


  return (
    <DashboardLayout>
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Play className="h-6 w-6" />
              FPエイド向け動画ガイダンス
            </CardTitle>
            <CardDescription>
              FPエイドとしての活動を開始する前に、必ずこの動画ガイダンスを視聴してください。
              動画の90%以上を視聴すると完了となります。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">エラーが発生しました</p>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            )}

            {!vimeoId ? (
              <div className="relative bg-slate-100 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                <div className="text-center p-8">
                  <p className="text-slate-600 mb-2">Vimeo動画IDが設定されていません</p>
                  <p className="text-sm text-slate-500 mb-4">
                    環境変数 <code className="bg-slate-200 px-2 py-1 rounded">NEXT_PUBLIC_FP_ONBOARDING_VIMEO_ID</code> を設定してください
                  </p>
                  <p className="text-xs text-slate-400">
                    Vimeoの動画URL（例: https://vimeo.com/123456789）または動画ID（例: 123456789）を設定してください
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <iframe
                  ref={iframeRef}
                  src={`https://player.vimeo.com/video/${vimeoId}?api=1&quality=720p`}
                  className="w-full h-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  title="FPエイド向け動画ガイダンス"
                  onLoad={handleIframeLoad}
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">視聴進捗</span>
                <span className="font-medium text-slate-900">
                  {Math.round(watchProgress * 100)}%
                </span>
              </div>
              <Progress value={watchProgress * 100} className="h-2" />
              <p className="text-xs text-slate-500">
                {hasCompleted
                  ? '完了しました！ダッシュボードに移動するか、動画を続けてご覧いただけます。'
                  : watchProgress >= COMPLETION_THRESHOLD
                  ? '視聴完了条件を満たしています。完了処理を実行中...'
                  : `あと${Math.round((COMPLETION_THRESHOLD - watchProgress) * 100)}%視聴すると完了します。`}
              </p>
            </div>

            {/* 完了バナー */}
            {showCompletionBanner && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-green-900 mb-2">
                      🎉 FPエイドガイダンスを完了しました！
                    </h3>
                    <p className="text-sm text-green-800 mb-4">
                      おめでとうございます！FPエイドとしての活動を開始できます。<br />
                      ダッシュボードに移動して、紹介管理や契約管理などの機能をご利用いただけます。
                    </p>
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handleGoToDashboard}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        ダッシュボードに移動
                      </Button>
                      <p className="text-xs text-green-700">
                        動画を最後まで見たい場合は、このまま視聴を続けられます
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isCompleting && (
              <div className="flex items-center justify-center gap-2 text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>完了処理を実行中...</span>
              </div>
            )}

            <div className="pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                <strong>注意:</strong> この動画ガイダンスを完了するまで、FPエイドとしての主要な機能（紹介管理、契約管理、報酬管理など）を利用できません。
              </p>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}


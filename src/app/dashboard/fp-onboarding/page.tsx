'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { authenticatedFetch } from '@/lib/utils/api-client'
import { Play, CheckCircle, Loader2, AlertCircle } from 'lucide-react'

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
  const [vimeoPlayer, setVimeoPlayer] = useState<any>(null)
  const vimeoId = extractVimeoId(FP_ONBOARDING_VIMEO_ID)

  useEffect(() => {
    // FPエイドでない場合はダッシュボードにリダイレクト
    if (user && user.role !== 'fp') {
      router.push('/dashboard')
    }
  }, [user, router])

  useEffect(() => {
    // 既に完了しているか確認
    checkCompletionStatus()
  }, [user])

  useEffect(() => {
    // Vimeo Player APIを読み込んで視聴時間を追跡
    if (!vimeoId || hasCompleted) return

    const loadVimeoPlayer = async () => {
      try {
        // Vimeo Player APIを動的に読み込む
        const script = document.createElement('script')
        script.src = 'https://player.vimeo.com/api/player.js'
        script.async = true
        document.body.appendChild(script)

        script.onload = () => {
          // @ts-ignore - Vimeo Player APIはグローバルに読み込まれる
          if (window.Vimeo && iframeRef.current) {
            const player = new window.Vimeo.Player(iframeRef.current)
            setVimeoPlayer(player)

            // 動画の時間更新を監視
            player.on('timeupdate', (data: { seconds: number; duration: number }) => {
              if (data.duration > 0) {
                const progress = data.seconds / data.duration
                setWatchProgress(progress)

                // 90%以上視聴したら自動的に完了処理を実行
                if (progress >= COMPLETION_THRESHOLD && !hasCompleted && !isCompleting) {
                  handleComplete()
                }
              }
            })

            // 動画終了時も完了処理を実行
            player.on('ended', () => {
              if (!hasCompleted && !isCompleting) {
                handleComplete()
              }
            })
          }
        }
      } catch (err) {
        console.error('Error loading Vimeo Player API:', err)
      }
    }

    loadVimeoPlayer()

    return () => {
      // クリーンアップ
      if (vimeoPlayer) {
        vimeoPlayer.off('timeupdate')
        vimeoPlayer.off('ended')
      }
    }
  }, [vimeoId, hasCompleted, isCompleting])

  const checkCompletionStatus = async () => {
    if (!user?.id) return

    try {
      const response = await authenticatedFetch(`/api/user/fp-onboarding-status`)
      if (response.ok) {
        const data = await response.json()
        if (data.completed) {
          setHasCompleted(true)
          // 既に完了している場合はダッシュボードにリダイレクト
          setTimeout(() => {
            router.push('/dashboard')
          }, 2000)
        }
      }
    } catch (err) {
      console.error('Error checking completion status:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = async () => {
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
      
      // 2秒後にダッシュボードにリダイレクト
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err) {
      console.error('Error completing onboarding:', err)
      setError(err instanceof Error ? err.message : '完了処理に失敗しました')
      setIsCompleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-600 mx-auto mb-4" />
          <p className="text-slate-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (hasCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">動画ガイダンスを完了しました</h2>
              <p className="text-slate-600 mb-4">ダッシュボードに移動します...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
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
                  src={`https://player.vimeo.com/video/${vimeoId}?api=1`}
                  className="w-full h-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  title="FPエイド向け動画ガイダンス"
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
                {watchProgress >= COMPLETION_THRESHOLD
                  ? '視聴完了条件を満たしています。完了処理を実行中...'
                  : `あと${Math.round((COMPLETION_THRESHOLD - watchProgress) * 100)}%視聴すると完了します。`}
              </p>
            </div>

            {watchProgress >= COMPLETION_THRESHOLD && !hasCompleted && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="text-sm font-medium text-green-800">
                    視聴完了条件を満たしました
                  </p>
                </div>
                <p className="text-sm text-green-700">
                  動画ガイダンスの視聴が完了しました。完了処理を実行中です...
                </p>
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
  )
}


'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, CheckCircle2, Video, FileText, ExternalLink } from 'lucide-react'
import { authenticatedFetch } from '@/lib/utils/api-client'
import Player from '@vimeo/player'

interface VideoSurveyAttendanceProps {
  eventId: string
  eventTitle: string
  vimeoUrl: string | null
  surveyUrl: string | null
  videoWatched: boolean
  surveyCompleted: boolean
  onSuccess?: () => void
}

export function VideoSurveyAttendance({
  eventId,
  eventTitle,
  vimeoUrl,
  surveyUrl,
  videoWatched: initialVideoWatched,
  surveyCompleted: initialSurveyCompleted,
  onSuccess,
}: VideoSurveyAttendanceProps) {
  const [videoWatched, setVideoWatched] = useState(initialVideoWatched)
  const [surveyCompleted, setSurveyCompleted] = useState(initialSurveyCompleted)
  const [isMarkingVideo, setIsMarkingVideo] = useState(false)
  const [isMarkingSurvey, setIsMarkingSurvey] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showVideo, setShowVideo] = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)
  const [surveyOpened, setSurveyOpened] = useState(false)
  const [savedProgress, setSavedProgress] = useState<number>(0)
  const [isLoadingProgress, setIsLoadingProgress] = useState(false)

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const playerRef = useRef<Player | null>(null)
  const currentTimeRef = useRef<number>(0)
  const lastSavedTimeRef = useRef<number>(0)
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Vimeo動画IDを抽出
  const getVimeoVideoId = (url: string): string | null => {
    const match = url.match(/vimeo\.com\/(\d+)/)
    return match ? match[1] : null
  }

  // Vimeo埋め込みURLを生成
  const getVimeoEmbedUrl = (url: string) => {
    const videoId = getVimeoVideoId(url)
    if (videoId) {
      return `https://player.vimeo.com/video/${videoId}`
    }
    return url
  }

  // 視聴位置をサーバーに保存
  const saveVideoProgress = useCallback(async (progress: number) => {
    // 前回保存から10秒以上経過していない場合はスキップ
    if (Math.abs(progress - lastSavedTimeRef.current) < 10) return

    try {
      await authenticatedFetch('/api/events/video-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ eventId, progress }),
      })
      lastSavedTimeRef.current = progress
    } catch (error) {
      console.error('Failed to save video progress:', error)
    }
  }, [eventId])

  // 保存された視聴位置を取得
  useEffect(() => {
    if (!videoWatched && vimeoUrl) {
      setIsLoadingProgress(true)
      authenticatedFetch(`/api/events/video-progress?eventId=${eventId}`, {
        credentials: 'include',
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.videoProgress > 0) {
            setSavedProgress(data.videoProgress)
          }
        })
        .catch(error => console.error('Failed to load video progress:', error))
        .finally(() => setIsLoadingProgress(false))
    }
  }, [eventId, videoWatched, vimeoUrl])

  // Vimeo Playerの初期化
  useEffect(() => {
    if (showVideo && iframeRef.current && vimeoUrl && !videoWatched) {
      const player = new Player(iframeRef.current)
      playerRef.current = player

      // プレイヤー準備完了時に保存位置にシーク
      player.ready().then(async () => {
        if (savedProgress > 0) {
          try {
            await player.setCurrentTime(savedProgress)
            setMessage({ type: 'success', text: `前回の続き（${Math.floor(savedProgress / 60)}分${Math.floor(savedProgress % 60)}秒）から再生します` })
            setTimeout(() => setMessage(null), 3000)
          } catch (error) {
            console.error('Failed to seek to saved position:', error)
          }
        }
      })

      // 再生終了イベント（100%視聴完了）
      player.on('ended', () => {
        setVideoProgress(100)
        handleMarkVideoWatched()
      })

      // 進捗更新イベント
      player.on('timeupdate', (data) => {
        const progress = Math.floor((data.seconds / data.duration) * 100)
        setVideoProgress(progress)
        currentTimeRef.current = data.seconds
      })

      // 定期的に視聴位置を保存（10秒ごと）
      saveIntervalRef.current = setInterval(() => {
        if (currentTimeRef.current > 0) {
          saveVideoProgress(currentTimeRef.current)
        }
      }, 10000)

      // ページ離脱時に視聴位置を保存
      const handleBeforeUnload = () => {
        if (currentTimeRef.current > 0) {
          // sendBeaconで確実に送信
          const data = JSON.stringify({ eventId, progress: currentTimeRef.current })
          navigator.sendBeacon('/api/events/video-progress', data)
        }
      }
      window.addEventListener('beforeunload', handleBeforeUnload)

      return () => {
        player.off('ended')
        player.off('timeupdate')
        window.removeEventListener('beforeunload', handleBeforeUnload)
        if (saveIntervalRef.current) {
          clearInterval(saveIntervalRef.current)
        }
        // コンポーネントアンマウント時にも保存
        if (currentTimeRef.current > 0) {
          saveVideoProgress(currentTimeRef.current)
        }
      }
    }
  }, [showVideo, vimeoUrl, videoWatched, savedProgress, saveVideoProgress])

  const handleMarkVideoWatched = async () => {
    if (isMarkingVideo) return

    setIsMarkingVideo(true)
    setMessage(null)

    try {
      const response = await authenticatedFetch('/api/events/mark-video-watched', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ eventId }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '録画視聴の記録に失敗しました')
      }

      setVideoWatched(true)
      setMessage({ type: 'success', text: '動画視聴が完了しました！アンケートに回答してください。' })

      // 動画視聴完了時は常にページをリロードして内部アンケートを表示
      if (onSuccess) {
        setTimeout(() => {
          onSuccess()
        }, 1500)
      }
    } catch (error) {
      console.error('Failed to mark video watched:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '録画視聴の記録に失敗しました',
      })
    } finally {
      setIsMarkingVideo(false)
    }
  }

  const handleMarkSurveyCompleted = async () => {
    setIsMarkingSurvey(true)
    setMessage(null)

    try {
      const response = await authenticatedFetch('/api/events/mark-survey-completed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ eventId }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'アンケート回答の記録に失敗しました')
      }

      setSurveyCompleted(true)
      setMessage({ type: 'success', text: data.message })

      if (data.attendanceCompleted && onSuccess) {
        setTimeout(() => {
          onSuccess()
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to mark survey completed:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'アンケート回答の記録に失敗しました',
      })
    } finally {
      setIsMarkingSurvey(false)
    }
  }

  const handleOpenSurvey = () => {
    if (surveyUrl) {
      window.open(surveyUrl, '_blank')
      setSurveyOpened(true)
    }
  }

  const bothCompleted = videoWatched && surveyCompleted

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-purple-900">録画視聴+アンケートで出席確認</h3>
          </div>

          <p className="text-sm text-purple-800">
            イベントに参加できなかった方は、録画を視聴してアンケートに回答することで出席扱いになります
          </p>

          {/* 進捗状況 */}
          <div className="space-y-2">
            <div className={`flex items-center gap-2 p-3 rounded-md ${videoWatched ? 'bg-green-100' : 'bg-white'}`}>
              <CheckCircle2 className={`h-5 w-5 ${videoWatched ? 'text-green-600' : 'text-slate-300'}`} />
              <span className={`text-sm font-medium ${videoWatched ? 'text-green-800' : 'text-slate-600'}`}>
                録画視聴 {videoWatched ? '✓' : showVideo && videoProgress > 0 ? `(${videoProgress}%)` : ''}
              </span>
            </div>

            <div className={`flex items-center gap-2 p-3 rounded-md ${surveyCompleted ? 'bg-green-100' : 'bg-white'}`}>
              <CheckCircle2 className={`h-5 w-5 ${surveyCompleted ? 'text-green-600' : 'text-slate-300'}`} />
              <span className={`text-sm font-medium ${surveyCompleted ? 'text-green-800' : 'text-slate-600'}`}>
                アンケート回答 {surveyCompleted && '✓'}
              </span>
            </div>
          </div>

          {/* Vimeo動画セクション */}
          {vimeoUrl && !videoWatched && (
            <div className="space-y-3">
              {!showVideo ? (
                <div className="space-y-2">
                  <Button variant="outline" className="w-full" onClick={() => setShowVideo(true)} disabled={isLoadingProgress}>
                    {isLoadingProgress ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        読み込み中...
                      </>
                    ) : savedProgress > 0 ? (
                      <>
                        <Video className="h-4 w-4 mr-2" />
                        続きから視聴する（{Math.floor(savedProgress / 60)}分{Math.floor(savedProgress % 60)}秒〜）
                      </>
                    ) : (
                      <>
                        <Video className="h-4 w-4 mr-2" />
                        録画を視聴する
                      </>
                    )}
                  </Button>
                  {savedProgress > 0 && (
                    <p className="text-xs text-purple-600 text-center">
                      前回の視聴位置から再開できます
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <iframe
                      ref={iframeRef}
                      src={getVimeoEmbedUrl(vimeoUrl)}
                      className="w-full h-full"
                      frameBorder="0"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>

                  {/* 進捗バー */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>視聴進捗</span>
                      <span>{videoProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-[width] duration-300"
                        style={{ width: `${videoProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      動画を最後まで視聴すると自動的に記録されます
                    </p>
                  </div>

                  {isMarkingVideo && (
                    <div className="flex items-center justify-center gap-2 text-purple-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">視聴完了を記録中...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 動画視聴完了後の表示 */}
          {videoWatched && !surveyCompleted && (
            <div className="bg-green-100 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                動画視聴が完了しました。次にアンケートに回答してください。
              </p>
            </div>
          )}

          {/* アンケートセクション - 動画視聴完了後のみ表示 */}
          {surveyUrl && videoWatched && !surveyCompleted && (
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleOpenSurvey}
              >
                <FileText className="h-4 w-4 mr-2" />
                <ExternalLink className="h-3 w-3 mr-1" />
                アンケートに回答する（別タブで開く）
              </Button>

              {surveyOpened && (
                <Button
                  onClick={handleMarkSurveyCompleted}
                  disabled={isMarkingSurvey}
                  className="w-full"
                  variant="default"
                >
                  {isMarkingSurvey ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      記録中...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      アンケート回答完了を記録
                    </>
                  )}
                </Button>
              )}

              {!surveyOpened && (
                <p className="text-xs text-slate-500 text-center">
                  アンケートを開いてから回答完了ボタンが表示されます
                </p>
              )}
            </div>
          )}

          {/* 動画未視聴の場合のアンケート案内 */}
          {surveyUrl && !videoWatched && !surveyCompleted && (
            <div className="bg-slate-100 border border-slate-200 rounded-lg p-3">
              <p className="text-sm text-slate-600 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                アンケートは動画を最後まで視聴してから回答できます
              </p>
            </div>
          )}

          {/* メッセージ表示 */}
          {message && (
            <div
              className={`text-sm p-3 rounded-md ${
                message.type === 'success'
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* 両方完了時のメッセージ */}
          {bothCompleted && (
            <div className="bg-green-100 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="h-5 w-5" />
                <div>
                  <p className="font-semibold">動画視聴+アンケート完了</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

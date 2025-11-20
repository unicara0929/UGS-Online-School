'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, CheckCircle2, Video, FileText, ExternalLink } from 'lucide-react'
import { authenticatedFetch } from '@/lib/utils/api-client'

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

  // Vimeo埋め込みURLを生成
  const getVimeoEmbedUrl = (url: string) => {
    // Vimeo URLから動画IDを抽出
    const match = url.match(/vimeo\.com\/(\d+)/)
    if (match && match[1]) {
      return `https://player.vimeo.com/video/${match[1]}`
    }
    return url
  }

  const handleMarkVideoWatched = async () => {
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
      setMessage({ type: 'success', text: data.message })

      if (data.attendanceCompleted && onSuccess) {
        setTimeout(() => {
          onSuccess()
        }, 2000)
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
                録画視聴 {videoWatched && '✓'}
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
                <Button variant="outline" className="w-full" onClick={() => setShowVideo(true)}>
                  <Video className="h-4 w-4 mr-2" />
                  録画を視聴する
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <iframe
                      src={getVimeoEmbedUrl(vimeoUrl)}
                      className="w-full h-full"
                      frameBorder="0"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                  <Button
                    onClick={handleMarkVideoWatched}
                    disabled={isMarkingVideo}
                    className="w-full"
                    variant="default"
                  >
                    {isMarkingVideo ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        記録中...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        視聴完了を記録
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* アンケートセクション */}
          {surveyUrl && !surveyCompleted && (
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(surveyUrl, '_blank')}
              >
                <FileText className="h-4 w-4 mr-2" />
                <ExternalLink className="h-3 w-3 mr-1" />
                アンケートに回答する
              </Button>
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
                  <p className="font-semibold">出席完了！</p>
                  <p className="text-sm">録画視聴とアンケート回答が確認されました</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

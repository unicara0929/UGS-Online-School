'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Star, MessageSquare, Loader2, CheckCircle } from 'lucide-react'

interface LessonRatingProps {
  lessonId: string
  isCompleted: boolean
}

export function LessonRating({ lessonId, isCompleted }: LessonRatingProps) {
  const [rating, setRating] = useState<number | null>(null)
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [showComment, setShowComment] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [savedComment, setSavedComment] = useState('')
  const [showSavedMessage, setShowSavedMessage] = useState(false)

  // 既存の評価を取得
  useEffect(() => {
    if (!isCompleted) return

    const fetchRating = async () => {
      try {
        const res = await fetch(`/api/lessons/${lessonId}/rating`, {
          credentials: 'include',
        })
        const data = await res.json()
        if (data.success && data.rating) {
          setRating(data.rating.rating)
          setComment(data.rating.comment || '')
          setSavedComment(data.rating.comment || '')
          if (data.rating.comment) {
            setShowComment(true)
          }
        }
      } catch (err) {
        console.error('Failed to fetch rating:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRating()
  }, [lessonId, isCompleted])

  // 評価を保存
  const saveRating = useCallback(async (newRating: number, newComment?: string) => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/lessons/${lessonId}/rating`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: newRating,
          comment: newComment ?? comment,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSavedComment(newComment ?? comment)
        setShowSavedMessage(true)
        setTimeout(() => setShowSavedMessage(false), 2000)
      }
    } catch (err) {
      console.error('Failed to save rating:', err)
    } finally {
      setIsSaving(false)
    }
  }, [lessonId, comment])

  // 星クリック
  const handleStarClick = (value: number) => {
    setRating(value)
    saveRating(value)
  }

  // コメント保存
  const handleCommentSave = () => {
    if (rating) {
      saveRating(rating, comment)
    }
  }

  if (!isCompleted) return null
  if (isLoading) return null

  const displayRating = hoveredRating ?? rating

  return (
    <Card>
      <CardContent className="p-3 sm:p-6">
        <div className="text-center space-y-3">
          <p className="text-xs sm:text-sm font-medium text-slate-700">
            この動画はいかがでしたか？
          </p>

          {/* 星評価 */}
          <div className="flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map((value) => {
              const isSelected = displayRating !== null && value <= displayRating
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleStarClick(value)}
                  onMouseEnter={() => setHoveredRating(value)}
                  onMouseLeave={() => setHoveredRating(null)}
                  disabled={isSaving}
                  className={`p-0.5 sm:p-1 transition-colors ${
                    isSelected
                      ? 'text-yellow-500'
                      : 'text-slate-300 hover:text-yellow-400'
                  }`}
                >
                  <Star
                    className={`h-6 w-6 sm:h-8 sm:w-8 ${
                      isSelected ? 'fill-yellow-400' : 'fill-none'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              )
            })}
            <span className="ml-2 text-xs sm:text-sm text-slate-500">
              {rating ? `${rating} / 5` : '選択してください'}
            </span>
            {isSaving && (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400 ml-1" />
            )}
            {showSavedMessage && !isSaving && (
              <span className="ml-1 text-xs text-green-600 flex items-center gap-0.5">
                <CheckCircle className="h-3.5 w-3.5" />
                保存しました
              </span>
            )}
          </div>

          {/* コメント入力 */}
          {rating && !showComment && (
            <button
              type="button"
              onClick={() => setShowComment(true)}
              className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1 mx-auto"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              コメントを追加（任意）
            </button>
          )}

          {showComment && (
            <div className="space-y-2 max-w-md mx-auto">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="この動画の感想やフィードバックを入力..."
                className="text-xs sm:text-sm resize-none"
                rows={3}
              />
              {comment !== savedComment ? (
                <Button
                  size="sm"
                  onClick={handleCommentSave}
                  disabled={isSaving || !rating}
                  className="text-xs sm:text-sm"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : null}
                  コメントを保存
                </Button>
              ) : savedComment && (
                <p className="text-xs text-green-600 flex items-center justify-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  コメントが保存されています
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

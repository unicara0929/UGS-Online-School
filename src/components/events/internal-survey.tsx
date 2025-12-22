'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, FileText, Star } from 'lucide-react'
import { authenticatedFetch } from '@/lib/utils/api-client'

interface Question {
  id: string
  order: number
  question: string
  description?: string | null
  type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'MULTI_SELECT' | 'RADIO' | 'RATING'
  options?: string[] | null
  required: boolean
}

interface Survey {
  id: string
  title: string
  description?: string | null
  questions: Question[]
}

interface ExistingResponse {
  id: string
  submittedAt: string
  answers: Array<{
    questionId: string
    value: unknown
  }>
}

interface InternalSurveyProps {
  eventId: string
  videoWatched: boolean
  onSurveyComplete?: () => void
}

export function InternalSurvey({
  eventId,
  videoWatched,
  onSurveyComplete
}: InternalSurveyProps) {
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [existingResponse, setExistingResponse] = useState<ExistingResponse | null>(null)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchSurvey()
  }, [eventId])

  const fetchSurvey = async () => {
    try {
      setIsLoading(true)
      const response = await authenticatedFetch(`/api/events/${eventId}/survey`, {
        credentials: 'include'
      })
      const data = await response.json()

      if (response.ok && data.success) {
        setSurvey(data.survey)
        setExistingResponse(data.existingResponse)

        // 既存回答があればセット
        if (data.existingResponse?.answers) {
          const existingAnswers: Record<string, unknown> = {}
          data.existingResponse.answers.forEach((a: { questionId: string; value: unknown }) => {
            existingAnswers[a.questionId] = a.value
          })
          setAnswers(existingAnswers)
        }
      }
    } catch (err) {
      console.error('Error fetching survey:', err)
      setError('アンケートの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const updateAnswer = (questionId: string, value: unknown) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const handleMultiSelectChange = (questionId: string, option: string, checked: boolean) => {
    setAnswers(prev => {
      const current = (prev[questionId] as string[]) || []
      if (checked) {
        return { ...prev, [questionId]: [...current, option] }
      } else {
        return { ...prev, [questionId]: current.filter(o => o !== option) }
      }
    })
  }

  const handleSubmit = async () => {
    if (!survey) return

    // 必須チェック
    for (const question of survey.questions) {
      if (question.required) {
        const answer = answers[question.id]
        if (answer === undefined || answer === '' ||
          (Array.isArray(answer) && answer.length === 0)) {
          setError(`「${question.question}」は必須です`)
          return
        }
      }
    }

    try {
      setIsSubmitting(true)
      setError(null)

      const response = await authenticatedFetch(`/api/events/${eventId}/survey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ answers })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(true)
        setExistingResponse(data.response)
        if (onSurveyComplete) {
          onSurveyComplete()
        }
      } else {
        setError(data.error || '送信に失敗しました')
      }
    } catch (err) {
      console.error('Error submitting survey:', err)
      setError('送信中にエラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
            <span className="ml-2 text-purple-800">読み込み中...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!survey) {
    return null // アンケートがない場合は何も表示しない
  }

  // 既に回答済みの場合
  if (existingResponse && !success) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle2 className="h-5 w-5" />
            <div>
              <p className="font-semibold">アンケート回答済み</p>
              <p className="text-sm">
                回答日時: {new Date(existingResponse.submittedAt).toLocaleString('ja-JP')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 送信成功の場合
  if (success) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle2 className="h-5 w-5" />
            <div>
              <p className="font-semibold">アンケートを送信しました</p>
              <p className="text-sm">ご回答ありがとうございました</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 動画未視聴の場合
  if (!videoWatched) {
    return (
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-slate-600">
            <FileText className="h-5 w-5" />
            <p>アンケートは動画を視聴してから回答できます</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-purple-600" />
          {survey.title}
        </CardTitle>
        {survey.description && (
          <CardDescription>{survey.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="bg-red-100 border border-red-200 rounded-md p-3 text-red-800 text-sm">
            {error}
          </div>
        )}

        {survey.questions.map((question) => (
          <div key={question.id} className="space-y-2 bg-white rounded-lg p-4">
            <Label className="text-base flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Q{question.order}</Badge>
              {question.question}
              {question.required && <span className="text-red-500">*</span>}
            </Label>
            {question.description && (
              <p className="text-sm text-slate-500">{question.description}</p>
            )}

            {/* TEXT */}
            {question.type === 'TEXT' && (
              <Input
                value={(answers[question.id] as string) || ''}
                onChange={(e) => updateAnswer(question.id, e.target.value)}
                placeholder="回答を入力"
              />
            )}

            {/* TEXTAREA */}
            {question.type === 'TEXTAREA' && (
              <Textarea
                value={(answers[question.id] as string) || ''}
                onChange={(e) => updateAnswer(question.id, e.target.value)}
                placeholder="回答を入力"
                rows={4}
              />
            )}

            {/* SELECT */}
            {question.type === 'SELECT' && question.options && (
              <Select
                value={(answers[question.id] as string) || ''}
                onValueChange={(value) => updateAnswer(question.id, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {question.options.map((option, i) => (
                    <SelectItem key={i} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* RADIO */}
            {question.type === 'RADIO' && question.options && (
              <RadioGroup
                value={(answers[question.id] as string) || ''}
                onValueChange={(value) => updateAnswer(question.id, value)}
              >
                {question.options.map((option, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`${question.id}-${i}`} />
                    <Label htmlFor={`${question.id}-${i}`} className="cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {/* MULTI_SELECT */}
            {question.type === 'MULTI_SELECT' && question.options && (
              <div className="space-y-2">
                {question.options.map((option, i) => {
                  const selected = ((answers[question.id] as string[]) || []).includes(option)
                  return (
                    <div key={i} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${question.id}-${i}`}
                        checked={selected}
                        onCheckedChange={(checked) =>
                          handleMultiSelectChange(question.id, option, checked as boolean)
                        }
                      />
                      <Label htmlFor={`${question.id}-${i}`} className="cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  )
                })}
              </div>
            )}

            {/* RATING */}
            {question.type === 'RATING' && (
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => {
                  const selected = answers[question.id] === rating
                  return (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => updateAnswer(question.id, rating)}
                      className={`p-1 transition-colors ${selected ? 'text-yellow-500' : 'text-slate-300 hover:text-yellow-400'
                        }`}
                    >
                      <Star
                        className={`h-8 w-8 ${selected ? 'fill-yellow-400' : 'fill-none'}`}
                      />
                    </button>
                  )
                })}
                <span className="ml-2 text-sm text-slate-500">
                  {answers[question.id] ? `${answers[question.id]} / 5` : '選択してください'}
                </span>
              </div>
            )}
          </div>
        ))}

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              送信中...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              アンケートを送信
            </>
          )}
        </Button>

        <p className="text-xs text-slate-500 text-center">
          送信すると回答日時が自動で記録されます
        </p>
      </CardContent>
    </Card>
  )
}

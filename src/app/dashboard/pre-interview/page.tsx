'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, Clock, AlertCircle, Calendar, Save } from 'lucide-react'

interface Question {
  id: string
  order: number
  category: string | null
  question: string
  description: string | null
  type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'MULTI_SELECT' | 'CHECKBOX' | 'RADIO' | 'NUMBER'
  options: string[] | null
  required: boolean
  showIf: { questionId: string; value: string } | null
}

interface PreInterviewResponse {
  id: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  dueDate: string | null
  startedAt: string | null
  completedAt: string | null
  template: {
    id: string
    name: string
    description: string | null
    questions: Question[]
  }
  answers: {
    questionId: string
    value: any
  }[]
  lpMeeting: {
    id: string
    status: string
    scheduledAt: string | null
    fp: {
      id: string
      name: string
    } | null
  }
}

export default function PreInterviewPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [response, setResponse] = useState<PreInterviewResponse | null>(null)
  const [answers, setAnswers] = useState<{ [questionId: string]: any }>({})
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchPreInterview()
  }, [])

  const fetchPreInterview = async () => {
    try {
      const res = await fetch('/api/pre-interview')
      const data = await res.json()

      if (data.success && data.response) {
        setResponse(data.response)
        // 既存の回答をセット
        const existingAnswers: { [key: string]: any } = {}
        data.response.answers.forEach((a: any) => {
          existingAnswers[a.questionId] = a.value
        })
        setAnswers(existingAnswers)
      }
    } catch (err) {
      console.error('Error fetching pre-interview:', err)
      setError('事前アンケートの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }))
    setError(null)
  }

  const handleMultiSelectChange = (questionId: string, option: string, checked: boolean) => {
    setAnswers(prev => {
      const current = prev[questionId] || []
      if (checked) {
        return { ...prev, [questionId]: [...current, option] }
      } else {
        return { ...prev, [questionId]: current.filter((o: string) => o !== option) }
      }
    })
  }

  const shouldShowQuestion = (question: Question): boolean => {
    if (!question.showIf) return true
    const dependentAnswer = answers[question.showIf.questionId]
    return dependentAnswer === question.showIf.value
  }

  const saveAnswers = async (isComplete: boolean) => {
    if (!response) return

    setSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const answerArray = Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        value
      }))

      const res = await fetch('/api/pre-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseId: response.id,
          answers: answerArray,
          isComplete
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '保存に失敗しました')
        return
      }

      if (isComplete) {
        setSuccessMessage('事前アンケートを送信しました')
        setResponse(data.response)
      } else {
        setSuccessMessage('回答を保存しました')
      }
    } catch (err) {
      console.error('Save error:', err)
      setError('保存中にエラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  const renderQuestion = (question: Question) => {
    if (!shouldShowQuestion(question)) return null

    const value = answers[question.id]

    return (
      <div key={question.id} className="space-y-2 p-4 border rounded-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {question.category && (
              <Badge variant="outline" className="mb-2">{question.category}</Badge>
            )}
            <Label className="text-base font-medium">
              {question.question}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {question.description && (
              <p className="text-sm text-muted-foreground mt-1">{question.description}</p>
            )}
          </div>
        </div>

        <div className="mt-3">
          {question.type === 'TEXT' && (
            <Input
              value={value || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder="回答を入力..."
              disabled={response?.status === 'COMPLETED'}
            />
          )}

          {question.type === 'TEXTAREA' && (
            <Textarea
              value={value || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder="回答を入力..."
              rows={4}
              disabled={response?.status === 'COMPLETED'}
            />
          )}

          {question.type === 'NUMBER' && (
            <Input
              type="number"
              value={value || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value ? Number(e.target.value) : '')}
              placeholder="数値を入力..."
              disabled={response?.status === 'COMPLETED'}
            />
          )}

          {question.type === 'SELECT' && (
            <Select
              value={value || ''}
              onValueChange={(v) => handleAnswerChange(question.id, v)}
              disabled={response?.status === 'COMPLETED'}
            >
              <SelectTrigger>
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                {question.options?.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {question.type === 'RADIO' && (
            <RadioGroup
              value={value || ''}
              onValueChange={(v) => handleAnswerChange(question.id, v)}
              disabled={response?.status === 'COMPLETED'}
            >
              {question.options?.map((opt) => (
                <div key={opt} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt} id={`${question.id}-${opt}`} />
                  <Label htmlFor={`${question.id}-${opt}`}>{opt}</Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {question.type === 'CHECKBOX' && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id={question.id}
                checked={value === true || value === 'はい'}
                onCheckedChange={(checked) => handleAnswerChange(question.id, checked ? 'はい' : 'いいえ')}
                disabled={response?.status === 'COMPLETED'}
              />
              <Label htmlFor={question.id}>はい</Label>
            </div>
          )}

          {question.type === 'MULTI_SELECT' && (
            <div className="space-y-2">
              {question.options?.map((opt) => (
                <div key={opt} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${question.id}-${opt}`}
                    checked={(value || []).includes(opt)}
                    onCheckedChange={(checked) => handleMultiSelectChange(question.id, opt, !!checked)}
                    disabled={response?.status === 'COMPLETED'}
                  />
                  <Label htmlFor={`${question.id}-${opt}`}>{opt}</Label>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!response) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>事前アンケート</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <p>現在、回答が必要な事前アンケートはありません。</p>
            <p className="text-sm mt-2">LP面談が確定すると、こちらに事前アンケートが表示されます。</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isOverdue = response.dueDate && new Date(response.dueDate) < new Date() && response.status !== 'COMPLETED'

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>LP面談 事前アンケート</CardTitle>
              <CardDescription>
                面談前にご回答をお願いいたします
              </CardDescription>
            </div>
            <Badge variant={
              response.status === 'COMPLETED' ? 'default' :
              response.status === 'IN_PROGRESS' ? 'secondary' :
              isOverdue ? 'destructive' : 'outline'
            }>
              {response.status === 'COMPLETED' && <CheckCircle className="h-3 w-3 mr-1" />}
              {response.status === 'IN_PROGRESS' && <Clock className="h-3 w-3 mr-1" />}
              {response.status === 'COMPLETED' ? '回答済み' :
               response.status === 'IN_PROGRESS' ? '回答中' :
               isOverdue ? '期限超過' : '未回答'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
            {response.lpMeeting?.scheduledAt && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">面談日時: </span>
                  {formatDate(response.lpMeeting.scheduledAt)}
                </span>
              </div>
            )}
            {response.lpMeeting?.fp && (
              <div className="text-sm">
                <span className="text-muted-foreground">担当者: </span>
                {response.lpMeeting.fp.name}
              </div>
            )}
            {response.dueDate && (
              <div className="text-sm">
                <span className="text-muted-foreground">回答期限: </span>
                <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                  {new Date(response.dueDate).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            )}
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
            </Alert>
          )}

          {response.status === 'COMPLETED' && (
            <Alert className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                このアンケートは{response.completedAt && formatDate(response.completedAt)}に回答済みです。
              </AlertDescription>
            </Alert>
          )}

          {response.template.description && (
            <p className="text-muted-foreground mb-6">{response.template.description}</p>
          )}

          <div className="space-y-4">
            {response.template.questions.map(renderQuestion)}
          </div>
        </CardContent>

        {response.status !== 'COMPLETED' && (
          <CardFooter className="flex justify-between border-t pt-6">
            <Button
              variant="outline"
              onClick={() => saveAnswers(false)}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              途中保存
            </Button>
            <Button
              onClick={() => saveAnswers(true)}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              回答を送信
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}

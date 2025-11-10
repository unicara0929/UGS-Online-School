'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from 'next/navigation'
import { LogOut, FileText, CheckCircle, Loader2, ArrowLeft, MessageSquare } from "lucide-react"

interface Question {
  id: string
  question: string
  type: 'text' | 'textarea' | 'select' | 'radio'
  options?: string[]
  required?: boolean
}

interface Survey {
  id: string
  title: string
  questions: Question[]
}

function SurveyPageContent() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  useEffect(() => {
    if (user?.id) {
      fetchSurvey()
    }
  }, [user?.id])

  const fetchSurvey = async () => {
    if (!user?.id) return

    try {
      const response = await fetch(`/api/survey?userId=${user.id}`)
      if (!response.ok) {
        throw new Error('アンケートの取得に失敗しました')
      }
      const data = await response.json()
      setSurvey(data.survey)
      setIsSubmitted(!!data.userSubmission)
      
      // 回答用のオブジェクトを初期化
      const initialAnswers: Record<string, string> = {}
      data.survey.questions.forEach((q: Question) => {
        initialAnswers[q.id] = ''
      })
      setAnswers(initialAnswers)
    } catch (error) {
      console.error('Error fetching survey:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const handleSubmit = async () => {
    if (!survey || !user?.id) return

    // 必須項目のチェック
    const requiredQuestions = survey.questions.filter(q => q.required !== false)
    for (const question of requiredQuestions) {
      if (!answers[question.id] || answers[question.id].trim() === '') {
        alert(`「${question.question}」は必須項目です`)
        return
      }
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          surveyId: survey.id,
          answers
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          throw new Error(errorText || 'アンケートの提出に失敗しました')
        }
        throw new Error(errorData.error || 'アンケートの提出に失敗しました')
      }

      const data = await response.json()

      setIsSubmitted(true)
      alert('アンケートの提出が完了しました。ありがとうございます。')
    } catch (error: any) {
      alert(error.message || 'アンケートの提出に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    )
  }

  if (!survey) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p className="text-slate-600">アンケートが見つかりません</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 md:ml-64">
        <header className="bg-white shadow-lg border-b border-slate-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/dashboard/promotion')}
                  className="mr-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  戻る
                </Button>
                <h1 className="text-2xl font-bold text-slate-900">アンケート</h1>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.name.charAt(0)}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-slate-700">{user?.name}</span>
                  <Button variant="ghost" size="sm" onClick={logout}>
                    <LogOut className="h-4 w-4 mr-1" />
                    ログアウト
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                {survey.title}
              </CardTitle>
              <CardDescription>
                全{survey.questions.length}設問
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSubmitted ? (
                <div className="space-y-6">
                  <div className="p-6 rounded-xl bg-green-50 border border-green-200">
                    <div className="text-center">
                      <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                      <h3 className="text-2xl font-bold text-green-800 mb-2">
                        提出完了
                      </h3>
                      <p className="text-lg text-slate-700">
                        アンケートの提出が完了しました。ありがとうございます。
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <Button onClick={() => router.push('/dashboard/promotion')}>
                      昇格管理に戻る
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {survey.questions.map((question, questionIndex) => (
                    <div key={question.id} className="p-4 border border-slate-200 rounded-xl">
                      <label className="block font-medium mb-2">
                        設問 {questionIndex + 1}: {question.question}
                        {question.required !== false && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>
                      {question.type === 'text' && (
                        <input
                          type="text"
                          value={answers[question.id] || ''}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                          required={question.required !== false}
                        />
                      )}
                      {question.type === 'textarea' && (
                        <textarea
                          value={answers[question.id] || ''}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                          required={question.required !== false}
                        />
                      )}
                      {question.type === 'select' && question.options && (
                        <select
                          value={answers[question.id] || ''}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                          required={question.required !== false}
                        >
                          <option value="">選択してください</option>
                          {question.options.map((option, optionIndex) => (
                            <option key={optionIndex} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      )}
                      {question.type === 'radio' && question.options && (
                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => (
                            <label
                              key={optionIndex}
                              className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                                answers[question.id] === option
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name={question.id}
                                value={option}
                                checked={answers[question.id] === option}
                                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                className="mr-3"
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="flex justify-center pt-4">
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      size="lg"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          提出中...
                        </>
                      ) : (
                        'アンケートを提出'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}

export default function SurveyPage() {
  return (
    <ProtectedRoute requiredRoles={['member']}>
      <SurveyPageContent />
    </ProtectedRoute>
  )
}


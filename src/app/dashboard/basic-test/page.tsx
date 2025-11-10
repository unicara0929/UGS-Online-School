'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from 'next/navigation'
import { LogOut, FileText, CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react"

interface Question {
  id: string
  question: string
  options: string[]
  correctAnswer: number
}

interface Test {
  id: string
  title: string
  questions: Question[]
  passingScore: number
}

interface TestResult {
  score: number
  isPassed: boolean
  completedAt: string
}

function BasicTestPageContent() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [test, setTest] = useState<Test | null>(null)
  const [userResult, setUserResult] = useState<TestResult | null>(null)
  const [answers, setAnswers] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [result, setResult] = useState<{ score: number; isPassed: boolean; correctCount: number; totalQuestions: number } | null>(null)

  useEffect(() => {
    if (user?.id) {
      fetchTest()
    }
  }, [user?.id])

  const fetchTest = async () => {
    if (!user?.id) return

    try {
      const response = await fetch(`/api/basic-test?userId=${user.id}`)
      if (!response.ok) {
        throw new Error('テストの取得に失敗しました')
      }
      const data = await response.json()
      setTest(data.test)
      setUserResult(data.userResult)
      
      // 既に合格している場合は結果を表示
      if (data.userResult?.isPassed) {
        setShowResult(true)
        setResult({
          score: data.userResult.score,
          isPassed: true,
          correctCount: Math.round((data.userResult.score / 100) * data.test.questions.length),
          totalQuestions: data.test.questions.length
        })
      } else if (data.userResult) {
        // 過去の回答がある場合は復元
        const previousAnswers = data.userResult.answers as number[]
        setAnswers(previousAnswers)
      } else {
        // 新しい回答用の配列を初期化
        setAnswers(new Array(data.test.questions.length).fill(-1))
      }
    } catch (error) {
      console.error('Error fetching test:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnswerChange = (questionIndex: number, answerIndex: number) => {
    const newAnswers = [...answers]
    newAnswers[questionIndex] = answerIndex
    setAnswers(newAnswers)
  }

  const handleSubmit = async () => {
    if (!test || !user?.id) return

    // すべての質問に回答しているか確認
    if (answers.some(answer => answer === -1)) {
      alert('すべての質問に回答してください')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/basic-test/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          testId: test.id,
          answers
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'テストの提出に失敗しました')
      }

      setResult(data.result)
      setShowResult(true)
      
      if (data.result.isPassed) {
        alert(`おめでとうございます！テストに合格しました。得点: ${data.result.score}%`)
        await fetchTest() // 条件を再取得
      } else {
        alert(`残念ながら不合格でした。得点: ${data.result.score}%（合格点: ${test.passingScore}%）`)
      }
    } catch (error: any) {
      alert(error.message || 'テストの提出に失敗しました')
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

  if (!test) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p className="text-slate-600">基礎テストが見つかりません</p>
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
                <h1 className="text-2xl font-bold text-slate-900">基礎編テスト</h1>
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
                {test.title}
              </CardTitle>
              <CardDescription>
                全{test.questions.length}問、合格点: {test.passingScore}%
              </CardDescription>
            </CardHeader>
            <CardContent>
              {showResult && result ? (
                <div className="space-y-6">
                  <div className={`p-6 rounded-xl ${result.isPassed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="text-center">
                      {result.isPassed ? (
                        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                      ) : (
                        <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
                      )}
                      <h3 className={`text-2xl font-bold mb-2 ${result.isPassed ? 'text-green-800' : 'text-red-800'}`}>
                        {result.isPassed ? '合格' : '不合格'}
                      </h3>
                      <p className="text-lg text-slate-700">
                        得点: {result.score}% ({result.correctCount}/{result.totalQuestions}問正解)
                      </p>
                      {!result.isPassed && (
                        <p className="text-sm text-slate-600 mt-2">
                          合格点: {test.passingScore}%
                        </p>
                      )}
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
                  {test.questions.map((question, questionIndex) => (
                    <div key={questionIndex} className="p-4 border border-slate-200 rounded-xl">
                      <h4 className="font-medium mb-3">
                        問題 {questionIndex + 1}: {question.question}
                      </h4>
                      <div className="space-y-2">
                        {question.options.map((option, optionIndex) => (
                          <label
                            key={optionIndex}
                            className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                              answers[questionIndex] === optionIndex
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${questionIndex}`}
                              value={optionIndex}
                              checked={answers[questionIndex] === optionIndex}
                              onChange={() => handleAnswerChange(questionIndex, optionIndex)}
                              className="mr-3"
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-center pt-4">
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting || answers.some(answer => answer === -1)}
                      size="lg"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          提出中...
                        </>
                      ) : (
                        'テストを提出'
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

export default function BasicTestPage() {
  return (
    <ProtectedRoute requiredRoles={['member']}>
      <BasicTestPageContent />
    </ProtectedRoute>
  )
}


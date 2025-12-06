'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { authenticatedFetch } from '@/lib/utils/api-client'
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  FileText,
  Award,
  RefreshCw,
  ChevronRight
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'

interface Question {
  id: string
  question: string
  options: string[]
  category: string | null
  order: number
}

interface Result {
  questionId: string
  question: string
  options: string[]
  selectedAnswer: number
  correctAnswer: number
  isCorrect: boolean
  explanation: string | null
  category: string | null
}

interface Attempt {
  id: string
  totalQuestions: number
  correctCount: number
  score: number
  isPassed: boolean
  createdAt: string
}

const PASSING_SCORE = 90

export default function ComplianceTestPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPassed, setIsPassed] = useState(false)
  const [passedAt, setPassedAt] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [currentStep, setCurrentStep] = useState<'intro' | 'test' | 'result'>('intro')
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [results, setResults] = useState<{
    score: number
    correctCount: number
    totalQuestions: number
    isPassed: boolean
    results: Result[]
  } | null>(null)

  // FPエイドまたはFP昇格承認済みでない場合はダッシュボードにリダイレクト
  const [canAccess, setCanAccess] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) return

      // FPロールの場合はアクセス可
      if (user.role === 'fp') {
        setCanAccess(true)
        return
      }

      // FP昇格承認済みかチェック
      try {
        const response = await authenticatedFetch('/api/user/fp-onboarding-status')
        if (response.ok) {
          const data = await response.json()
          if (data.fpPromotionApproved) {
            setCanAccess(true)
            return
          }
        }
      } catch (error) {
        console.error('Error checking FP promotion status:', error)
      }

      // アクセス不可 → ダッシュボードへ
      setCanAccess(false)
      router.push('/dashboard')
    }

    checkAccess()
  }, [user, router])

  useEffect(() => {
    if (user && canAccess) {
      fetchTestData()
    }
  }, [user, canAccess])

  const fetchTestData = async () => {
    setIsLoading(true)
    try {
      const response = await authenticatedFetch('/api/user/compliance-test')
      if (response.ok) {
        const data = await response.json()
        setIsPassed(data.isPassed)
        setPassedAt(data.passedAt)
        setQuestions(data.questions || [])
        setAttempts(data.attempts || [])
      }
    } catch (error) {
      console.error('Error fetching test data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartTest = () => {
    setAnswers({})
    setCurrentQuestionIndex(0)
    setResults(null)
    setCurrentStep('test')
  }

  const handleSelectAnswer = (questionId: string, answerIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }))
  }

  const handleSubmitTest = async () => {
    // 全問回答しているか確認
    const unansweredCount = questions.length - Object.keys(answers).length
    if (unansweredCount > 0) {
      if (!confirm(`未回答の問題が${unansweredCount}問あります。このまま提出しますか？`)) {
        return
      }
    }

    setIsSubmitting(true)
    try {
      const response = await authenticatedFetch('/api/user/compliance-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '提出に失敗しました')
      }

      const data = await response.json()
      setResults({
        score: data.score,
        correctCount: data.correctCount,
        totalQuestions: data.totalQuestions,
        isPassed: data.isPassed,
        results: data.results
      })
      setIsPassed(data.isPassed)
      if (data.isPassed) {
        setPassedAt(new Date().toISOString())
      }
      setCurrentStep('result')
    } catch (error: any) {
      console.error('Submit test error:', error)
      alert(error.message || '提出に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoToGuidance = () => {
    router.push('/dashboard/fp-onboarding')
  }

  if (isLoading || canAccess === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-600 mx-auto mb-4" />
          <p className="text-slate-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  // アクセス権がない場合は何も表示しない（リダイレクト中）
  if (!canAccess) {
    return null
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <FileText className="h-6 w-6" />
                コンプライアンステスト
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">テスト問題が設定されていません</p>
              <p className="text-sm text-slate-500 mt-2">
                管理者にお問い合わせください
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // 結果画面
  if (currentStep === 'result' && results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 結果サマリー */}
          <Card className={`shadow-xl ${results.isPassed ? 'border-green-300' : 'border-red-300'} border-2`}>
            <CardHeader className="text-center">
              {results.isPassed ? (
                <div className="mb-4">
                  <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                    <Award className="h-10 w-10 text-white" />
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto">
                    <XCircle className="h-10 w-10 text-white" />
                  </div>
                </div>
              )}
              <CardTitle className={`text-3xl ${results.isPassed ? 'text-green-700' : 'text-red-700'}`}>
                {results.isPassed ? '合格おめでとうございます！' : '残念ながら不合格です'}
              </CardTitle>
              <CardDescription className="text-lg mt-2">
                スコア: {Math.round(results.score)}%
                （正解: {results.correctCount} / {results.totalQuestions}問）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                <Badge className={results.isPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  合格ライン: {PASSING_SCORE}%
                </Badge>
                <Badge className={results.isPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  あなたのスコア: {Math.round(results.score)}%
                </Badge>
              </div>

              {results.isPassed ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <p className="text-green-800 mb-4">
                    コンプライアンステストに合格しました。<br />
                    次のステップとして、ガイダンス動画を視聴してください。
                  </p>
                  <Button
                    onClick={handleGoToGuidance}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    ガイダンス動画へ進む
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                  <p className="text-yellow-800 mb-4">
                    合格ラインに達しませんでした。<br />
                    下記の解説を確認し、再度チャレンジしてください。
                  </p>
                  <Button onClick={handleStartTest} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    もう一度受験する
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 問題別結果 */}
          <Card>
            <CardHeader>
              <CardTitle>問題別結果</CardTitle>
              <CardDescription>
                {!results.isPassed && '不正解の問題には解説が表示されています'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.results.map((result, index) => (
                <div
                  key={result.questionId}
                  className={`p-4 rounded-lg border ${
                    result.isCorrect
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {result.isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-slate-500">Q{index + 1}</span>
                        {result.category && (
                          <Badge variant="outline" className="text-xs">{result.category}</Badge>
                        )}
                      </div>
                      <p className="font-medium mb-3">{result.question}</p>

                      <div className="space-y-2">
                        {(result.options as string[]).map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className={`text-sm p-2 rounded ${
                              optIndex === result.correctAnswer
                                ? 'bg-green-100 text-green-800 border border-green-300'
                                : optIndex === result.selectedAnswer && !result.isCorrect
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : 'bg-white text-slate-600 border border-slate-200'
                            }`}
                          >
                            {optIndex === result.correctAnswer && (
                              <span className="font-medium mr-1">✓ 正解:</span>
                            )}
                            {optIndex === result.selectedAnswer && optIndex !== result.correctAnswer && (
                              <span className="font-medium mr-1">✗ あなたの回答:</span>
                            )}
                            {option}
                          </div>
                        ))}
                      </div>

                      {!result.isCorrect && result.explanation && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            <span className="font-medium">解説: </span>
                            {result.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // テスト画面
  if (currentStep === 'test') {
    const currentQuestion = questions[currentQuestionIndex]
    const answeredCount = Object.keys(answers).length
    const progress = (answeredCount / questions.length) * 100

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* 進捗 */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">進捗</span>
                <span className="text-sm text-slate-600">
                  {currentQuestionIndex + 1} / {questions.length}問
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-slate-500 mt-2">
                回答済み: {answeredCount}問
              </p>
            </CardContent>
          </Card>

          {/* 問題 */}
          <Card className="shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Q{currentQuestionIndex + 1}</Badge>
                  {currentQuestion.category && (
                    <Badge variant="secondary">{currentQuestion.category}</Badge>
                  )}
                </div>
              </div>
              <CardTitle className="text-xl mt-4">
                {currentQuestion.question}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(currentQuestion.options as string[]).map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectAnswer(currentQuestion.id, index)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    answers[currentQuestion.id] === index
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        answers[currentQuestion.id] === index
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-slate-300'
                      }`}
                    >
                      {answers[currentQuestion.id] === index && (
                        <CheckCircle className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <span className={answers[currentQuestion.id] === index ? 'font-medium' : ''}>
                      {option}
                    </span>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* ナビゲーション */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
            >
              前の問題
            </Button>

            <div className="flex gap-2">
              {questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                    currentQuestionIndex === index
                      ? 'bg-blue-600 text-white'
                      : answers[questions[index].id] !== undefined
                      ? 'bg-green-100 text-green-800 border border-green-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            {currentQuestionIndex === questions.length - 1 ? (
              <Button
                onClick={handleSubmitTest}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
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
            ) : (
              <Button
                onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
              >
                次の問題
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // イントロ画面（既に合格済みの場合も表示）
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <FileText className="h-6 w-6" />
              コンプライアンステスト
            </CardTitle>
            <CardDescription>
              FPエイドとして活動を開始する前に、コンプライアンスに関する基礎知識を確認するテストです。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isPassed ? (
              <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-green-800 mb-2">
                  合格済みです
                </h3>
                <p className="text-green-700 mb-2">
                  コンプライアンステストに合格しています。
                </p>
                {passedAt && (
                  <p className="text-sm text-green-600">
                    合格日: {formatDate(new Date(passedAt))}
                  </p>
                )}
                <div className="mt-4">
                  <Button
                    onClick={handleGoToGuidance}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    ガイダンス動画へ進む
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium">テスト概要</h4>
                  <ul className="text-sm text-slate-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>問題数: {questions.length}問</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>合格ライン: {PASSING_SCORE}%以上</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>受験回数: 制限なし（何度でも再受験可能）</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>不合格の場合は間違えた問題の解説が表示されます</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium mb-1">注意事項</p>
                      <p>
                        このテストに合格しないと、ガイダンス動画の視聴およびFPエイドとしての活動を開始することができません。
                      </p>
                    </div>
                  </div>
                </div>

                <Button onClick={handleStartTest} className="w-full" size="lg">
                  テストを開始する
                </Button>
              </>
            )}

            {/* 過去の受験履歴 */}
            {attempts.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">過去の受験履歴</h4>
                <div className="space-y-2">
                  {attempts.slice(0, 5).map((attempt) => (
                    <div
                      key={attempt.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {attempt.isPassed ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="text-sm">
                          {attempt.isPassed ? '合格' : '不合格'}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600">
                        {Math.round(attempt.score)}% ({attempt.correctCount}/{attempt.totalQuestions})
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDate(new Date(attempt.createdAt))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

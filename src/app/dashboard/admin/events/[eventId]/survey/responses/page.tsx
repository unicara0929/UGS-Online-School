'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Loader2,
  ArrowLeft,
  Users,
  FileText,
  BarChart3,
  Star,
  Settings
} from 'lucide-react'
import Link from 'next/link'

interface Answer {
  questionId: string
  questionOrder: number
  questionText: string
  questionType: string
  value: unknown
}

interface UserInfo {
  id: string
  name: string
  email: string
  memberId: string | null
  role: string
}

interface Response {
  id: string
  submittedAt: string
  user: UserInfo
  answers: Answer[]
}

interface QuestionSummary {
  questionId: string
  question: string
  type: string
  totalAnswers: number
  summary: Record<string, number> | null
}

interface Survey {
  id: string
  title: string
  description: string | null
  questions: Array<{
    id: string
    order: number
    question: string
    type: string
    options: string[] | null
    required: boolean
  }>
}

interface Event {
  id: string
  title: string
  date: string
}

function AdminSurveyResponsesPageContent({ params }: { params: Promise<{ eventId: string }> }) {
  const router = useRouter()
  const { eventId } = use(params)
  const [event, setEvent] = useState<Event | null>(null)
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [responses, setResponses] = useState<Response[]>([])
  const [questionSummary, setQuestionSummary] = useState<QuestionSummary[]>([])
  const [totalResponses, setTotalResponses] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchResponses()
  }, [eventId])

  const fetchResponses = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/events/${eventId}/survey/responses`, {
        credentials: 'include'
      })
      const data = await response.json()

      if (response.ok && data.success) {
        setEvent(data.event)
        setSurvey(data.survey)
        setResponses(data.responses || [])
        setTotalResponses(data.summary?.totalResponses || 0)
        setQuestionSummary(data.summary?.questionSummary || [])
      } else {
        setError(data.error || 'データの取得に失敗しました')
      }
    } catch (err) {
      console.error('Error fetching responses:', err)
      setError('データの取得中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy/MM/dd HH:mm', { locale: ja })
    } catch {
      return dateString
    }
  }

  const renderAnswerValue = (value: unknown, type: string): string => {
    if (value === null || value === undefined) return '-'
    if (Array.isArray(value)) return value.join(', ')
    if (type === 'RATING') return `${value} / 5`
    return String(value)
  }

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'ADMIN': return '管理者'
      case 'MANAGER': return 'マネージャー'
      case 'FP': return 'FPエイド'
      case 'MEMBER': return 'UGS会員'
      default: return role
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 min-w-0 md:ml-64">
          <PageHeader title="アンケート回答一覧" />
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-slate-600">読み込み中...</span>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 min-w-0 md:ml-64">
          <PageHeader title="アンケート回答一覧" />
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <p className="text-red-600">{error}</p>
                <Button
                  onClick={() => router.push(`/dashboard/admin/events/${eventId}`)}
                  variant="outline"
                  className="mt-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  イベント詳細に戻る
                </Button>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 min-w-0 md:ml-64">
        <PageHeader title="アンケート回答一覧" />
        <main className="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* ヘッダー */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => router.push(`/dashboard/admin/events/${eventId}/survey`)}
                variant="outline"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                戻る
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {survey?.title || 'アンケート回答一覧'}
                </h1>
                <p className="text-slate-600 text-sm">
                  {event?.title}
                </p>
              </div>
            </div>
            <Link href={`/dashboard/admin/events/${eventId}/survey`}>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                アンケート設定
              </Button>
            </Link>
          </div>

          {!survey ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-slate-600 text-center">
                  アンケートがまだ作成されていません。
                </p>
                <div className="text-center mt-4">
                  <Link href={`/dashboard/admin/events/${eventId}/survey`}>
                    <Button>アンケートを作成</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* サマリーカード */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">回答数</p>
                        <p className="text-3xl font-bold">{totalResponses}</p>
                      </div>
                      <Users className="h-10 w-10 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">質問数</p>
                        <p className="text-3xl font-bold">{survey.questions.length}</p>
                      </div>
                      <FileText className="h-10 w-10 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">回答率</p>
                        <p className="text-3xl font-bold">-</p>
                      </div>
                      <BarChart3 className="h-10 w-10 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* タブ */}
              <Tabs defaultValue="responses" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="responses">回答一覧</TabsTrigger>
                  <TabsTrigger value="summary">集計結果</TabsTrigger>
                </TabsList>

                {/* 回答一覧タブ */}
                <TabsContent value="responses">
                  <Card>
                    <CardHeader>
                      <CardTitle>回答一覧</CardTitle>
                      <CardDescription>
                        全{totalResponses}件の回答
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      {responses.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          まだ回答がありません
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-slate-50">
                                <TableHead className="min-w-[100px]">会員番号</TableHead>
                                <TableHead className="min-w-[120px]">名前</TableHead>
                                <TableHead className="min-w-[80px]">ロール</TableHead>
                                <TableHead className="min-w-[140px]">回答日時</TableHead>
                                {survey.questions.map((q) => (
                                  <TableHead key={q.id} className="min-w-[200px]">
                                    Q{q.order}: {q.question}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {responses.map((response) => (
                                <TableRow key={response.id}>
                                  <TableCell className="font-mono text-sm">
                                    {response.user.memberId || '-'}
                                  </TableCell>
                                  <TableCell>{response.user.name}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">
                                      {getRoleLabel(response.user.role)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-slate-600">
                                    {formatDate(response.submittedAt)}
                                  </TableCell>
                                  {survey.questions.map((q) => {
                                    const answer = response.answers.find(
                                      (a) => a.questionId === q.id
                                    )
                                    return (
                                      <TableCell key={q.id} className="text-sm">
                                        {answer ? renderAnswerValue(answer.value, q.type) : '-'}
                                      </TableCell>
                                    )
                                  })}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* 集計結果タブ */}
                <TabsContent value="summary">
                  <div className="space-y-6">
                    {questionSummary.map((qs, index) => (
                      <Card key={qs.questionId}>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Badge variant="outline">Q{index + 1}</Badge>
                            {qs.question}
                          </CardTitle>
                          <CardDescription>
                            回答数: {qs.totalAnswers}件
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {qs.type === 'RATING' && qs.summary ? (
                            <div className="space-y-2">
                              {[5, 4, 3, 2, 1].map((rating) => {
                                const count = qs.summary?.[String(rating)] || 0
                                const percentage = qs.totalAnswers > 0
                                  ? Math.round((count / qs.totalAnswers) * 100)
                                  : 0
                                return (
                                  <div key={rating} className="flex items-center gap-2">
                                    <div className="flex items-center gap-1 w-16">
                                      {Array.from({ length: rating }).map((_, i) => (
                                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                      ))}
                                    </div>
                                    <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-blue-500 rounded-full"
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                    <span className="text-sm text-slate-600 w-16 text-right">
                                      {count}件 ({percentage}%)
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          ) : qs.summary ? (
                            <div className="space-y-2">
                              {Object.entries(qs.summary)
                                .sort(([, a], [, b]) => b - a)
                                .map(([option, count]) => {
                                  const percentage = qs.totalAnswers > 0
                                    ? Math.round((count / qs.totalAnswers) * 100)
                                    : 0
                                  return (
                                    <div key={option} className="flex items-center gap-2">
                                      <span className="w-32 text-sm truncate">{option}</span>
                                      <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-blue-500 rounded-full"
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                      <span className="text-sm text-slate-600 w-16 text-right">
                                        {count}件 ({percentage}%)
                                      </span>
                                    </div>
                                  )
                                })}
                            </div>
                          ) : (
                            <p className="text-slate-500">テキスト回答のため集計なし</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default function AdminSurveyResponsesPage({ params }: { params: Promise<{ eventId: string }> }) {
  return (
    <ProtectedRoute requiredRoles={['admin', 'manager']}>
      <AdminSurveyResponsesPageContent params={params} />
    </ProtectedRoute>
  )
}

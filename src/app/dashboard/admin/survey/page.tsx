'use client'

import { useState, useEffect, useCallback } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { authenticatedFetch } from '@/lib/utils/api-client'
import { Loader2, Users, FileText, BarChart3 } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface SurveyQuestion {
  id: string
  question: string
  type: 'text' | 'textarea' | 'select' | 'radio'
  options?: string[]
  required?: boolean
}

interface SurveyListItem {
  id: string
  title: string
  createdAt: string
  submissionCount: number
}

interface SubmissionUser {
  id: string
  name: string
  email: string
  role: string
  memberId: string
}

interface Submission {
  id: string
  userId: string
  answers: Record<string, string>
  submittedAt: string
  user: SubmissionUser
}

interface SurveyDetail {
  id: string
  title: string
  questions: SurveyQuestion[]
}

function getRoleLabel(role: string): string {
  switch (role) {
    case 'ADMIN': return '管理者'
    case 'MANAGER': return 'マネージャー'
    case 'FP': return 'FPエイド'
    case 'MEMBER': return 'UGS会員'
    default: return role
  }
}

function AdminSurveyPageContent() {
  const [surveys, setSurveys] = useState<SurveyListItem[]>([])
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('')
  const [surveyDetail, setSurveyDetail] = useState<SurveyDetail | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [totalUsers, setTotalUsers] = useState<number>(0)
  const [isLoadingSurveys, setIsLoadingSurveys] = useState(true)
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false)

  // アンケート一覧を取得
  useEffect(() => {
    async function fetchSurveys() {
      try {
        const res = await authenticatedFetch('/api/admin/survey')
        const data = await res.json()
        if (data.success) {
          setSurveys(data.surveys)
          if (data.surveys.length > 0) {
            setSelectedSurveyId(data.surveys[0].id)
          }
        }
      } catch (error) {
        console.error('Failed to fetch surveys:', error)
      } finally {
        setIsLoadingSurveys(false)
      }
    }
    fetchSurveys()
  }, [])

  // ユーザー数を取得
  useEffect(() => {
    async function fetchUserCount() {
      try {
        const res = await authenticatedFetch('/api/admin/users?limit=1')
        const data = await res.json()
        if (data.total !== undefined) {
          setTotalUsers(data.total)
        }
      } catch (error) {
        console.error('Failed to fetch user count:', error)
      }
    }
    fetchUserCount()
  }, [])

  // 選択されたアンケートの回答を取得
  const fetchSubmissions = useCallback(async (surveyId: string) => {
    setIsLoadingSubmissions(true)
    try {
      const res = await authenticatedFetch(`/api/admin/survey/${surveyId}/submissions`)
      const data = await res.json()
      if (data.success) {
        setSurveyDetail(data.survey)
        setSubmissions(data.submissions)
      }
    } catch (error) {
      console.error('Failed to fetch submissions:', error)
    } finally {
      setIsLoadingSubmissions(false)
    }
  }, [])

  useEffect(() => {
    if (selectedSurveyId) {
      fetchSubmissions(selectedSurveyId)
    }
  }, [selectedSurveyId, fetchSubmissions])

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy/MM/dd HH:mm', { locale: ja })
    } catch {
      return dateString
    }
  }

  // select/radio の回答分布を計算
  const getDistribution = (questionId: string): Record<string, number> => {
    const dist: Record<string, number> = {}
    for (const sub of submissions) {
      const answer = sub.answers[questionId]
      if (answer) {
        dist[answer] = (dist[answer] || 0) + 1
      }
    }
    return dist
  }

  // テキスト回答を収集
  const getTextAnswers = (questionId: string): { user: string; answer: string }[] => {
    return submissions
      .filter((sub) => sub.answers[questionId])
      .map((sub) => ({
        user: sub.user.name,
        answer: sub.answers[questionId],
      }))
  }

  if (isLoadingSurveys) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 min-w-0 md:ml-64">
          <PageHeader title="アンケート管理" />
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden="true" />
              <span className="ml-2 text-slate-600">読み込み中...</span>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (surveys.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 min-w-0 md:ml-64">
          <PageHeader title="アンケート管理" />
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <Card>
              <CardContent className="pt-6">
                <p className="text-slate-600 text-center">アンケートがまだ作成されていません。</p>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    )
  }

  const questions = surveyDetail?.questions || []

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 min-w-0 md:ml-64">
        <PageHeader title="アンケート管理" />
        <main className="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* アンケート選択 */}
          {surveys.length > 1 && (
            <div>
              <label htmlFor="survey-select" className="block text-sm font-medium text-slate-700 mb-1">
                アンケートを選択
              </label>
              <select
                id="survey-select"
                value={selectedSurveyId}
                onChange={(e) => setSelectedSurveyId(e.target.value)}
                className="block w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {surveys.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}（回答数: {s.submissionCount}）
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 統計カード */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">回答数</p>
                    <p className="text-3xl font-bold">{submissions.length}</p>
                  </div>
                  <FileText className="h-10 w-10 text-blue-500" aria-hidden="true" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">全ユーザー数</p>
                    <p className="text-3xl font-bold">{totalUsers}</p>
                  </div>
                  <Users className="h-10 w-10 text-green-500" aria-hidden="true" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">回答率</p>
                    <p className="text-3xl font-bold">
                      {totalUsers > 0 ? Math.round((submissions.length / totalUsers) * 100) : 0}%
                    </p>
                  </div>
                  <BarChart3 className="h-10 w-10 text-purple-500" aria-hidden="true" />
                </div>
              </CardContent>
            </Card>
          </div>

          {isLoadingSubmissions ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden="true" />
              <span className="ml-2 text-slate-600">読み込み中...</span>
            </div>
          ) : (
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
                    <CardDescription>全{submissions.length}件の回答</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {submissions.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        まだ回答がありません
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead className="min-w-[120px]">名前</TableHead>
                              <TableHead className="min-w-[80px]">ロール</TableHead>
                              <TableHead className="min-w-[140px]">回答日時</TableHead>
                              {questions.map((q, i) => (
                                <TableHead key={q.id} className="min-w-[200px]">
                                  Q{i + 1}: {q.question}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {submissions.map((sub) => (
                              <TableRow key={sub.id}>
                                <TableCell className="font-medium">{sub.user.name}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{getRoleLabel(sub.user.role)}</Badge>
                                </TableCell>
                                <TableCell className="text-sm text-slate-600">
                                  {formatDate(sub.submittedAt)}
                                </TableCell>
                                {questions.map((q) => (
                                  <TableCell key={q.id} className="text-sm">
                                    {sub.answers[q.id] || '-'}
                                  </TableCell>
                                ))}
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
                  {questions.map((q, index) => {
                    const isChoiceType = q.type === 'select' || q.type === 'radio'

                    if (isChoiceType) {
                      const dist = getDistribution(q.id)
                      const answeredCount = Object.values(dist).reduce((a, b) => a + b, 0)

                      return (
                        <Card key={q.id}>
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Badge variant="outline">Q{index + 1}</Badge>
                              {q.question}
                            </CardTitle>
                            <CardDescription>回答数: {answeredCount}件</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {Object.entries(dist)
                                .sort(([, a], [, b]) => b - a)
                                .map(([option, count]) => {
                                  const percentage = answeredCount > 0
                                    ? Math.round((count / answeredCount) * 100)
                                    : 0
                                  return (
                                    <div key={option} className="flex items-center gap-2">
                                      <span className="w-32 text-sm truncate" title={option}>{option}</span>
                                      <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-blue-500 rounded-full transition-all"
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                      <span className="text-sm text-slate-600 w-20 text-right">
                                        {count}件 ({percentage}%)
                                      </span>
                                    </div>
                                  )
                                })}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    }

                    // text / textarea
                    const textAnswers = getTextAnswers(q.id)
                    return (
                      <Card key={q.id}>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Badge variant="outline">Q{index + 1}</Badge>
                            {q.question}
                          </CardTitle>
                          <CardDescription>テキスト回答: {textAnswers.length}件</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {textAnswers.length === 0 ? (
                            <p className="text-slate-500">回答なし</p>
                          ) : (
                            <div className="space-y-3">
                              {textAnswers.map((ta, i) => (
                                <div key={i} className="border-l-2 border-slate-200 pl-3 py-1">
                                  <p className="text-sm text-slate-500">{ta.user}</p>
                                  <p className="text-sm whitespace-pre-wrap">{ta.answer}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </main>
      </div>
    </div>
  )
}

export default function AdminSurveyPage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <AdminSurveyPageContent />
    </ProtectedRoute>
  )
}

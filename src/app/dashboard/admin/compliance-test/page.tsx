'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { authenticatedFetch } from '@/lib/utils/api-client'
import {
  Plus,
  Edit,
  Trash2,
  GripVertical,
  CheckCircle,
  XCircle,
  FileText,
  Users,
  Loader2,
  History,
  AlertCircle,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'

interface Question {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string | null
  category: string | null
  order: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  answerCount: number
}

interface Attempt {
  id: string
  userId: string
  totalQuestions: number
  correctCount: number
  score: number
  isPassed: boolean
  startedAt: string
  completedAt: string | null
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    memberId: string
    role: string
  }
}

interface Stats {
  totalAttempts: number
  passedAttempts: number
  passedUsersCount: number
}

export default function AdminComplianceTestPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showQuestionDialog, setShowQuestionDialog] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('questions')

  // フォームの状態
  const [formData, setFormData] = useState({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    category: '',
    isActive: true
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [questionsRes, attemptsRes] = await Promise.all([
        authenticatedFetch('/api/admin/compliance-test/questions'),
        authenticatedFetch('/api/admin/compliance-test/attempts')
      ])

      if (questionsRes.ok) {
        const data = await questionsRes.json()
        setQuestions(data.questions || [])
      }

      if (attemptsRes.ok) {
        const data = await attemptsRes.json()
        setAttempts(data.attempts || [])
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenDialog = (question?: Question) => {
    if (question) {
      setEditingQuestion(question)
      const options = question.options as string[]
      setFormData({
        question: question.question,
        options: [...options, '', '', '', ''].slice(0, 4),
        correctAnswer: question.correctAnswer,
        explanation: question.explanation || '',
        category: question.category || '',
        isActive: question.isActive
      })
    } else {
      setEditingQuestion(null)
      setFormData({
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        explanation: '',
        category: '',
        isActive: true
      })
    }
    setShowQuestionDialog(true)
  }

  const handleSaveQuestion = async () => {
    // バリデーション
    if (!formData.question.trim()) {
      alert('設問を入力してください')
      return
    }

    const validOptions = formData.options.filter(o => o.trim())
    if (validOptions.length < 2) {
      alert('少なくとも2つの選択肢を入力してください')
      return
    }

    if (formData.correctAnswer >= validOptions.length) {
      alert('正解の選択肢を選択してください')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        question: formData.question,
        options: validOptions,
        correctAnswer: formData.correctAnswer,
        explanation: formData.explanation || null,
        category: formData.category || null,
        isActive: formData.isActive
      }

      const url = editingQuestion
        ? `/api/admin/compliance-test/questions/${editingQuestion.id}`
        : '/api/admin/compliance-test/questions'

      const response = await authenticatedFetch(url, {
        method: editingQuestion ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '保存に失敗しました')
      }

      setShowQuestionDialog(false)
      fetchData()
    } catch (error: any) {
      console.error('Save question error:', error)
      alert(error.message || '保存に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteQuestion = async (id: string) => {
    setIsSubmitting(true)
    try {
      const response = await authenticatedFetch(`/api/admin/compliance-test/questions/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '削除に失敗しました')
      }

      setDeleteConfirmId(null)
      fetchData()
    } catch (error: any) {
      console.error('Delete question error:', error)
      alert(error.message || '削除に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMoveQuestion = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === questions.length - 1)
    ) {
      return
    }

    const newQuestions = [...questions]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    ;[newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]]

    setQuestions(newQuestions)

    try {
      await authenticatedFetch('/api/admin/compliance-test/questions/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIds: newQuestions.map(q => q.id)
        })
      })
    } catch (error) {
      console.error('Reorder error:', error)
      fetchData() // 失敗したら元に戻す
    }
  }

  if (isLoading) {
    return (
      <ProtectedRoute requiredRoles={['admin']}>
        <div className="space-y-6">
          <PageHeader title="コンプライアンステスト管理" />
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <div className="space-y-6">
        <PageHeader title="コンプライアンステスト管理" />

        {/* 統計カード */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">問題数</CardTitle>
              <FileText className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{questions.filter(q => q.isActive).length}</div>
              <p className="text-xs text-slate-500">有効な問題</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">受験回数</CardTitle>
              <History className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalAttempts || 0}</div>
              <p className="text-xs text-slate-500">累計</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">合格者数</CardTitle>
              <Users className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.passedUsersCount || 0}</div>
              <p className="text-xs text-slate-500">ユニークユーザー</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">合格率</CardTitle>
              <CheckCircle className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats && stats.totalAttempts > 0
                  ? Math.round((stats.passedAttempts / stats.totalAttempts) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-slate-500">
                {stats?.passedAttempts || 0} / {stats?.totalAttempts || 0} 回
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="questions">問題管理</TabsTrigger>
            <TabsTrigger value="attempts">受験履歴</TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-600">
                問題を追加・編集・削除できます。並び順はドラッグまたは上下ボタンで変更できます。
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                問題を追加
              </Button>
            </div>

            {questions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">問題がありません</p>
                  <p className="text-sm text-slate-500 mt-2">
                    「問題を追加」ボタンから問題を作成してください
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {questions.map((question, index) => (
                      <div
                        key={question.id}
                        className={`p-4 flex items-start gap-4 ${
                          !question.isActive ? 'bg-slate-50 opacity-75' : ''
                        }`}
                      >
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleMoveQuestion(index, 'up')}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <GripVertical className="h-4 w-4 text-slate-400 mx-auto" />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleMoveQuestion(index, 'down')}
                            disabled={index === questions.length - 1}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-slate-500">
                              Q{index + 1}
                            </span>
                            {question.category && (
                              <Badge variant="outline">{question.category}</Badge>
                            )}
                            {!question.isActive && (
                              <Badge variant="secondary">無効</Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium mb-2 line-clamp-2">
                            {question.question}
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {(question.options as string[]).map((option, optIndex) => (
                              <div
                                key={optIndex}
                                className={`text-xs p-2 rounded ${
                                  optIndex === question.correctAnswer
                                    ? 'bg-green-100 text-green-800 border border-green-300'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {optIndex === question.correctAnswer && (
                                  <CheckCircle className="h-3 w-3 inline mr-1" />
                                )}
                                {option}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(question)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteConfirmId(question.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="attempts" className="space-y-4">
            {attempts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <History className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">受験履歴がありません</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-4 text-sm font-medium text-slate-600">受験者</th>
                          <th className="text-left p-4 text-sm font-medium text-slate-600">会員番号</th>
                          <th className="text-center p-4 text-sm font-medium text-slate-600">結果</th>
                          <th className="text-center p-4 text-sm font-medium text-slate-600">スコア</th>
                          <th className="text-center p-4 text-sm font-medium text-slate-600">正解数</th>
                          <th className="text-left p-4 text-sm font-medium text-slate-600">受験日時</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {attempts.map((attempt) => (
                          <tr key={attempt.id} className="hover:bg-slate-50">
                            <td className="p-4">
                              <div>
                                <p className="font-medium">{attempt.user.name}</p>
                                <p className="text-xs text-slate-500">{attempt.user.email}</p>
                              </div>
                            </td>
                            <td className="p-4 text-sm">{attempt.user.memberId}</td>
                            <td className="p-4 text-center">
                              {attempt.isPassed ? (
                                <Badge className="bg-green-100 text-green-800">合格</Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-red-100 text-red-800">
                                  不合格
                                </Badge>
                              )}
                            </td>
                            <td className="p-4 text-center font-medium">
                              {Math.round(attempt.score)}%
                            </td>
                            <td className="p-4 text-center text-sm">
                              {attempt.correctCount} / {attempt.totalQuestions}
                            </td>
                            <td className="p-4 text-sm text-slate-600">
                              {formatDate(new Date(attempt.createdAt))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* 問題編集ダイアログ */}
        <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingQuestion ? '問題を編集' : '問題を追加'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="question">設問 *</Label>
                <Textarea
                  id="question"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="設問を入力してください"
                  rows={3}
                />
              </div>

              <div>
                <Label>選択肢 * （2〜4個）</Label>
                <div className="space-y-2 mt-2">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={formData.correctAnswer === index}
                        onChange={() => setFormData({ ...formData, correctAnswer: index })}
                        className="h-4 w-4"
                      />
                      <Input
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...formData.options]
                          newOptions[index] = e.target.value
                          setFormData({ ...formData, options: newOptions })
                        }}
                        placeholder={`選択肢${index + 1}`}
                      />
                      {formData.correctAnswer === index && (
                        <Badge className="bg-green-100 text-green-800">正解</Badge>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  ラジオボタンで正解の選択肢を選択してください
                </p>
              </div>

              <div>
                <Label htmlFor="explanation">解説（不正解時に表示）</Label>
                <Textarea
                  id="explanation"
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  placeholder="解説を入力してください（任意）"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="category">カテゴリ</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="例: マネロン、個人情報保護"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">有効にする</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowQuestionDialog(false)}
                disabled={isSubmitting}
              >
                キャンセル
              </Button>
              <Button onClick={handleSaveQuestion} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  '保存'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 削除確認ダイアログ */}
        <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>問題を削除</DialogTitle>
            </DialogHeader>
            <p className="text-slate-600">
              この問題を削除してもよろしいですか？この操作は取り消せません。
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmId(null)}
                disabled={isSubmitting}
              >
                キャンセル
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirmId && handleDeleteQuestion(deleteConfirmId)}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    削除中...
                  </>
                ) : (
                  '削除'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}

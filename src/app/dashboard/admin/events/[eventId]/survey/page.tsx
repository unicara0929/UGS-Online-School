'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Loader2,
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Save,
  FileText,
  Eye,
  Download,
  Upload,
  BookTemplate
} from 'lucide-react'
import Link from 'next/link'

interface Question {
  id?: string
  question: string
  type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'MULTI_SELECT' | 'RADIO' | 'RATING'
  options?: string[]
  required: boolean
  description?: string
}

interface Survey {
  id: string
  title: string
  description: string | null
  isActive: boolean
  questions: Question[]
}

interface Event {
  id: string
  title: string
}

interface SurveyTemplate {
  id: string
  name: string
  description: string | null
  questions: Question[]
}

const questionTypeLabels: Record<string, string> = {
  TEXT: '短文テキスト',
  TEXTAREA: '長文テキスト',
  SELECT: '単一選択（ドロップダウン）',
  MULTI_SELECT: '複数選択',
  RADIO: 'ラジオボタン',
  RATING: '5段階評価'
}

function AdminSurveyPageContent({ params }: { params: Promise<{ eventId: string }> }) {
  const router = useRouter()
  const { eventId } = use(params)
  const [event, setEvent] = useState<Event | null>(null)
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // フォームデータ
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])

  // テンプレート関連
  const [templates, setTemplates] = useState<SurveyTemplate[]>([])
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)

  useEffect(() => {
    fetchSurvey()
    fetchTemplates()
  }, [eventId])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/admin/survey-templates', {
        credentials: 'include'
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setTemplates(data.templates)
      }
    } catch (err) {
      console.error('Error fetching templates:', err)
    }
  }

  const fetchSurvey = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/events/${eventId}/survey`, {
        credentials: 'include'
      })
      const data = await response.json()

      if (response.ok && data.success) {
        setEvent(data.event)
        if (data.survey) {
          setSurvey(data.survey)
          setTitle(data.survey.title)
          setDescription(data.survey.description || '')
          setQuestions(data.survey.questions.map((q: Question & { order: number }) => ({
            id: q.id,
            question: q.question,
            type: q.type,
            options: q.options || [],
            required: q.required,
            description: q.description
          })))
        }
      } else {
        setError(data.error || 'データの取得に失敗しました')
      }
    } catch (err) {
      console.error('Error fetching survey:', err)
      setError('データの取得中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question: '',
        type: 'TEXT',
        options: [],
        required: false
      }
    ])
  }

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const updateQuestion = (index: number, field: keyof Question, value: unknown) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  const addOption = (questionIndex: number) => {
    const updated = [...questions]
    const options = updated[questionIndex].options || []
    updated[questionIndex].options = [...options, '']
    setQuestions(updated)
  }

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions]
    const options = [...(updated[questionIndex].options || [])]
    options[optionIndex] = value
    updated[questionIndex].options = options
    setQuestions(updated)
  }

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions]
    const options = (updated[questionIndex].options || []).filter((_, i) => i !== optionIndex)
    updated[questionIndex].options = options
    setQuestions(updated)
  }

  const handleSave = async () => {
    if (!title.trim()) {
      setError('タイトルを入力してください')
      return
    }

    if (questions.length === 0) {
      setError('質問を1つ以上追加してください')
      return
    }

    // バリデーション
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.question.trim()) {
        setError(`質問${i + 1}のテキストを入力してください`)
        return
      }
      if (['SELECT', 'MULTI_SELECT', 'RADIO'].includes(q.type) && (!q.options || q.options.length === 0)) {
        setError(`質問${i + 1}に選択肢を追加してください`)
        return
      }
    }

    try {
      setIsSaving(true)
      setError(null)
      setSuccessMessage(null)

      const method = survey ? 'PUT' : 'POST'
      const response = await fetch(`/api/admin/events/${eventId}/survey`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          description: description || null,
          questions: questions.map(q => ({
            question: q.question,
            type: q.type,
            options: q.options,
            required: q.required,
            description: q.description
          }))
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccessMessage('アンケートを保存しました')
        setSurvey(data.survey)
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        setError(data.error || '保存に失敗しました')
      }
    } catch (err) {
      console.error('Error saving survey:', err)
      setError('保存中にエラーが発生しました')
    } finally {
      setIsSaving(false)
    }
  }

  // テンプレートを読み込む
  const loadTemplate = (template: SurveyTemplate) => {
    setQuestions(template.questions.map(q => ({
      question: q.question,
      type: q.type,
      options: q.options || [],
      required: q.required,
      description: q.description
    })))
    setShowTemplateDialog(false)
    setSuccessMessage(`テンプレート「${template.name}」を読み込みました`)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  // 現在の設問をテンプレートとして保存
  const saveAsTemplate = async () => {
    if (!templateName.trim()) {
      setError('テンプレート名を入力してください')
      return
    }
    if (questions.length === 0) {
      setError('テンプレートとして保存する質問がありません')
      return
    }

    setIsSavingTemplate(true)
    try {
      const response = await fetch('/api/admin/survey-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: templateName.trim(),
          description: templateDescription.trim() || null,
          questions: questions.map(q => ({
            question: q.question,
            type: q.type,
            options: q.options,
            required: q.required,
            description: q.description
          }))
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccessMessage('テンプレートを保存しました')
        setShowSaveTemplateDialog(false)
        setTemplateName('')
        setTemplateDescription('')
        fetchTemplates()
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        setError(data.error || 'テンプレートの保存に失敗しました')
      }
    } catch (err) {
      console.error('Error saving template:', err)
      setError('テンプレートの保存中にエラーが発生しました')
    } finally {
      setIsSavingTemplate(false)
    }
  }

  // テンプレートを削除
  const deleteTemplate = async (templateId: string) => {
    if (!confirm('このテンプレートを削除しますか？')) return

    try {
      const response = await fetch(`/api/admin/survey-templates/${templateId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        setSuccessMessage('テンプレートを削除しました')
        fetchTemplates()
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        setError('テンプレートの削除に失敗しました')
      }
    } catch (err) {
      console.error('Error deleting template:', err)
      setError('テンプレートの削除中にエラーが発生しました')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 min-w-0 md:ml-64">
          <PageHeader title="アンケート設定" />
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

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 min-w-0 md:ml-64">
        <PageHeader title="アンケート設定" />
        <main className="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* ヘッダー */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => router.push(`/dashboard/admin/events/${eventId}`)}
                variant="outline"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
                戻る
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {event?.title} - アンケート設定
                </h1>
                <p className="text-slate-600 text-sm">
                  {survey ? '既存のアンケートを編集' : '新しいアンケートを作成'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* テンプレートボタン */}
              <Button
                variant="outline"
                onClick={() => setShowTemplateDialog(true)}
                disabled={templates.length === 0}
              >
                <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                テンプレート使用
              </Button>
              {questions.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setShowSaveTemplateDialog(true)}
                >
                  <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
                  テンプレート保存
                </Button>
              )}
              {survey && (
                <Link href={`/dashboard/admin/events/${eventId}/survey/responses`}>
                  <Button variant="outline">
                    <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
                    回答を見る
                  </Button>
                </Link>
              )}
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                    保存
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* メッセージ */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4">
                <p role="alert" className="text-red-600">{error}</p>
              </CardContent>
            </Card>
          )}

          {successMessage && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <p className="text-green-600">{successMessage}</p>
              </CardContent>
            </Card>
          )}

          {/* 基本設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" aria-hidden="true" />
                基本設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">アンケートタイトル *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例: 第12回 全体MTGアンケート"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">説明文（任意）</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="アンケートの説明や注意事項など"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* 質問一覧 */}
          <Card>
            <CardHeader>
              <CardTitle>質問一覧</CardTitle>
              <CardDescription>
                質問を追加・編集してください。ドラッグで順序を変更できます。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {questions.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  質問がありません。「質問を追加」ボタンから追加してください。
                </div>
              ) : (
                questions.map((question, index) => (
                  <Card key={index} className="border-slate-200">
                    <CardContent className="pt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-slate-400 cursor-move" aria-hidden="true" />
                          <Badge variant="outline">Q{index + 1}</Badge>
                          <Badge variant="secondary">{questionTypeLabels[question.type]}</Badge>
                          {question.required && <Badge className="bg-red-100 text-red-700">必須</Badge>}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>質問文 *</Label>
                          <Input
                            value={question.question}
                            onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                            placeholder="質問を入力"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>質問タイプ</Label>
                          <Select
                            value={question.type}
                            onValueChange={(value) => updateQuestion(index, 'type', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TEXT">短文テキスト</SelectItem>
                              <SelectItem value="TEXTAREA">長文テキスト</SelectItem>
                              <SelectItem value="SELECT">単一選択（ドロップダウン）</SelectItem>
                              <SelectItem value="MULTI_SELECT">複数選択</SelectItem>
                              <SelectItem value="RADIO">ラジオボタン</SelectItem>
                              <SelectItem value="RATING">5段階評価</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>補足説明（任意）</Label>
                        <Input
                          value={question.description || ''}
                          onChange={(e) => updateQuestion(index, 'description', e.target.value)}
                          placeholder="質問の補足説明"
                        />
                      </div>

                      {/* 選択肢（SELECT, MULTI_SELECT, RADIOの場合） */}
                      {['SELECT', 'MULTI_SELECT', 'RADIO'].includes(question.type) && (
                        <div className="space-y-2">
                          <Label>選択肢</Label>
                          <div className="space-y-2">
                            {(question.options || []).map((option, optIndex) => (
                              <div key={optIndex} className="flex items-center gap-2">
                                <Input
                                  value={option}
                                  onChange={(e) => updateOption(index, optIndex, e.target.value)}
                                  placeholder={`選択肢 ${optIndex + 1}`}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeOption(index, optIndex)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addOption(index)}
                            >
                              <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                              選択肢を追加
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`required-${index}`}
                          checked={question.required}
                          onCheckedChange={(checked) => updateQuestion(index, 'required', checked)}
                        />
                        <Label htmlFor={`required-${index}`} className="text-sm cursor-pointer">
                          この質問を必須にする
                        </Label>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}

              <Button variant="outline" onClick={addQuestion} className="w-full">
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                質問を追加
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* テンプレート選択ダイアログ */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookTemplate className="h-5 w-5" aria-hidden="true" />
              テンプレートを選択
            </DialogTitle>
            <DialogDescription>
              保存済みのテンプレートから質問を読み込みます。現在の質問は置き換えられます。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {templates.length === 0 ? (
              <p className="text-center text-slate-500 py-4">
                保存されているテンプレートがありません
              </p>
            ) : (
              templates.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1" onClick={() => loadTemplate(template)}>
                        <h4 className="font-semibold text-slate-900">{template.name}</h4>
                        {template.description && (
                          <p className="text-sm text-slate-600 mt-1">{template.description}</p>
                        )}
                        <p className="text-xs text-slate-500 mt-2">
                          {template.questions.length}問
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => loadTemplate(template)}
                        >
                          使用する
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTemplate(template.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              キャンセル
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* テンプレート保存ダイアログ */}
      <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" aria-hidden="true" />
              テンプレートとして保存
            </DialogTitle>
            <DialogDescription>
              現在の{questions.length}問の質問をテンプレートとして保存します。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">テンプレート名 *</Label>
              <Input
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="例: 全体MTGアンケート"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateDescription">説明（任意）</Label>
              <Textarea
                id="templateDescription"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="テンプレートの説明"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={saveAsTemplate} disabled={isSavingTemplate}>
              {isSavingTemplate ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AdminSurveyPage({ params }: { params: Promise<{ eventId: string }> }) {
  return (
    <ProtectedRoute requiredRoles={['admin', 'manager']}>
      <AdminSurveyPageContent params={params} />
    </ProtectedRoute>
  )
}

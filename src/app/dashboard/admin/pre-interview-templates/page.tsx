'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, Plus, Edit, Trash2, Eye, CheckCircle, AlertCircle, GripVertical, X } from 'lucide-react'

interface Question {
  id?: string
  order: number
  category: string
  question: string
  description: string
  type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'MULTI_SELECT' | 'CHECKBOX' | 'RADIO' | 'NUMBER'
  options: string[]
  required: boolean
}

interface Template {
  id: string
  name: string
  description: string | null
  isActive: boolean
  version: number
  createdAt: string
  questions: Question[]
  _count: {
    responses: number
  }
}

const questionTypes = [
  { value: 'TEXT', label: '短いテキスト' },
  { value: 'TEXTAREA', label: '長いテキスト' },
  { value: 'SELECT', label: 'ドロップダウン' },
  { value: 'MULTI_SELECT', label: '複数選択' },
  { value: 'CHECKBOX', label: 'チェックボックス（はい/いいえ）' },
  { value: 'RADIO', label: 'ラジオボタン' },
  { value: 'NUMBER', label: '数値' },
]

export default function PreInterviewTemplatesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<Template[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // ダイアログ状態
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

  // フォーム状態
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formQuestions, setFormQuestions] = useState<Question[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/admin/pre-interview-templates')
      const data = await res.json()
      if (data.success) {
        setTemplates(data.templates)
      }
    } catch (err) {
      setError('テンプレートの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormName('')
    setFormDescription('')
    setFormQuestions([])
    setError(null)
  }

  const addQuestion = () => {
    setFormQuestions([
      ...formQuestions,
      {
        order: formQuestions.length + 1,
        category: '',
        question: '',
        description: '',
        type: 'TEXT',
        options: [],
        required: false
      }
    ])
  }

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...formQuestions]
    updated[index] = { ...updated[index], [field]: value }
    setFormQuestions(updated)
  }

  const removeQuestion = (index: number) => {
    const updated = formQuestions.filter((_, i) => i !== index)
    updated.forEach((q, i) => q.order = i + 1)
    setFormQuestions(updated)
  }

  const handleCreate = async () => {
    if (!formName.trim()) {
      setError('テンプレート名を入力してください')
      return
    }
    if (formQuestions.length === 0) {
      setError('質問を1つ以上追加してください')
      return
    }
    if (formQuestions.some(q => !q.question.trim())) {
      setError('すべての質問文を入力してください')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/pre-interview-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDescription || null,
          questions: formQuestions
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '作成に失敗しました')
        return
      }

      setSuccess('テンプレートを作成しました')
      setShowCreateDialog(false)
      resetForm()
      fetchTemplates()
    } catch (err) {
      setError('作成中にエラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  const openEditDialog = (template: Template) => {
    setSelectedTemplate(template)
    setFormName(template.name)
    setFormDescription(template.description || '')
    setFormQuestions(template.questions.map(q => ({
      id: q.id,
      order: q.order,
      category: q.category || '',
      question: q.question,
      description: q.description || '',
      type: q.type,
      options: q.options || [],
      required: q.required
    })))
    setShowEditDialog(true)
  }

  const handleUpdate = async () => {
    if (!selectedTemplate) return
    if (!formName.trim()) {
      setError('テンプレート名を入力してください')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/pre-interview-templates/${selectedTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDescription || null,
          questions: formQuestions
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '更新に失敗しました')
        return
      }

      setSuccess('テンプレートを更新しました')
      setShowEditDialog(false)
      resetForm()
      setSelectedTemplate(null)
      fetchTemplates()
    } catch (err) {
      setError('更新中にエラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (template: Template) => {
    try {
      const res = await fetch(`/api/admin/pre-interview-templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !template.isActive })
      })

      if (res.ok) {
        setSuccess(template.isActive ? 'テンプレートを無効化しました' : 'テンプレートを有効化しました')
        fetchTemplates()
      }
    } catch (err) {
      setError('ステータスの変更に失敗しました')
    }
  }

  const handleDelete = async () => {
    if (!selectedTemplate) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/pre-interview-templates/${selectedTemplate.id}`, {
        method: 'DELETE'
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '削除に失敗しました')
        return
      }

      setSuccess('テンプレートを削除しました')
      setShowDeleteDialog(false)
      setSelectedTemplate(null)
      fetchTemplates()
    } catch (err) {
      setError('削除中にエラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  const QuestionEditor = () => (
    <div className="space-y-4 max-h-[400px] overflow-y-auto">
      {formQuestions.map((q, index) => (
        <div key={index} className="border rounded-lg p-4 space-y-3 bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">質問 {index + 1}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeQuestion(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">カテゴリ</Label>
              <Input
                value={q.category}
                onChange={(e) => updateQuestion(index, 'category', e.target.value)}
                placeholder="例: 投資経験"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">質問タイプ</Label>
              <Select
                value={q.type}
                onValueChange={(v) => updateQuestion(index, 'type', v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {questionTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">質問文 *</Label>
            <Input
              value={q.question}
              onChange={(e) => updateQuestion(index, 'question', e.target.value)}
              placeholder="質問を入力..."
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">補足説明</Label>
            <Input
              value={q.description}
              onChange={(e) => updateQuestion(index, 'description', e.target.value)}
              placeholder="補足説明（任意）"
              className="mt-1"
            />
          </div>

          {['SELECT', 'MULTI_SELECT', 'RADIO'].includes(q.type) && (
            <div>
              <Label className="text-xs">選択肢（1行に1つ）</Label>
              <Textarea
                value={q.options.join('\n')}
                onChange={(e) => updateQuestion(index, 'options', e.target.value.split('\n').filter(o => o.trim()))}
                placeholder="選択肢1&#10;選択肢2&#10;選択肢3"
                rows={3}
                className="mt-1"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch
              checked={q.required}
              onCheckedChange={(v) => updateQuestion(index, 'required', v)}
            />
            <Label className="text-xs">必須項目</Label>
          </div>
        </div>
      ))}

      <Button
        variant="outline"
        onClick={addQuestion}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        質問を追加
      </Button>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">事前アンケートテンプレート管理</h1>
          <p className="text-muted-foreground">LP面談前の事前アンケートテンプレートを管理します</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateDialog(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          新規作成
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>テンプレート名</TableHead>
                <TableHead>質問数</TableHead>
                <TableHead>回答数</TableHead>
                <TableHead>バージョン</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    テンプレートがありません
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{template.name}</p>
                        {template.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {template.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{template.questions.length}問</TableCell>
                    <TableCell>{template._count.responses}件</TableCell>
                    <TableCell>v{template.version}</TableCell>
                    <TableCell>
                      <Badge variant={template.isActive ? 'default' : 'secondary'}>
                        {template.isActive ? '有効' : '無効'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(template)}
                        >
                          {template.isActive ? '無効化' : '有効化'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTemplate(template)
                            setShowDeleteDialog(true)
                          }}
                          disabled={template._count.responses > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 作成ダイアログ */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新規テンプレート作成</DialogTitle>
            <DialogDescription>
              LP面談前の事前アンケートテンプレートを作成します
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>テンプレート名 *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="例: LP面談事前アンケート"
                className="mt-1"
              />
            </div>

            <div>
              <Label>説明</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="テンプレートの説明（任意）"
                rows={2}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="mb-2 block">質問項目</Label>
              <QuestionEditor />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              作成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編集ダイアログ */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>テンプレート編集</DialogTitle>
            <DialogDescription>
              テンプレートの内容を編集します
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>テンプレート名 *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="例: LP面談事前アンケート"
                className="mt-1"
              />
            </div>

            <div>
              <Label>説明</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="テンプレートの説明（任意）"
                rows={2}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="mb-2 block">質問項目</Label>
              <QuestionEditor />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>テンプレートの削除</DialogTitle>
            <DialogDescription>
              「{selectedTemplate?.name}」を削除しますか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

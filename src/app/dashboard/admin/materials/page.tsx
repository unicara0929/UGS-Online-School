'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  Upload,
  X,
  Download,
  Loader2,
  Save
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Material {
  id: string
  title: string
  description: string
  fileUrl: string
  fileName: string
  fileSize: string
  fileType: string
  category: string
  viewableRoles: string[]
  createdAt: string
  updatedAt: string
}

const ROLE_OPTIONS = [
  { value: 'member', label: 'UGS会員' },
  { value: 'fp', label: 'FPエイド' },
  { value: 'manager', label: 'マネージャー' },
  { value: 'admin', label: '管理者' },
]

const CATEGORY_OPTIONS = [
  { value: 'general', label: '一般' },
  { value: 'training', label: '研修資料' },
  { value: 'manual', label: 'マニュアル' },
  { value: 'template', label: 'テンプレート' },
  { value: 'other', label: 'その他' },
]

const getRoleLabel = (role: string) => {
  const labels: Record<string, string> = {
    member: 'UGS会員',
    fp: 'FPエイド',
    manager: 'マネージャー',
    admin: '管理者',
  }
  return labels[role] || role
}

const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    general: '一般',
    training: '研修資料',
    manual: 'マニュアル',
    template: 'テンプレート',
    other: 'その他',
  }
  return labels[category] || category
}

const formatFileSize = (bytes: string | number) => {
  const size = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes
  if (isNaN(size)) return bytes
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export default function AdminMaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // フォーム状態
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    fileUrl: '',
    fileName: '',
    fileSize: '',
    fileType: '',
    category: 'general',
    viewableRoles: ['member', 'fp', 'manager', 'admin'] as string[],
  })

  useEffect(() => {
    fetchMaterials()
  }, [])

  const fetchMaterials = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/materials', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('資料一覧の取得に失敗しました')
      }

      const data = await response.json()
      setMaterials(data.materials || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (material?: Material) => {
    if (material) {
      setEditingMaterial(material)
      setFormData({
        title: material.title,
        description: material.description,
        fileUrl: material.fileUrl,
        fileName: material.fileName,
        fileSize: material.fileSize,
        fileType: material.fileType,
        category: material.category || 'general',
        viewableRoles: material.viewableRoles,
      })
    } else {
      setEditingMaterial(null)
      setFormData({
        title: '',
        description: '',
        fileUrl: '',
        fileName: '',
        fileSize: '',
        fileType: '',
        category: 'general',
        viewableRoles: ['member', 'fp', 'manager', 'admin'],
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingMaterial(null)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)

      const response = await fetch('/api/admin/materials/upload', {
        method: 'POST',
        credentials: 'include',
        body: formDataUpload,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'ファイルのアップロードに失敗しました')
      }

      const data = await response.json()
      setFormData(prev => ({
        ...prev,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileType: data.fileType,
      }))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ファイルのアップロードに失敗しました')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSave = async () => {
    if (!formData.title) {
      alert('タイトルを入力してください')
      return
    }

    if (formData.viewableRoles.length === 0) {
      alert('閲覧可能ロールを少なくとも1つ選択してください')
      return
    }

    setSaving(true)
    try {
      const url = editingMaterial
        ? `/api/admin/materials/${editingMaterial.id}`
        : '/api/admin/materials'

      const response = await fetch(url, {
        method: editingMaterial ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '資料の保存に失敗しました')
      }

      await fetchMaterials()
      handleCloseDialog()
      alert(editingMaterial ? '資料を更新しました' : '資料を作成しました')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (materialId: string, title: string) => {
    if (!confirm(`資料「${title}」を削除してもよろしいですか？`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/materials/${materialId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '資料の削除に失敗しました')
      }

      alert('資料を削除しました')
      fetchMaterials()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました')
    }
  }

  const toggleRole = (role: string) => {
    setFormData(prev => ({
      ...prev,
      viewableRoles: prev.viewableRoles.includes(role)
        ? prev.viewableRoles.filter(r => r !== role)
        : [...prev.viewableRoles, role]
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <FileText className="h-10 w-10 text-white animate-pulse" />
            </div>
            <div className="absolute inset-0 w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto animate-ping opacity-20"></div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">資料一覧を読み込み中...</h2>
          <p className="text-slate-600">データを取得しています</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        <Card className="max-w-2xl mx-auto border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto p-6 space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">資料コンテンツ管理</h1>
            <p className="text-slate-600">資料をアップロード・管理します</p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            新規資料追加
          </Button>
        </div>

        {/* 資料一覧 */}
        {materials.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 mb-4">まだ資料が登録されていません</p>
              <Button onClick={() => handleOpenDialog()} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                最初の資料を追加
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {materials.map((material) => (
              <Card key={material.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start space-x-4 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-slate-900 mb-1">{material.title}</h3>
                          {material.description && (
                            <p className="text-slate-600 mb-2">{material.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            {material.category && (
                              <Badge variant="outline">
                                {getCategoryLabel(material.category)}
                              </Badge>
                            )}
                            {material.fileName && (
                              <span className="text-slate-500">
                                {material.fileName}
                                {material.fileSize && ` (${formatFileSize(material.fileSize)})`}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {material.viewableRoles.map(role => (
                              <Badge key={role} variant="secondary" className="text-xs">
                                {getRoleLabel(role)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* アクションボタン */}
                    <div className="flex items-center space-x-2 ml-4">
                      {material.fileUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(material.fileUrl, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          ダウンロード
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(material)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        編集
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(material.id, material.title)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        削除
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 資料追加/編集ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMaterial ? '資料を編集' : '新規資料を追加'}
            </DialogTitle>
            <DialogDescription>
              資料の情報を入力してください
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* タイトル */}
            <div className="space-y-2">
              <Label htmlFor="title">タイトル *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="資料のタイトル"
              />
            </div>

            {/* 説明 */}
            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="資料の説明（任意）"
                rows={3}
              />
            </div>

            {/* カテゴリ */}
            <div className="space-y-2">
              <Label htmlFor="category">カテゴリ</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="カテゴリを選択" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ファイルアップロード */}
            <div className="space-y-2">
              <Label>ファイル</Label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      アップロード中...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      ファイルを選択
                    </>
                  )}
                </Button>
                {formData.fileName && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <FileText className="h-4 w-4" />
                    <span>{formData.fileName}</span>
                    {formData.fileSize && (
                      <span className="text-slate-400">({formatFileSize(formData.fileSize)})</span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        fileUrl: '',
                        fileName: '',
                        fileSize: '',
                        fileType: '',
                      }))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* 閲覧可能ロール */}
            <div className="space-y-2">
              <Label>閲覧可能ロール *</Label>
              <div className="flex flex-wrap gap-4">
                {ROLE_OPTIONS.map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`role-${option.value}`}
                      checked={formData.viewableRoles.includes(option.value)}
                      onCheckedChange={() => toggleRole(option.value)}
                    />
                    <Label
                      htmlFor={`role-${option.value}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingMaterial ? '更新' : '作成'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

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
  Save,
  Folder,
  FolderPlus,
  ChevronRight,
  Home,
  MoreVertical,
  FolderOpen,
  FolderInput
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Material {
  id: string
  title: string
  description: string
  fileUrl: string
  fileName: string
  fileSize: string
  fileType: string
  category: string
  folderId: string | null
  viewableRoles: string[]
  createdAt: string
  updatedAt: string
}

interface MaterialFolder {
  id: string
  name: string
  parentId: string | null
  childCount: number
  materialCount: number
  createdAt: string
  updatedAt: string
}

interface Breadcrumb {
  id: string
  name: string
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
  const [folders, setFolders] = useState<MaterialFolder[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [editingFolder, setEditingFolder] = useState<MaterialFolder | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 移動ダイアログ用
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false)
  const [movingMaterial, setMovingMaterial] = useState<Material | null>(null)
  const [allFolders, setAllFolders] = useState<MaterialFolder[]>([])
  const [selectedMoveFolder, setSelectedMoveFolder] = useState<string>('root')

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

  const [folderName, setFolderName] = useState('')

  useEffect(() => {
    fetchData()
  }, [currentFolderId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const folderParam = currentFolderId ? `?folderId=${currentFolderId}` : ''
      const parentParam = currentFolderId ? `?parentId=${currentFolderId}` : ''

      const [materialsRes, foldersRes] = await Promise.all([
        fetch(`/api/admin/materials${folderParam}`, { credentials: 'include' }),
        fetch(`/api/admin/material-folders${parentParam}`, { credentials: 'include' }),
      ])

      if (!materialsRes.ok || !foldersRes.ok) {
        throw new Error('データの取得に失敗しました')
      }

      const [materialsData, foldersData] = await Promise.all([
        materialsRes.json(),
        foldersRes.json(),
      ])

      setMaterials(materialsData.materials || [])
      setFolders(foldersData.folders || [])

      // パンくずリストを取得
      if (currentFolderId) {
        const breadcrumbRes = await fetch(`/api/admin/material-folders/${currentFolderId}`, {
          credentials: 'include',
        })
        if (breadcrumbRes.ok) {
          const breadcrumbData = await breadcrumbRes.json()
          setBreadcrumbs(breadcrumbData.breadcrumbs || [])
        }
      } else {
        setBreadcrumbs([])
      }
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

  const handleOpenFolderDialog = (folder?: MaterialFolder) => {
    if (folder) {
      setEditingFolder(folder)
      setFolderName(folder.name)
    } else {
      setEditingFolder(null)
      setFolderName('')
    }
    setIsFolderDialogOpen(true)
  }

  const handleCloseFolderDialog = () => {
    setIsFolderDialogOpen(false)
    setEditingFolder(null)
    setFolderName('')
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // ファイルサイズチェック（50MB上限）
    const MAX_FILE_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      alert('ファイルサイズが大きすぎます（上限: 50MB）')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setUploading(true)
    try {
      // 1. 署名付きURLを取得
      const urlResponse = await fetch('/api/admin/materials/upload-url', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      })

      if (!urlResponse.ok) {
        const data = await urlResponse.json()
        throw new Error(data.error || 'アップロードURLの取得に失敗しました')
      }

      const urlData = await urlResponse.json()

      // 2. 署名付きURLを使って直接Supabaseにアップロード
      const uploadResponse = await fetch(urlData.signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      })

      if (!uploadResponse.ok) {
        throw new Error('ファイルのアップロードに失敗しました')
      }

      // ファイルサイズを計算（MBまたはKB）
      let fileSizeStr = ''
      if (file.size >= 1024 * 1024) {
        fileSizeStr = `${(file.size / (1024 * 1024)).toFixed(2)}MB`
      } else if (file.size >= 1024) {
        fileSizeStr = `${(file.size / 1024).toFixed(2)}KB`
      } else {
        fileSizeStr = `${file.size}B`
      }

      // ファイルタイプを取得（拡張子から）
      const fileExtension = file.name.split('.').pop()?.toUpperCase() || 'FILE'

      setFormData(prev => ({
        ...prev,
        fileUrl: urlData.publicUrl,
        fileName: file.name,
        fileSize: fileSizeStr,
        fileType: fileExtension,
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
        method: editingMaterial ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          folderId: currentFolderId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '資料の保存に失敗しました')
      }

      await fetchData()
      handleCloseDialog()
      alert(editingMaterial ? '資料を更新しました' : '資料を作成しました')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveFolder = async () => {
    if (!folderName.trim()) {
      alert('フォルダ名を入力してください')
      return
    }

    setSaving(true)
    try {
      const url = editingFolder
        ? `/api/admin/material-folders/${editingFolder.id}`
        : '/api/admin/material-folders'

      const response = await fetch(url, {
        method: editingFolder ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: folderName.trim(),
          parentId: currentFolderId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'フォルダの保存に失敗しました')
      }

      await fetchData()
      handleCloseFolderDialog()
      alert(editingFolder ? 'フォルダを更新しました' : 'フォルダを作成しました')
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
      fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました')
    }
  }

  const handleDeleteFolder = async (folderId: string, name: string) => {
    if (!confirm(`フォルダ「${name}」を削除してもよろしいですか？\n※フォルダ内の資料はルートに移動されます`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/material-folders/${folderId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'フォルダの削除に失敗しました')
      }

      alert('フォルダを削除しました')
      fetchData()
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

  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId)
  }

  // 全フォルダを再帰的に取得
  const fetchAllFolders = async (parentId: string | null = null, prefix: string = ''): Promise<MaterialFolder[]> => {
    const param = parentId ? `?parentId=${parentId}` : ''
    const res = await fetch(`/api/admin/material-folders${param}`, { credentials: 'include' })
    if (!res.ok) return []
    const data = await res.json()
    const folders = data.folders || []

    const result: MaterialFolder[] = []
    for (const folder of folders) {
      result.push({ ...folder, name: prefix + folder.name })
      const children = await fetchAllFolders(folder.id, prefix + folder.name + ' / ')
      result.push(...children)
    }
    return result
  }

  // 移動ダイアログを開く
  const handleOpenMoveDialog = async (material: Material) => {
    setMovingMaterial(material)
    setSelectedMoveFolder(material.folderId || 'root')

    // 全フォルダを取得
    const folders = await fetchAllFolders()
    setAllFolders(folders)
    setIsMoveDialogOpen(true)
  }

  // 資料を移動
  const handleMove = async () => {
    if (!movingMaterial) return

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/materials/${movingMaterial.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          folderId: selectedMoveFolder === 'root' ? null : selectedMoveFolder,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '移動に失敗しました')
      }

      await fetchData()
      setIsMoveDialogOpen(false)
      setMovingMaterial(null)
      alert('資料を移動しました')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <FileText className="h-10 w-10 text-white animate-pulse" aria-hidden="true" />
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
              <AlertCircle className="h-5 w-5 text-red-600" aria-hidden="true" />
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
            <p className="text-slate-600">資料をフォルダで整理・管理します</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => handleOpenFolderDialog()}
              variant="outline"
            >
              <FolderPlus className="h-4 w-4 mr-2" aria-hidden="true" />
              フォルダ作成
            </Button>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              資料追加
            </Button>
          </div>
        </div>

        {/* パンくずリスト */}
        <div className="flex items-center gap-1 text-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateToFolder(null)}
            className={`p-1 h-auto ${!currentFolderId ? 'text-blue-600 font-medium' : 'text-slate-600'}`}
          >
            <Home className="h-4 w-4 mr-1" aria-hidden="true" />
            ルート
          </Button>
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.id} className="flex items-center">
              <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateToFolder(crumb.id)}
                className={`p-1 h-auto ${index === breadcrumbs.length - 1 ? 'text-blue-600 font-medium' : 'text-slate-600'}`}
              >
                {crumb.name}
              </Button>
            </div>
          ))}
        </div>

        {/* フォルダ・資料一覧 */}
        <Card>
          <CardContent className="p-0">
            {folders.length === 0 && materials.length === 0 ? (
              <div className="p-12 text-center">
                <FolderOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" aria-hidden="true" />
                <p className="text-slate-600 mb-4">このフォルダは空です</p>
                <div className="flex justify-center gap-2">
                  <Button onClick={() => handleOpenFolderDialog()} variant="outline">
                    <FolderPlus className="h-4 w-4 mr-2" aria-hidden="true" />
                    フォルダを作成
                  </Button>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                    資料を追加
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {/* フォルダ一覧 */}
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex items-center px-4 py-3 hover:bg-slate-50 transition-colors group"
                  >
                    <button
                      onClick={() => navigateToFolder(folder.id)}
                      className="flex items-center flex-1 text-left"
                    >
                      <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                        <Folder className="h-5 w-5 text-amber-600" aria-hidden="true" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-900">{folder.name}</h3>
                        <p className="text-sm text-slate-500">
                          {folder.childCount > 0 && `${folder.childCount}個のフォルダ`}
                          {folder.childCount > 0 && folder.materialCount > 0 && '、'}
                          {folder.materialCount > 0 && `${folder.materialCount}個の資料`}
                          {folder.childCount === 0 && folder.materialCount === 0 && '空のフォルダ'}
                        </p>
                      </div>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                          <MoreVertical className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenFolderDialog(folder)}>
                          <Edit className="h-4 w-4 mr-2" aria-hidden="true" />
                          名前を変更
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteFolder(folder.id, folder.name)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                          削除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}

                {/* 資料一覧 */}
                {materials.map((material) => (
                  <div
                    key={material.id}
                    className="flex items-center px-4 py-3 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <FileText className="h-5 w-5 text-blue-600" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-900 truncate">{material.title}</h3>
                        {material.category && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            {getCategoryLabel(material.category)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        {material.fileName && (
                          <span className="truncate">
                            {material.fileName}
                            {material.fileSize && ` (${formatFileSize(material.fileSize)})`}
                          </span>
                        )}
                        <span className="shrink-0">
                          {material.viewableRoles.map(r => getRoleLabel(r)).join(', ')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {material.fileUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(material.fileUrl, '_blank')}
                          className="opacity-0 group-hover:opacity-100"
                        >
                          <Download className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                            <MoreVertical className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(material)}>
                            <Edit className="h-4 w-4 mr-2" aria-hidden="true" />
                            編集
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenMoveDialog(material)}>
                            <FolderInput className="h-4 w-4 mr-2" aria-hidden="true" />
                            フォルダに移動
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(material.id, material.title)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                            削除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                      アップロード中...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
                      ファイルを選択
                    </>
                  )}
                </Button>
                {formData.fileName && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <FileText className="h-4 w-4" aria-hidden="true" />
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
                      <X className="h-4 w-4" aria-hidden="true" />
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
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                  {editingMaterial ? '更新' : '作成'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* フォルダ作成/編集ダイアログ */}
      <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFolder ? 'フォルダ名を変更' : '新規フォルダを作成'}
            </DialogTitle>
            <DialogDescription>
              フォルダ名を入力してください
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="folderName">フォルダ名 *</Label>
              <Input
                id="folderName"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="フォルダ名"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseFolderDialog}>
              キャンセル
            </Button>
            <Button onClick={handleSaveFolder} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                  {editingFolder ? '更新' : '作成'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 資料移動ダイアログ */}
      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>資料を移動</DialogTitle>
            <DialogDescription>
              「{movingMaterial?.title}」の移動先フォルダを選択してください
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-2">
              <Label>移動先フォルダ</Label>
              <Select
                value={selectedMoveFolder}
                onValueChange={setSelectedMoveFolder}
              >
                <SelectTrigger>
                  <SelectValue placeholder="フォルダを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">
                    <div className="flex items-center">
                      <Home className="h-4 w-4 mr-2" aria-hidden="true" />
                      ルート
                    </div>
                  </SelectItem>
                  {allFolders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <div className="flex items-center">
                        <Folder className="h-4 w-4 mr-2 text-amber-600" aria-hidden="true" />
                        {folder.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMoveDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleMove} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  移動中...
                </>
              ) : (
                <>
                  <FolderInput className="h-4 w-4 mr-2" aria-hidden="true" />
                  移動
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

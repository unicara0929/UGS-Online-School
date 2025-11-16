'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut, FileText, Download, Plus, Edit, Trash2, Loader2, Upload } from "lucide-react"

type Material = {
  id: string
  title: string
  description: string
  fileUrl: string
  fileName: string
  fileSize: string
  fileType: string
  viewableRoles: ('admin' | 'manager' | 'fp' | 'member')[]
  createdAt: string
  updatedAt: string
}

function MaterialsPageContent() {
  const { user, logout } = useAuth()
  const [materials, setMaterials] = useState<Material[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)

  const [materialForm, setMaterialForm] = useState({
    title: '',
    description: '',
    fileUrl: '',
    fileName: '',
    fileSize: '',
    fileType: '',
    viewableRoles: [] as ('admin' | 'manager' | 'fp' | 'member')[],
  })
  const [uploadingFile, setUploadingFile] = useState(false)

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    fetchMaterials()
  }, [])

  const fetchMaterials = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const endpoint = isAdmin ? '/api/admin/materials' : '/api/materials'
      const response = await fetch(endpoint, {
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '資料の取得に失敗しました')
      }

      setMaterials(data.materials)
    } catch (err) {
      console.error('Failed to fetch materials:', err)
      setError(err instanceof Error ? err.message : '資料の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/materials/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'ファイルのアップロードに失敗しました')
      }

      // フォームに自動的にファイル情報を設定
      setMaterialForm((prev) => ({
        ...prev,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileType: data.fileType,
      }))

      alert('ファイルのアップロードが完了しました')
    } catch (err) {
      console.error('Failed to upload file:', err)
      alert(err instanceof Error ? err.message : 'ファイルのアップロードに失敗しました')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleCreateMaterial = async () => {
    if (!materialForm.title) {
      alert('タイトルは必須です')
      return
    }

    if (materialForm.viewableRoles.length === 0) {
      alert('閲覧可能ロールを少なくとも1つ選択してください')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/admin/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(materialForm),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '資料の作成に失敗しました')
      }

      setMaterials((prev) => [data.material, ...prev])
      setMaterialForm({
        title: '',
        description: '',
        fileUrl: '',
        fileName: '',
        fileSize: '',
        fileType: '',
        viewableRoles: [],
      })
      setShowCreateForm(false)
    } catch (err) {
      console.error('Failed to create material:', err)
      alert(err instanceof Error ? err.message : '資料の作成に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateMaterial = async () => {
    if (!editingMaterial) return

    if (!materialForm.title) {
      alert('タイトルは必須です')
      return
    }

    if (materialForm.viewableRoles.length === 0) {
      alert('閲覧可能ロールを少なくとも1つ選択してください')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/materials/${editingMaterial.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(materialForm),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '資料の更新に失敗しました')
      }

      setMaterials((prev) =>
        prev.map((m) => (m.id === editingMaterial.id ? data.material : m))
      )
      setMaterialForm({
        title: '',
        description: '',
        fileUrl: '',
        fileName: '',
        fileSize: '',
        fileType: '',
        viewableRoles: [],
      })
      setEditingMaterial(null)
    } catch (err) {
      console.error('Failed to update material:', err)
      alert(err instanceof Error ? err.message : '資料の更新に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm('この資料を削除しますか？')) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/materials/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '資料の削除に失敗しました')
      }

      setMaterials((prev) => prev.filter((m) => m.id !== id))
    } catch (err) {
      console.error('Failed to delete material:', err)
      alert(err instanceof Error ? err.message : '資料の削除に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStartEdit = (material: Material) => {
    setEditingMaterial(material)
    setMaterialForm({
      title: material.title,
      description: material.description,
      fileUrl: material.fileUrl,
      fileName: material.fileName,
      fileSize: material.fileSize,
      fileType: material.fileType,
      viewableRoles: material.viewableRoles,
    })
  }

  const handleCancelEdit = () => {
    setEditingMaterial(null)
    setMaterialForm({
      title: '',
      description: '',
      fileUrl: '',
      fileName: '',
      fileSize: '',
      fileType: '',
      viewableRoles: [],
    })
  }

  const getViewableRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return '管理者'
      case 'manager':
        return 'マネージャー'
      case 'fp':
        return 'FPエイド'
      case 'member':
        return 'UGS会員'
      default:
        return role
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* サイドバー */}
      <Sidebar />

      {/* メインコンテンツ */}
      <div className="flex-1 md:ml-64">
        {/* ヘッダー */}
        <header className="bg-white shadow-lg border-b border-slate-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-slate-900">資料コンテンツ</h1>
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

        {/* メインコンテンツエリア */}
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-slate-600">
                PDFやマニュアルなどの資料をダウンロードできます。
              </p>
              {isAdmin && (
                <Button
                  onClick={() => {
                    setShowCreateForm(true)
                    handleCancelEdit()
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  新規アップロード
                </Button>
              )}
            </div>

            {error && (
              <Card className="border-red-200 bg-red-50 mb-6">
                <CardContent className="py-4">
                  <p className="text-sm text-red-600">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* 新規作成/編集フォーム */}
            {(showCreateForm || editingMaterial) && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>
                    {editingMaterial ? '資料を編集' : '新規資料をアップロード'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        タイトル <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={materialForm.title}
                        onChange={(e) =>
                          setMaterialForm({ ...materialForm, title: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        placeholder="資料のタイトル"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        説明
                      </label>
                      <textarea
                        value={materialForm.description}
                        onChange={(e) =>
                          setMaterialForm({ ...materialForm, description: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        rows={3}
                        placeholder="資料の説明"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        ファイル
                      </label>
                      <div className="space-y-2">
                        <input
                          type="file"
                          id="file-upload"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              handleFileUpload(file)
                            }
                          }}
                          disabled={uploadingFile}
                        />
                        <label
                          htmlFor="file-upload"
                          className={`flex items-center justify-center px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-slate-400 transition-colors ${
                            uploadingFile ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {uploadingFile ? (
                            <span className="flex items-center text-slate-600">
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              アップロード中...
                            </span>
                          ) : (
                            <span className="flex items-center text-slate-600">
                              <Upload className="h-4 w-4 mr-2" />
                              ファイルを選択
                            </span>
                          )}
                        </label>
                        {materialForm.fileName && (
                          <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                            <div className="flex items-center text-sm text-slate-600">
                              <FileText className="h-4 w-4 mr-2" />
                              <span>{materialForm.fileName}</span>
                              {materialForm.fileSize && (
                                <span className="ml-2 text-slate-400">({materialForm.fileSize})</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        閲覧可能ロール <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-2">
                        {[
                          { value: 'admin' as const, label: '管理者' },
                          { value: 'manager' as const, label: 'マネージャー' },
                          { value: 'fp' as const, label: 'FPエイド' },
                          { value: 'member' as const, label: 'UGS会員' },
                        ].map((role) => (
                          <label key={role.value} className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={materialForm.viewableRoles.includes(role.value)}
                              onChange={(e) => {
                                const roles = e.target.checked
                                  ? [...materialForm.viewableRoles, role.value]
                                  : materialForm.viewableRoles.filter((r) => r !== role.value)
                                setMaterialForm({ ...materialForm, viewableRoles: roles })
                              }}
                              className="w-4 h-4 text-slate-600 bg-slate-100 border-slate-300 rounded focus:ring-slate-500 focus:ring-2"
                            />
                            <span className="ml-2 text-sm text-slate-700">{role.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={editingMaterial ? handleUpdateMaterial : handleCreateMaterial}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          処理中...
                        </span>
                      ) : editingMaterial ? (
                        '更新'
                      ) : (
                        '作成'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false)
                        handleCancelEdit()
                      }}
                    >
                      キャンセル
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 資料一覧 */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center text-slate-500">
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  読み込み中です
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {materials.map((material) => (
                  <Card key={material.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2 flex-1">
                          <FileText className="h-5 w-5 text-slate-600" />
                          <CardTitle className="text-lg">{material.title}</CardTitle>
                        </div>
                        {isAdmin && (
                          <div className="flex items-center space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStartEdit(material)}
                              disabled={isSubmitting}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteMaterial(material.id)}
                              disabled={isSubmitting}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <CardDescription className="mt-2">
                        {material.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-1">
                          {material.viewableRoles.map((role) => (
                            <span
                              key={role}
                              className="inline-block px-2 py-1 bg-slate-100 rounded text-xs text-slate-600"
                            >
                              {getViewableRoleLabel(role)}
                            </span>
                          ))}
                        </div>
                        {material.fileType && material.fileSize && (
                          <div className="text-sm text-slate-500">
                            <span>
                              {material.fileType} • {material.fileSize}
                            </span>
                          </div>
                        )}
                        {material.fileUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              window.open(material.fileUrl, '_blank')
                            }}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            ダウンロード
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!isLoading && materials.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">資料がありません</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function MaterialsPage() {
  return (
    <ProtectedRoute>
      <MaterialsPageContent />
    </ProtectedRoute>
  )
}

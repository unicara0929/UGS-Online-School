'use client'

import { useState, useEffect, useRef } from 'react'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { PageHeader } from "@/components/dashboard/page-header"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, Loader2, Sparkles, Folder, FolderOpen, Home, ChevronRight } from "lucide-react"
import { useNewBadge } from "@/hooks/use-new-badge"

type Material = {
  id: string
  title: string
  description: string
  fileUrl: string
  fileName: string
  fileSize: string
  fileType: string
  folderId: string | null
  viewableRoles: ('admin' | 'manager' | 'fp' | 'member')[]
  createdAt: string
  updatedAt: string
  isNew?: boolean
}

type MaterialFolder = {
  id: string
  name: string
  parentId: string | null
  childCount: number
  materialCount: number
}

type Breadcrumb = {
  id: string
  name: string
}

function MaterialsPageContent() {
  const { user } = useAuth()
  const [materials, setMaterials] = useState<Material[]>([])
  const [folders, setFolders] = useState<MaterialFolder[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { markCategoryViewed } = useNewBadge()
  const hasMarkedViewed = useRef(false)

  // ページを開いたときにカテゴリを閲覧済みとしてマーク
  useEffect(() => {
    if (!hasMarkedViewed.current) {
      markCategoryViewed('MATERIALS')
      hasMarkedViewed.current = true
    }
  }, [markCategoryViewed])

  useEffect(() => {
    fetchData()
  }, [currentFolderId])

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const folderParam = currentFolderId ? `?folderId=${currentFolderId}` : ''
      const parentParam = currentFolderId ? `?parentId=${currentFolderId}` : ''

      const [materialsRes, foldersRes] = await Promise.all([
        fetch(`/api/materials${folderParam}`, { credentials: 'include' }),
        fetch(`/api/material-folders${parentParam}`, { credentials: 'include' }),
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
        const breadcrumbRes = await fetch(`/api/material-folders/${currentFolderId}`, {
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
      console.error('Failed to fetch data:', err)
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId)
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
        <PageHeader title="資料コンテンツ" />

        {/* メインコンテンツエリア */}
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <p className="text-slate-600">
                PDFやマニュアルなどの資料をダウンロードできます。
              </p>
            </div>

            {error && (
              <Card className="border-red-200 bg-red-50 mb-6">
                <CardContent className="py-4">
                  <p className="text-sm text-red-600">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* パンくずリスト */}
            <div className="flex items-center gap-1 text-sm mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateToFolder(null)}
                className={`p-1 h-auto ${!currentFolderId ? 'text-blue-600 font-medium' : 'text-slate-600'}`}
              >
                <Home className="h-4 w-4 mr-1" />
                すべて
              </Button>
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.id} className="flex items-center">
                  <ChevronRight className="h-4 w-4 text-slate-400" />
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
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center text-slate-500">
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  読み込み中です
                </div>
              </div>
            ) : folders.length === 0 && materials.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">資料がありません</p>
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {/* フォルダ一覧 */}
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => navigateToFolder(folder.id)}
                        className="flex items-center w-full px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                          <Folder className="h-5 w-5 text-amber-600" />
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
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                      </button>
                    ))}

                    {/* 資料一覧 */}
                    {materials.map((material) => (
                      <div
                        key={material.id}
                        className="flex items-start sm:items-center px-4 py-3 hover:bg-slate-50 transition-colors gap-3"
                      >
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {material.isNew && (
                              <Badge className="bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0 text-xs">
                                <Sparkles className="h-3 w-3 mr-1" />
                                NEW
                              </Badge>
                            )}
                            <h3 className="font-medium text-slate-900 break-words">{material.title}</h3>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            {material.fileName && (
                              <span className="truncate">
                                {material.fileType && `${material.fileType} • `}
                                {material.fileSize}
                              </span>
                            )}
                          </div>
                          {material.description && (
                            <p className="text-sm text-slate-500 mt-1 line-clamp-2 sm:line-clamp-1">{material.description}</p>
                          )}
                          {/* モバイル用ダウンロードボタン */}
                          {material.fileUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(material.fileUrl, '_blank')}
                              className="mt-2 sm:hidden"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              ダウンロード
                            </Button>
                          )}
                        </div>
                        {/* デスクトップ用ダウンロードボタン */}
                        {material.fileUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(material.fileUrl, '_blank')}
                            className="hidden sm:flex shrink-0"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            ダウンロード
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
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

'use client'

import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut, FileText, Download } from "lucide-react"

function MaterialsPageContent() {
  const { user, logout } = useAuth()

  // モックデータ：資料コンテンツ
  const materials = [
    {
      id: '1',
      title: 'UGSオンラインスクール利用ガイド',
      description: 'UGSオンラインスクールの基本的な使い方と機能について説明したガイドです。',
      type: 'PDF',
      size: '2.5MB',
      downloadUrl: '#',
      category: 'マニュアル'
    },
    {
      id: '2',
      title: 'FPエイド活動マニュアル',
      description: 'FPエイドとしての活動方法や報酬制度について詳しく説明したマニュアルです。',
      type: 'PDF',
      size: '3.2MB',
      downloadUrl: '#',
      category: 'マニュアル'
    },
    {
      id: '3',
      title: '紹介制度のご案内',
      description: 'UGS会員紹介とFPエイド紹介の制度について説明した資料です。',
      type: 'PDF',
      size: '1.8MB',
      downloadUrl: '#',
      category: '制度説明'
    },
    {
      id: '4',
      title: '昇格申請書類テンプレート',
      description: 'FPエイドやマネージャーへの昇格申請に必要な書類のテンプレートです。',
      type: 'DOCX',
      size: '0.5MB',
      downloadUrl: '#',
      category: 'テンプレート'
    },
  ]

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
            <div className="mb-6">
              <p className="text-slate-600">
                PDFやマニュアルなどの資料をダウンロードできます。
              </p>
            </div>

            {/* 資料一覧 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {materials.map((material) => (
                <Card key={material.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-slate-600" />
                        <CardTitle className="text-lg">{material.title}</CardTitle>
                      </div>
                    </div>
                    <CardDescription className="mt-2">
                      {material.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-slate-500">
                        <span className="inline-block px-2 py-1 bg-slate-100 rounded text-xs mr-2">
                          {material.category}
                        </span>
                        <span>{material.type} • {material.size}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // ダウンロード処理（実際の実装では、ファイルのダウンロード処理を実装）
                          console.log('Download:', material.title)
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        ダウンロード
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {materials.length === 0 && (
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


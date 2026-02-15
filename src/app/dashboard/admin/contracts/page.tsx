'use client'

import { useState, useRef } from 'react'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Download, Loader2 } from "lucide-react"

interface UploadResult {
  success: number
  errors: { line: number; error: string }[]
  skipped: number
}

function AdminContractsPageContent() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // CSVファイルチェック
    if (!file.name.endsWith('.csv')) {
      alert('CSVファイルを選択してください')
      return
    }

    setIsUploading(true)
    setUploadResult(null)
    setUploadMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/contracts/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setUploadResult(data.results)
        setUploadMessage(data.message)
      } else {
        alert(data.error || 'アップロードに失敗しました')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('アップロード中にエラーが発生しました')
    } finally {
      setIsUploading(false)
      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const downloadSampleCSV = () => {
    const csvContent = `会員番号,契約番号,契約種別,商品名,契約者名,契約金額,報酬額,契約日,メモ
UGS00001,INS-2024-001,保険,終身保険プランA,山田太郎,50000,5000,2024-01-15,新規契約
UGS00001,RE-2024-001,不動産,マンション仲介,佐藤花子,3000000,150000,2024-02-20,成約
UGS00002,SOLAR-2024-001,太陽光/蓄電池,ソーラーパネル設置,田中一郎,1500000,75000,2024-03-01,
UGS00003,RENTAL-2024-001,賃貸,アパート仲介,鈴木次郎,80000,8000,2024-03-15,紹介案件`

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contract_sample.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 min-w-0 md:ml-64">
        <PageHeader title="契約管理" />

        <main className="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* 説明カード */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" aria-hidden="true" />
                契約CSVアップロード
              </CardTitle>
              <CardDescription>
                FPエイドごとの契約データをCSVファイルでアップロードします。
                既存の契約番号があれば更新、なければ新規作成されます。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* CSV形式説明 */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h4 className="font-semibold text-slate-800 mb-3">CSV形式</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-3 font-medium text-slate-600">列名</th>
                        <th className="text-left py-2 px-3 font-medium text-slate-600">必須</th>
                        <th className="text-left py-2 px-3 font-medium text-slate-600">説明</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr><td className="py-2 px-3">会員番号</td><td className="py-2 px-3"><Badge className="bg-red-100 text-red-800">必須</Badge></td><td className="py-2 px-3">UGS00001形式</td></tr>
                      <tr><td className="py-2 px-3">契約番号</td><td className="py-2 px-3"><Badge className="bg-red-100 text-red-800">必須</Badge></td><td className="py-2 px-3">一意の契約識別子</td></tr>
                      <tr><td className="py-2 px-3">契約種別</td><td className="py-2 px-3"><Badge className="bg-red-100 text-red-800">必須</Badge></td><td className="py-2 px-3">保険/不動産/賃貸/太陽光/転職/住宅/その他</td></tr>
                      <tr><td className="py-2 px-3">商品名</td><td className="py-2 px-3"><Badge variant="secondary">任意</Badge></td><td className="py-2 px-3">契約した商品・サービス名</td></tr>
                      <tr><td className="py-2 px-3">契約者名</td><td className="py-2 px-3"><Badge variant="secondary">任意</Badge></td><td className="py-2 px-3">契約者のお客様名</td></tr>
                      <tr><td className="py-2 px-3">契約金額</td><td className="py-2 px-3"><Badge variant="secondary">任意</Badge></td><td className="py-2 px-3">契約金額・保険料（数値）</td></tr>
                      <tr><td className="py-2 px-3">報酬額</td><td className="py-2 px-3"><Badge variant="secondary">任意</Badge></td><td className="py-2 px-3">FPエイドへの報酬額（数値）</td></tr>
                      <tr><td className="py-2 px-3">契約日</td><td className="py-2 px-3"><Badge className="bg-red-100 text-red-800">必須</Badge></td><td className="py-2 px-3">YYYY-MM-DD または YYYY/MM/DD形式</td></tr>
                      <tr><td className="py-2 px-3">メモ</td><td className="py-2 px-3"><Badge variant="secondary">任意</Badge></td><td className="py-2 px-3">備考・メモ</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 契約種別の説明 */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-semibold text-blue-800 mb-3">契約種別について</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="bg-white rounded-lg p-3">
                    <Badge className="bg-blue-100 text-blue-800 mb-1">保険</Badge>
                    <p className="text-slate-600">INSURANCE</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <Badge className="bg-green-100 text-green-800 mb-1">不動産</Badge>
                    <p className="text-slate-600">REAL_ESTATE</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <Badge className="bg-purple-100 text-purple-800 mb-1">賃貸</Badge>
                    <p className="text-slate-600">RENTAL</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <Badge className="bg-yellow-100 text-yellow-800 mb-1">太陽光/蓄電池</Badge>
                    <p className="text-slate-600">SOLAR_BATTERY</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <Badge className="bg-orange-100 text-orange-800 mb-1">転職</Badge>
                    <p className="text-slate-600">CAREER</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <Badge className="bg-teal-100 text-teal-800 mb-1">住宅</Badge>
                    <p className="text-slate-600">HOUSING</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <Badge className="bg-slate-100 text-slate-800 mb-1">その他</Badge>
                    <p className="text-slate-600">OTHER</p>
                  </div>
                </div>
              </div>

              {/* アクションボタン */}
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={downloadSampleCSV}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  サンプルCSVをダウンロード
                </Button>

                <div className="relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  <Button
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        アップロード中...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" aria-hidden="true" />
                        CSVファイルをアップロード
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* アップロード結果 */}
          {uploadResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {uploadResult.errors.length === 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600" aria-hidden="true" />
                  )}
                  アップロード結果
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {uploadMessage && (
                  <p className="text-slate-700 font-medium">{uploadMessage}</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <p className="text-sm text-green-600 font-medium">成功</p>
                    <p className="text-2xl font-bold text-green-800">{uploadResult.success}件</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4 text-center">
                    <p className="text-sm text-red-600 font-medium">エラー</p>
                    <p className="text-2xl font-bold text-red-800">{uploadResult.errors.length}件</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <p className="text-sm text-slate-600 font-medium">スキップ</p>
                    <p className="text-2xl font-bold text-slate-800">{uploadResult.skipped}件</p>
                  </div>
                </div>

                {uploadResult.errors.length > 0 && (
                  <div role="alert" className="mt-4">
                    <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                      <XCircle className="h-4 w-4" aria-hidden="true" />
                      エラー詳細
                    </h4>
                    <div className="bg-red-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                      <ul className="space-y-1 text-sm text-red-700">
                        {uploadResult.errors.map((err, idx) => (
                          <li key={idx}>
                            <span className="font-medium">行 {err.line}:</span> {err.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}

export default function AdminContractsPage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <AdminContractsPageContent />
    </ProtectedRoute>
  )
}

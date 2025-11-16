'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Upload, Loader2, CheckCircle, AlertCircle, Download } from "lucide-react"

interface PreviewData {
  toAddCount: number
  toUpdateCount: number
  errorCount: number
  toAdd: any[]
  toUpdate: any[]
  errors: any[]
}

export function CompensationCsvUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setPreview(null)
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/compensations/upload/preview', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'プレビューの生成に失敗しました')
      }

      setPreview(data.preview)
    } catch (error: any) {
      alert(error.message || 'プレビューの生成に失敗しました')
    } finally {
      setIsUploading(false)
    }
  }

  const handleConfirm = async () => {
    if (!preview) return

    setIsConfirming(true)
    try {
      const response = await fetch('/api/admin/compensations/upload/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toAdd: preview.toAdd,
          toUpdate: preview.toUpdate,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'データの保存に失敗しました')
      }

      setResult(data.summary)
      setFile(null)
      setPreview(null)
      alert(`更新完了: 追加${data.summary.added}件、更新${data.summary.updated}件`)
    } catch (error: any) {
      alert(error.message || 'データの保存に失敗しました')
    } finally {
      setIsConfirming(false)
    }
  }

  const downloadSample = () => {
    const csv = `userId,month,totalAmount,baseAmount,bonusAmount,contractCount
user123,2025-01,150000,120000,30000,5
user456,2025-01,80000,70000,10000,3`

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'compensation_sample.csv'
    link.click()
  }

  return (
    <div className="space-y-6">
      {/* サンプルCSVダウンロード */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">CSVフォーマット</CardTitle>
          <CardDescription>
            以下のカラムを含むCSVファイルをアップロードしてください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-2">
            <p><strong>必須カラム:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li><code>userId</code> - ユーザーID（変わらない固定ID）</li>
              <li><code>month</code> - 対象年月（YYYY-MM形式、例: 2025-01）</li>
              <li><code>totalAmount</code> - 合計報酬額</li>
              <li><code>baseAmount</code> - 基本報酬額</li>
              <li><code>bonusAmount</code> - ボーナス報酬額</li>
              <li><code>contractCount</code> - 契約件数</li>
            </ul>
          </div>
          <Button variant="outline" onClick={downloadSample}>
            <Download className="h-4 w-4 mr-2" />
            サンプルCSVをダウンロード
          </Button>
        </CardContent>
      </Card>

      {/* ファイルアップロード */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ファイル選択</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-slate-700 file:text-white
                hover:file:bg-slate-800"
            />
          </div>
          {file && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-700">{file.name}</span>
              <Button onClick={handleUpload} disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    プレビュー生成中...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    プレビュー
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* プレビュー結果 */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">プレビュー結果</CardTitle>
            <CardDescription>
              以下の内容で更新されます。確認後、「確定」ボタンを押してください。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 統計 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 mb-1">追加</p>
                <p className="text-2xl font-bold text-green-700">{preview.toAddCount}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 mb-1">更新</p>
                <p className="text-2xl font-bold text-blue-700">{preview.toUpdateCount}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600 mb-1">エラー</p>
                <p className="text-2xl font-bold text-red-700">{preview.errorCount}</p>
              </div>
            </div>

            {/* エラー詳細 */}
            {preview.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  エラー詳細
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {preview.errors.map((error, idx) => (
                    <div key={idx} className="p-3 bg-red-50 rounded-lg text-sm">
                      <p className="font-medium text-red-700">行{error.rowNumber}: {error.error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 確定ボタン */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPreview(null)
                  setFile(null)
                }}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isConfirming || (preview.toAddCount === 0 && preview.toUpdateCount === 0)}
                className="bg-green-600 hover:bg-green-700"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    確定中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    確定
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 完了結果 */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              更新完了
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>追加: {result.added}件</p>
              <p>更新: {result.updated}件</p>
              <p>失敗: {result.failed}件</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

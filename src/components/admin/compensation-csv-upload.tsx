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
    const csv = `会員番号,対象月,税込報酬,源泉徴収額,振込手数料
UGS0000001,2026-02,150000,15315,660
UGS0000002,2026-02,80000,8168,660`

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
              <li><code>会員番号</code> - UGSで始まる会員番号（例: UGS0000001）</li>
              <li><code>対象月</code> - 対象年月（YYYY-MM形式、例: 2026-02）</li>
              <li><code>税込報酬</code> - 税込報酬額（源泉徴収前の総額）</li>
              <li><code>源泉徴収額</code> - 源泉徴収税額</li>
              <li><code>振込手数料</code> - 振込手数料（数値）</li>
            </ul>
            <p className="text-xs text-slate-500 mt-1">※ 差引支給額（税込報酬 − 源泉徴収額 − 振込手数料）は自動計算されます</p>
          </div>
          <Button variant="outline" onClick={downloadSample}>
            <Download className="h-4 w-4 mr-2" aria-hidden="true" />
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
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                    プレビュー生成中...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
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
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
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
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                    確定中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />
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
              <CheckCircle className="h-5 w-5" aria-hidden="true" />
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

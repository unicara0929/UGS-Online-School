'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, Loader2, CheckCircle, AlertCircle, Download } from "lucide-react"

interface PreviewData {
  toAddCount: number
  errorCount: number
  toAdd: any[]
  errors: any[]
}

interface CompensationDetailCsvUploadProps {
  businessType: 'REAL_ESTATE' | 'INSURANCE'
}

export function CompensationDetailCsvUpload({ businessType }: CompensationDetailCsvUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [result, setResult] = useState<any>(null)

  const isRealEstate = businessType === 'REAL_ESTATE'
  const label = isRealEstate ? '不動産' : '保険'

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
      formData.append('businessType', businessType)

      const response = await fetch('/api/admin/compensations/details/upload/preview', {
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
      const response = await fetch('/api/admin/compensations/details/upload/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toAdd: preview.toAdd,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'データの保存に失敗しました')
      }

      setResult(data.summary)
      setFile(null)
      setPreview(null)
      alert(`更新完了: 内訳${data.summary.added}件追加、契約${data.summary.contracts}件反映`)
    } catch (error: any) {
      alert(error.message || 'データの保存に失敗しました')
    } finally {
      setIsConfirming(false)
    }
  }

  const downloadSample = () => {
    let csv: string
    if (isRealEstate) {
      csv = `会員番号,対象月,番号,紹介顧客,成約物件,契約日,報酬額
UGS0000001,2025-01,RE-001,山田 太郎,東京都港区マンション,2025-01-15,150000
UGS0000002,2025-01,RE-002,田中 花子,大阪市中央区一戸建て,2025-01-20,200000`
    } else {
      csv = `会員番号,対象月,会社,タイプ,保険種類,契約者名,手数料額
UGS0000001,2025-01,A生命保険,新規,終身保険,山田 太郎,80000
UGS0000002,2025-01,B損害保険,更新,自動車保険,田中 花子,30000`
    }

    const bom = '\uFEFF'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `compensation_detail_${businessType.toLowerCase()}_sample.csv`
    link.click()
  }

  return (
    <div className="space-y-6">
      {/* サンプルCSVダウンロード */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">CSVフォーマット（{label}報酬内訳）</CardTitle>
          <CardDescription>
            以下のカラムを含むCSVファイルをアップロードしてください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-2">
            <p><strong>必須カラム:</strong></p>
            {isRealEstate ? (
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li><code>会員番号</code> - ユーザーの会員番号（例: UGS0000001）</li>
                <li><code>対象月</code> - 対象年月（YYYY-MM形式、例: 2025-01）</li>
                <li><code>番号</code> - 物件番号等</li>
                <li><code>紹介顧客</code> - 紹介した顧客名（姓と名の間にスペース、例: 山田 太郎）</li>
                <li><code>成約物件</code> - 成約した物件名</li>
                <li><code>契約日</code> - 契約日</li>
                <li><code>報酬額</code> - 報酬額（数値）</li>
              </ul>
            ) : (
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li><code>会員番号</code> - ユーザーの会員番号（例: UGS0000001）</li>
                <li><code>対象月</code> - 対象年月（YYYY-MM形式、例: 2025-01）</li>
                <li><code>会社</code> - 保険会社名</li>
                <li><code>タイプ</code> - 契約タイプ（新規/更新等）</li>
                <li><code>保険種類</code> - 保険の種類</li>
                <li><code>契約者名</code> - 契約者名（姓と名の間にスペース、例: 山田 太郎）</li>
                <li><code>手数料額</code> - 手数料額（数値）</li>
              </ul>
            )}
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
              以下の内容で登録されます。確認後、「確定」ボタンを押してください。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 統計 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 mb-1">追加</p>
                <p className="text-2xl font-bold text-green-700">{preview.toAddCount}</p>
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
                  {preview.errors.map((error: any, idx: number) => (
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
                disabled={isConfirming || preview.toAddCount === 0}
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
              <p>内訳追加: {result.added}件</p>
              <p>契約反映: {result.contracts}件</p>
              <p>失敗: {result.failed}件</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

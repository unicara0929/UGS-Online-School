'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Upload, Loader2, CheckCircle, AlertCircle, FileText, X } from "lucide-react"

interface ParsedFile {
  file: File
  memberId: string
  month: string
  valid: boolean
  error?: string
}

interface UploadResult {
  success: number
  failed: number
  skipped: number
  details: { memberId: string; month: string; status: string; error?: string }[]
}

// ファイル名パターン: {会員番号}_{YYYY-MM}.pdf
const FILE_NAME_PATTERN = /^(UGS\d+)_(\d{4}-\d{2})\.pdf$/i

function parseFileName(fileName: string): { memberId: string; month: string } | null {
  const match = fileName.match(FILE_NAME_PATTERN)
  if (!match) return null
  return {
    memberId: match[1].toUpperCase(),
    month: match[2],
  }
}

export function PayslipPdfUpload() {
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const files = Array.from(e.target.files)
    const parsed: ParsedFile[] = files.map((file) => {
      const info = parseFileName(file.name)
      if (!info) {
        return {
          file,
          memberId: '',
          month: '',
          valid: false,
          error: `ファイル名の形式が不正です。「会員番号_YYYY-MM.pdf」の形式にしてください（例: UGS0000001_2026-02.pdf）`,
        }
      }
      return {
        file,
        memberId: info.memberId,
        month: info.month,
        valid: true,
      }
    })

    setParsedFiles(parsed)
    setResult(null)
  }

  const removeFile = (index: number) => {
    setParsedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    const validFiles = parsedFiles.filter((f) => f.valid)
    if (validFiles.length === 0) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      validFiles.forEach((pf) => {
        formData.append('files', pf.file)
      })

      const response = await fetch('/api/admin/compensations/payslips/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'アップロードに失敗しました')
      }

      setResult(data.result)
      setParsedFiles([])
    } catch (error: any) {
      alert(error.message || 'アップロードに失敗しました')
    } finally {
      setIsUploading(false)
    }
  }

  const validCount = parsedFiles.filter((f) => f.valid).length
  const invalidCount = parsedFiles.filter((f) => !f.valid).length

  return (
    <div className="space-y-6">
      {/* フォーマット説明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">支払明細書PDFアップロード</CardTitle>
          <CardDescription>
            スプレッドシートで作成した支払明細書PDFを一括アップロードします
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-2">
            <p><strong>ファイル命名規則:</strong></p>
            <div className="p-3 bg-slate-50 rounded-lg font-mono text-xs">
              <p>{'{会員番号}_{YYYY-MM}.pdf'}</p>
              <p className="text-slate-500 mt-1">例: UGS0000001_2026-02.pdf</p>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-600 mt-2">
              <li>会員番号はUGSで始まる番号です（例: UGS0000001）</li>
              <li>対象月はYYYY-MM形式で指定してください（例: 2026-02）</li>
              <li>該当月の報酬レコードが存在する必要があります</li>
              <li>複数ファイルを同時に選択できます</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* ファイル選択 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ファイル選択</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-slate-700 file:text-white
                hover:file:bg-slate-800"
            />
          </div>
        </CardContent>
      </Card>

      {/* プレビュー */}
      {parsedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">プレビュー</CardTitle>
            <CardDescription>
              ファイル名からマッチング結果を確認してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 統計 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 mb-1">マッチ成功</p>
                <p className="text-2xl font-bold text-green-700">{validCount}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600 mb-1">マッチ失敗</p>
                <p className="text-2xl font-bold text-red-700">{invalidCount}</p>
              </div>
            </div>

            {/* ファイル一覧 */}
            <div className="max-h-80 overflow-y-auto space-y-2">
              {parsedFiles.map((pf, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    pf.valid ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText className={`h-4 w-4 flex-shrink-0 ${pf.valid ? 'text-green-600' : 'text-red-600'}`} aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{pf.file.name}</p>
                      {pf.valid ? (
                        <p className="text-xs text-green-600">
                          会員番号: {pf.memberId} / 対象月: {pf.month}
                        </p>
                      ) : (
                        <p className="text-xs text-red-600">{pf.error}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(idx)}
                    className="flex-shrink-0 h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>

            {/* 確定ボタン */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setParsedFiles([])}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleUpload}
                disabled={isUploading || validCount === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                    アップロード中...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
                    アップロード（{validCount}件）
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
              アップロード完了
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 mb-1">成功</p>
                <p className="text-2xl font-bold text-green-700">{result.success}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600 mb-1">失敗</p>
                <p className="text-2xl font-bold text-red-700">{result.failed}</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-600 mb-1">スキップ</p>
                <p className="text-2xl font-bold text-yellow-700">{result.skipped}</p>
              </div>
            </div>

            {/* 詳細結果 */}
            {result.details.length > 0 && (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {result.details.map((detail, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                      detail.status === 'success'
                        ? 'bg-green-50'
                        : detail.status === 'skipped'
                        ? 'bg-yellow-50'
                        : 'bg-red-50'
                    }`}
                  >
                    {detail.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    )}
                    <div>
                      <p className="font-medium">
                        {detail.memberId} / {detail.month}
                      </p>
                      {detail.error && (
                        <p className="text-xs text-red-600 mt-0.5">{detail.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

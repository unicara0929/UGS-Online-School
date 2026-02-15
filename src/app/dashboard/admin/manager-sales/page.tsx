'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  Download,
  Lock,
  Unlock,
  Trash2,
  Search
} from 'lucide-react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

interface PreviewData {
  toAddCount: number
  toUpdateCount: number
  lockedCount: number
  errorCount: number
  toAdd: any[]
  toUpdate: any[]
  locked: any[]
  errors: any[]
}

interface SalesRecord {
  id: string
  userId: string
  month: string
  salesAmount: number
  insuredCount: number
  isLocked: boolean
  importedAt: string
  user: {
    id: string
    memberId: string
    name: string
    email: string
    role: string
    managerRange?: {
      name: string
      rangeNumber: number
    }
  }
}

interface MonthlyTotal {
  month: string
  totalSales: number
  totalInsuredCount: number
  userCount: number
}

function ManagerSalesPageContent() {
  const [activeTab, setActiveTab] = useState<'list' | 'upload'>('list')
  const [salesData, setSalesData] = useState<SalesRecord[]>([])
  const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotal[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // CSV Upload states
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    fetchSalesData()
  }, [selectedMonth])

  const fetchSalesData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedMonth && selectedMonth !== 'all') params.set('month', selectedMonth)

      const res = await fetch(`/api/admin/manager-sales?${params}`)
      const data = await res.json()

      if (data.success) {
        setSalesData(data.sales)
        setMonthlyTotals(data.monthlyTotals || [])
      }
    } catch (error) {
      console.error('Failed to fetch sales data:', error)
    } finally {
      setLoading(false)
    }
  }

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

      const response = await fetch('/api/admin/manager-sales/upload/preview', {
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
      const response = await fetch('/api/admin/manager-sales/upload/confirm', {
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
      fetchSalesData()
      alert(`更新完了: 追加${data.summary.added}件、更新${data.summary.updated}件`)
    } catch (error: any) {
      alert(error.message || 'データの保存に失敗しました')
    } finally {
      setIsConfirming(false)
    }
  }

  const downloadSample = () => {
    const csv = `memberId,month,salesAmount,insuredCount
UGS0000001,2025-01,1500000,15
UGS0000001,2025-02,2000000,20
UGS0000002,2025-01,1200000,12`

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'manager_sales_sample.csv'
    link.click()
  }

  const handleLock = async (isLocked: boolean) => {
    if (selectedIds.size === 0) return

    try {
      const res = await fetch('/api/admin/manager-sales', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          isLocked
        })
      })
      const data = await res.json()

      if (data.success) {
        alert(data.message)
        setSelectedIds(new Set())
        fetchSalesData()
      } else {
        alert(data.error)
      }
    } catch (error) {
      alert('処理に失敗しました')
    }
  }

  const handleDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`選択した${selectedIds.size}件のデータを削除しますか？`)) return

    try {
      const res = await fetch('/api/admin/manager-sales', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      })
      const data = await res.json()

      if (data.success) {
        alert(data.message)
        setSelectedIds(new Set())
        fetchSalesData()
      } else {
        alert(data.error)
      }
    } catch (error) {
      alert('削除に失敗しました')
    }
  }

  const filteredData = salesData.filter(s =>
    s.user.name.includes(searchQuery) ||
    s.user.memberId.includes(searchQuery) ||
    s.user.email.includes(searchQuery)
  )

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount)

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">MGR売上管理</h1>
            <p className="text-muted-foreground">マネージャーの月次売上・被保険者数を管理</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'list' ? 'default' : 'outline'}
              onClick={() => setActiveTab('list')}
            >
              一覧
            </Button>
            <Button
              variant={activeTab === 'upload' ? 'default' : 'outline'}
              onClick={() => setActiveTab('upload')}
            >
              CSVアップロード
            </Button>
          </div>
        </div>

        {activeTab === 'list' && (
          <>
            {/* 月別集計 */}
            {monthlyTotals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">月別集計（直近12ヶ月）</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {monthlyTotals.slice(0, 6).map(m => (
                      <div
                        key={m.month}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedMonth === m.month ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedMonth(selectedMonth === m.month ? 'all' : m.month)}
                      >
                        <p className="text-sm text-muted-foreground">{m.month}</p>
                        <p className="text-lg font-bold">{formatCurrency(m.totalSales)}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.userCount}名 / 被保{m.totalInsuredCount}名
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* フィルター＆一括操作 */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                      placeholder="名前・会員番号・メールで検索…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="月を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全期間</SelectItem>
                      {monthlyTotals.map(m => (
                        <SelectItem key={m.month} value={m.month}>{m.month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedIds.size > 0 && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleLock(true)}>
                        <Lock className="h-4 w-4 mr-1" aria-hidden="true" />
                        ロック
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleLock(false)}>
                        <Unlock className="h-4 w-4 mr-1" aria-hidden="true" />
                        解除
                      </Button>
                      <Button variant="destructive" size="sm" onClick={handleDelete}>
                        <Trash2 className="h-4 w-4 mr-1" aria-hidden="true" />
                        削除
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* データ一覧 */}
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds(new Set(filteredData.map(s => s.id)))
                              } else {
                                setSelectedIds(new Set())
                              }
                            }}
                            checked={selectedIds.size === filteredData.length && filteredData.length > 0}
                          />
                        </TableHead>
                        <TableHead>会員番号</TableHead>
                        <TableHead>氏名</TableHead>
                        <TableHead>レンジ</TableHead>
                        <TableHead>対象月</TableHead>
                        <TableHead className="text-right">売上</TableHead>
                        <TableHead className="text-right">被保険者</TableHead>
                        <TableHead>ステータス</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(record.id)}
                              onChange={(e) => {
                                const newSet = new Set(selectedIds)
                                if (e.target.checked) {
                                  newSet.add(record.id)
                                } else {
                                  newSet.delete(record.id)
                                }
                                setSelectedIds(newSet)
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">{record.user.memberId}</TableCell>
                          <TableCell>{record.user.name}</TableCell>
                          <TableCell>
                            {record.user.managerRange ? (
                              <Badge variant="outline">{record.user.managerRange.name}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{record.month}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(record.salesAmount)}
                          </TableCell>
                          <TableCell className="text-right">{record.insuredCount}名</TableCell>
                          <TableCell>
                            {record.isLocked ? (
                              <Badge variant="secondary">
                                <Lock className="h-3 w-3 mr-1" aria-hidden="true" />
                                ロック済
                              </Badge>
                            ) : (
                              <Badge variant="outline">未確定</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredData.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            データがありません
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'upload' && (
          <div className="space-y-6">
            {/* CSVフォーマット */}
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
                    <li><code>memberId</code> - 会員番号（例: UGS0000001）</li>
                    <li><code>month</code> - 対象年月（YYYY-MM形式、例: 2025-01）</li>
                    <li><code>salesAmount</code> - 売上金額（円）</li>
                    <li><code>insuredCount</code> - 被保険者数</li>
                  </ul>
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
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-600 mb-1">追加</p>
                      <p className="text-2xl font-bold text-green-700">{preview.toAddCount}</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600 mb-1">更新</p>
                      <p className="text-2xl font-bold text-blue-700">{preview.toUpdateCount}</p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-yellow-600 mb-1">ロック済</p>
                      <p className="text-2xl font-bold text-yellow-700">{preview.lockedCount}</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-600 mb-1">エラー</p>
                      <p className="text-2xl font-bold text-red-700">{preview.errorCount}</p>
                    </div>
                  </div>

                  {/* ロック済み警告 */}
                  {preview.locked.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-yellow-600 flex items-center gap-2">
                        <Lock className="h-4 w-4" aria-hidden="true" />
                        ロック済みデータ（スキップ）
                      </h4>
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {preview.locked.map((item, idx) => (
                          <div key={idx} className="p-3 bg-yellow-50 rounded-lg text-sm">
                            <p className="text-yellow-700">{item.memberId} ({item.month}): {item.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
        )}
      </div>
    </DashboardLayout>
  )
}

export default function ManagerSalesPage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <ManagerSalesPageContent />
    </ProtectedRoute>
  )
}

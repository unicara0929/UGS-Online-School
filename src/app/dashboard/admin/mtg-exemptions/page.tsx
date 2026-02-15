'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Calendar,
  User,
  RefreshCw,
} from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { authenticatedFetch } from '@/lib/utils/api-client'

interface Exemption {
  id: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reason: string
  adminNotes: string | null
  reviewedAt: string | null
  reviewedBy: string | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    email: string
    memberId: string
    role: string
  }
  event: {
    id: string
    title: string
    date: string
  }
}

interface Counts {
  PENDING: number
  APPROVED: number
  REJECTED: number
}

function MtgExemptionsPageContent() {
  const [exemptions, setExemptions] = useState<Exemption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [counts, setCounts] = useState<Counts>({ PENDING: 0, APPROVED: 0, REJECTED: 0 })

  // 審査ダイアログ
  const [selectedExemption, setSelectedExemption] = useState<Exemption | null>(null)
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED' | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchExemptions = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') {
        params.set('status', statusFilter)
      }

      const response = await authenticatedFetch(`/api/admin/mtg-exemptions?${params.toString()}`)
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '取得に失敗しました')
      }

      setExemptions(data.exemptions)
      setCounts(data.counts)
    } catch (err) {
      console.error('Failed to fetch exemptions:', err)
      setError(err instanceof Error ? err.message : '取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchExemptions()
  }, [statusFilter])

  const handleOpenReviewDialog = (exemption: Exemption, action: 'APPROVED' | 'REJECTED') => {
    setSelectedExemption(exemption)
    setReviewAction(action)
    setAdminNotes('')
    setIsReviewDialogOpen(true)
  }

  const handleReview = async () => {
    if (!selectedExemption || !reviewAction) return

    setIsSubmitting(true)

    try {
      const response = await authenticatedFetch(`/api/admin/mtg-exemptions/${selectedExemption.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: reviewAction,
          adminNotes: adminNotes || null,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '審査に失敗しました')
      }

      // 一覧を再取得
      await fetchExemptions()
      setIsReviewDialogOpen(false)
    } catch (err) {
      console.error('Failed to review exemption:', err)
      alert(err instanceof Error ? err.message : '審査に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-yellow-50 border-yellow-300 text-yellow-700">
            <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
            審査中
          </Badge>
        )
      case 'APPROVED':
        return (
          <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700">
            <CheckCircle2 className="h-3 w-3 mr-1" aria-hidden="true" />
            承認
          </Badge>
        )
      case 'REJECTED':
        return (
          <Badge variant="outline" className="bg-red-50 border-red-300 text-red-700">
            <XCircle className="h-3 w-3 mr-1" aria-hidden="true" />
            却下
          </Badge>
        )
      default:
        return null
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy/MM/dd HH:mm', { locale: ja })
    } catch {
      return dateString
    }
  }

  const formatEventDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy年M月d日(E)', { locale: ja })
    } catch {
      return dateString
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 min-w-0 md:ml-64">
        <PageHeader title="全体MTG欠席申請管理" />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* 統計カード */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card
                className={`cursor-pointer transition-colors ${statusFilter === 'PENDING' ? 'ring-2 ring-yellow-400' : ''}`}
                onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">審査待ち</p>
                      <p className="text-2xl font-bold text-yellow-600">{counts.PENDING}</p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-400" aria-hidden="true" />
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-colors ${statusFilter === 'APPROVED' ? 'ring-2 ring-green-400' : ''}`}
                onClick={() => setStatusFilter(statusFilter === 'APPROVED' ? 'ALL' : 'APPROVED')}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">承認済み</p>
                      <p className="text-2xl font-bold text-green-600">{counts.APPROVED}</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-400" aria-hidden="true" />
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-colors ${statusFilter === 'REJECTED' ? 'ring-2 ring-red-400' : ''}`}
                onClick={() => setStatusFilter(statusFilter === 'REJECTED' ? 'ALL' : 'REJECTED')}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">却下</p>
                      <p className="text-2xl font-bold text-red-600">{counts.REJECTED}</p>
                    </div>
                    <XCircle className="h-8 w-8 text-red-400" aria-hidden="true" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* フィルター */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label>ステータス</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">すべて</SelectItem>
                        <SelectItem value="PENDING">審査待ち</SelectItem>
                        <SelectItem value="APPROVED">承認済み</SelectItem>
                        <SelectItem value="REJECTED">却下</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchExemptions}>
                    <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                    更新
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 申請一覧 */}
            <Card>
              <CardHeader>
                <CardTitle>欠席申請一覧</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" aria-hidden="true" />
                  </div>
                ) : error ? (
                  <div className="text-center py-12 text-red-600">{error}</div>
                ) : exemptions.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    欠席申請がありません
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ステータス</TableHead>
                          <TableHead>申請者</TableHead>
                          <TableHead>対象イベント</TableHead>
                          <TableHead>申請理由</TableHead>
                          <TableHead>申請日時</TableHead>
                          <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {exemptions.map((exemption) => (
                          <TableRow key={exemption.id}>
                            <TableCell>{getStatusBadge(exemption.status)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-slate-400" aria-hidden="true" />
                                <div>
                                  <p className="font-medium">{exemption.user.name}</p>
                                  <p className="text-xs text-slate-500">{exemption.user.memberId}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-slate-400" aria-hidden="true" />
                                <div>
                                  <p className="font-medium text-sm">{exemption.event.title}</p>
                                  <p className="text-xs text-slate-500">
                                    {formatEventDate(exemption.event.date)}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs">
                                <p className="text-sm truncate">{exemption.reason}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-slate-500">{formatDate(exemption.createdAt)}</p>
                            </TableCell>
                            <TableCell className="text-right">
                              {exemption.status === 'PENDING' ? (
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => handleOpenReviewDialog(exemption, 'APPROVED')}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-1" aria-hidden="true" />
                                    承認
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleOpenReviewDialog(exemption, 'REJECTED')}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" aria-hidden="true" />
                                    却下
                                  </Button>
                                </div>
                              ) : (
                                <div className="text-sm text-slate-500">
                                  {exemption.reviewedAt && (
                                    <p>{formatDate(exemption.reviewedAt)}</p>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* 審査ダイアログ */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'APPROVED' ? '欠席申請を承認' : '欠席申請を却下'}
            </DialogTitle>
            <DialogDescription>
              {selectedExemption && (
                <>
                  <strong>{selectedExemption.user.name}</strong>さんの
                  <strong>{selectedExemption.event.title}</strong>への欠席申請を
                  {reviewAction === 'APPROVED' ? '承認' : '却下'}します。
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedExemption && (
            <div className="space-y-4">
              {/* 申請理由 */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <Label className="text-xs text-slate-500">申請理由</Label>
                <p className="mt-1 text-sm whitespace-pre-wrap">{selectedExemption.reason}</p>
              </div>

              {/* 管理者コメント */}
              <div className="space-y-2">
                <Label htmlFor="adminNotes">
                  管理者コメント
                  {reviewAction === 'REJECTED' && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={
                    reviewAction === 'APPROVED'
                      ? '承認コメント（任意）'
                      : '却下理由を入力してください'
                  }
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleReview}
              disabled={isSubmitting || (reviewAction === 'REJECTED' && !adminNotes.trim())}
              className={
                reviewAction === 'APPROVED'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  処理中...
                </>
              ) : reviewAction === 'APPROVED' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" aria-hidden="true" />
                  承認する
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                  却下する
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function MtgExemptionsPage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <MtgExemptionsPageContent />
    </ProtectedRoute>
  )
}

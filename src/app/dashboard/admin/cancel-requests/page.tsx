'use client'

import { useEffect, useState, useCallback } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Loader2, UserX, Clock, User, Mail, Calendar, FileText, AlertCircle } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils/format'

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  PENDING: { label: '未処理', color: 'text-yellow-800', bgColor: 'bg-yellow-100' },
  APPROVED: { label: '承認済み', color: 'text-blue-800', bgColor: 'bg-blue-100' },
  REJECTED: { label: '却下', color: 'text-red-800', bgColor: 'bg-red-100' },
  COMPLETED: { label: '完了', color: 'text-green-800', bgColor: 'bg-green-100' },
}

const REASON_LABELS: Record<string, string> = {
  'コンテンツを視聴する時間がない': '時間がない',
  '金額が高いと感じた': '料金が高い',
  '他サービスを利用するため': '他サービス利用',
  '欲しいテーマの講座/動画がなかった': '講座不足',
  'アプリ/サイトが使いづらい': '使いづらい',
  'サポート対応に不満があった': 'サポート不満',
  '一時的に支出をおさえたい': '支出を抑えたい',
  'お試し利用だった': 'お試し',
  'その他': 'その他',
}

const CONTINUATION_LABELS: Record<string, string> = {
  temporary: '一時的な退会',
  permanent: '完全退会',
}

const ROLE_LABELS: Record<string, string> = {
  member: 'UGS会員',
  fp: 'FPエイド',
  manager: 'マネージャー',
  admin: '管理者',
}

interface CancelRequest {
  id: string
  userId: string
  name: string
  email: string
  reason: string
  otherReason: string | null
  continuationOption: string
  status: string
  isScheduled: boolean
  contractEndDate: string | null
  adminNote: string | null
  processedAt: string | null
  processedBy: string | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    email: string
    role: string
    createdAt: string
  }
}

function AdminCancelRequestsPageContent() {
  const [cancelRequests, setCancelRequests] = useState<CancelRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [selectedRequest, setSelectedRequest] = useState<CancelRequest | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [adminNote, setAdminNote] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const fetchCancelRequests = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)

      const response = await fetch(`/api/admin/cancel-requests?${params.toString()}`, {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '退会申請の取得に失敗しました')
      }

      setCancelRequests(data.cancelRequests)
    } catch (err) {
      setError(err instanceof Error ? err.message : '退会申請の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [filterStatus])

  useEffect(() => {
    fetchCancelRequests()
  }, [fetchCancelRequests])

  const handleOpenDetail = (request: CancelRequest) => {
    setSelectedRequest(request)
    setAdminNote(request.adminNote || '')
    setIsDialogOpen(true)
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedRequest) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/cancel-requests/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus, adminNote }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'ステータスの更新に失敗しました')
      }

      // 一覧を更新
      setCancelRequests(prev =>
        prev.map(req =>
          req.id === selectedRequest.id ? data.cancelRequest : req
        )
      )
      setSelectedRequest(data.cancelRequest)
      alert('ステータスを更新しました')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ステータスの更新に失敗しました')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSaveNote = async () => {
    if (!selectedRequest) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/cancel-requests/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ adminNote }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'メモの保存に失敗しました')
      }

      setCancelRequests(prev =>
        prev.map(req =>
          req.id === selectedRequest.id ? data.cancelRequest : req
        )
      )
      setSelectedRequest(data.cancelRequest)
      alert('メモを保存しました')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'メモの保存に失敗しました')
    } finally {
      setIsUpdating(false)
    }
  }

  // 統計
  const stats = {
    total: cancelRequests.length,
    pending: cancelRequests.filter(r => r.status === 'PENDING').length,
    approved: cancelRequests.filter(r => r.status === 'APPROVED').length,
    completed: cancelRequests.filter(r => r.status === 'COMPLETED').length,
    scheduled: cancelRequests.filter(r => r.isScheduled).length,
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <PageHeader title="退会申請管理" />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          {/* 統計カード */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('')}>
              <CardContent className="pt-4 pb-3">
                <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                <p className="text-xs text-slate-500">全件</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('PENDING')}>
              <CardContent className="pt-4 pb-3">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <p className="text-xs text-slate-500">未処理</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('APPROVED')}>
              <CardContent className="pt-4 pb-3">
                <div className="text-2xl font-bold text-blue-600">{stats.approved}</div>
                <p className="text-xs text-slate-500">承認済み</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('COMPLETED')}>
              <CardContent className="pt-4 pb-3">
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                <p className="text-xs text-slate-500">完了</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-2xl font-bold text-purple-600">{stats.scheduled}</div>
                <p className="text-xs text-slate-500">解約予約</p>
              </CardContent>
            </Card>
          </div>

          {/* フィルター */}
          <div className="mb-4 flex gap-2 flex-wrap">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">すべてのステータス</option>
              {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* 退会申請一覧 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserX className="h-5 w-5 mr-2" />
                退会申請一覧
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
                </div>
              ) : error ? (
                <div className="text-center py-12 text-red-600">{error}</div>
              ) : cancelRequests.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <UserX className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>退会申請はありません</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cancelRequests.map((request) => (
                    <div
                      key={request.id}
                      className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => handleOpenDetail(request)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-slate-900">{request.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {ROLE_LABELS[request.user.role] || request.user.role}
                            </Badge>
                            <Badge className={`${STATUS_CONFIG[request.status]?.bgColor} ${STATUS_CONFIG[request.status]?.color}`}>
                              {STATUS_CONFIG[request.status]?.label || request.status}
                            </Badge>
                            {request.isScheduled && (
                              <Badge className="bg-purple-100 text-purple-800">解約予約</Badge>
                            )}
                          </div>
                          <div className="text-sm text-slate-600 space-y-1">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center">
                                <Mail className="h-3.5 w-3.5 mr-1" />
                                {request.email}
                              </span>
                              <span className="flex items-center">
                                <Clock className="h-3.5 w-3.5 mr-1" />
                                {formatDateTime(request.createdAt)}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span>理由: {REASON_LABELS[request.reason] || request.reason}</span>
                              <span>種別: {CONTINUATION_LABELS[request.continuationOption] || request.continuationOption}</span>
                            </div>
                            {request.contractEndDate && (
                              <div className="flex items-center text-purple-600">
                                <Calendar className="h-3.5 w-3.5 mr-1" />
                                契約解除日: {formatDate(request.contractEndDate)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* 詳細ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>退会申請詳細</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              {/* ユーザー情報 */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-medium text-slate-900 mb-3 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  ユーザー情報
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">氏名:</span>
                    <span className="ml-2 font-medium">{selectedRequest.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">メール:</span>
                    <span className="ml-2">{selectedRequest.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">ロール:</span>
                    <span className="ml-2">{ROLE_LABELS[selectedRequest.user.role] || selectedRequest.user.role}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">登録日:</span>
                    <span className="ml-2">{formatDate(selectedRequest.user.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* 退会申請内容 */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-medium text-slate-900 mb-3 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  申請内容
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">ステータス:</span>
                    <Badge className={`${STATUS_CONFIG[selectedRequest.status]?.bgColor} ${STATUS_CONFIG[selectedRequest.status]?.color}`}>
                      {STATUS_CONFIG[selectedRequest.status]?.label || selectedRequest.status}
                    </Badge>
                    {selectedRequest.isScheduled && (
                      <Badge className="bg-purple-100 text-purple-800">解約予約</Badge>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500">退会理由:</span>
                    <span className="ml-2">{selectedRequest.reason}</span>
                  </div>
                  {selectedRequest.otherReason && (
                    <div>
                      <span className="text-slate-500">その他理由:</span>
                      <p className="mt-1 p-2 bg-white rounded border text-slate-700">{selectedRequest.otherReason}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500">退会種別:</span>
                    <span className="ml-2">{CONTINUATION_LABELS[selectedRequest.continuationOption] || selectedRequest.continuationOption}</span>
                  </div>
                  {selectedRequest.contractEndDate && (
                    <div className="flex items-center text-purple-600">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      契約解除日: {formatDate(selectedRequest.contractEndDate)}
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500">申請日時:</span>
                    <span className="ml-2">{formatDateTime(selectedRequest.createdAt)}</span>
                  </div>
                  {selectedRequest.processedAt && (
                    <div>
                      <span className="text-slate-500">処理日時:</span>
                      <span className="ml-2">{formatDateTime(selectedRequest.processedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 管理者メモ */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  管理者メモ
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="管理者用のメモを入力..."
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveNote}
                  disabled={isUpdating}
                  className="mt-2"
                >
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  メモを保存
                </Button>
              </div>

              {/* ステータス変更 */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ステータス変更
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_CONFIG).map(([key, { label, bgColor, color }]) => (
                    <Button
                      key={key}
                      variant={selectedRequest.status === key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleStatusChange(key)}
                      disabled={isUpdating || selectedRequest.status === key}
                      className={selectedRequest.status === key ? '' : `${bgColor} ${color} border-0`}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AdminCancelRequestsPage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <AdminCancelRequestsPageContent />
    </ProtectedRoute>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Loader2,
  AlertTriangle,
  ArrowDownCircle,
  UserX,
  Calendar
} from 'lucide-react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

interface DemotionCandidate {
  id: string
  userId: string
  periodYear: number
  periodHalf: number
  periodLabel: string
  totalSales: number
  totalInsuredCount: number
  user: {
    id: string
    memberId: string
    name: string
    email: string
    role: string
    managerPromotedAt: string | null
    managerRange?: { name: string; rangeNumber: number }
  }
  previousRange: { name: string; rangeNumber: number } | null
}

function DemotionCandidatesPageContent() {
  const [candidates, setCandidates] = useState<DemotionCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [demoting, setDemoting] = useState<string | null>(null)
  const [showDemoteDialog, setShowDemoteDialog] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<DemotionCandidate | null>(null)

  useEffect(() => {
    fetchCandidates()
  }, [])

  const fetchCandidates = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/demotion-candidates')
      const data = await res.json()

      if (data.success) {
        setCandidates(data.candidates)
      }
    } catch (error) {
      console.error('Failed to fetch demotion candidates:', error)
    } finally {
      setLoading(false)
    }
  }

  const openDemoteDialog = (candidate: DemotionCandidate) => {
    setSelectedCandidate(candidate)
    setShowDemoteDialog(true)
  }

  const executeDemotion = async () => {
    if (!selectedCandidate) return

    setDemoting(selectedCandidate.id)
    try {
      const res = await fetch(`/api/admin/demotion-candidates/${selectedCandidate.id}/demote`, {
        method: 'POST'
      })
      const data = await res.json()

      if (data.success) {
        alert(data.message)
        fetchCandidates()
      } else {
        alert(data.error || '降格処理に失敗しました')
      }
    } catch (error) {
      alert('降格処理に失敗しました')
    } finally {
      setDemoting(null)
      setShowDemoteDialog(false)
      setSelectedCandidate(null)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ja-JP')
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              MGR降格候補一覧
            </h1>
            <p className="text-muted-foreground">
              半期売上120万円未満のマネージャーが降格候補となります
            </p>
          </div>
        </div>

        {/* 統計 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <UserX className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-sm text-red-600">降格候補者数</p>
                  <p className="text-3xl font-bold text-red-700">{candidates.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">維持基準</p>
              <p className="text-2xl font-bold">半期 120万円以上</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">降格後</p>
              <p className="text-sm">FPエイドに降格<br />4ヶ月以内に再昇格条件達成で再昇格可</p>
            </CardContent>
          </Card>
        </div>

        {/* 候補者一覧 */}
        <Card>
          <CardHeader>
            <CardTitle>降格候補者</CardTitle>
            <CardDescription>
              確認の上、降格処理を実行してください。降格処理後、対象ユーザーはFPエイドに変更されます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : candidates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>降格候補者はいません</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>会員番号</TableHead>
                    <TableHead>氏名</TableHead>
                    <TableHead>MGR昇格日</TableHead>
                    <TableHead>査定期間</TableHead>
                    <TableHead>現在レンジ</TableHead>
                    <TableHead className="text-right">売上</TableHead>
                    <TableHead className="text-right">被保険者</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((candidate) => (
                    <TableRow key={candidate.id}>
                      <TableCell className="font-mono text-sm">{candidate.user.memberId}</TableCell>
                      <TableCell>{candidate.user.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(candidate.user.managerPromotedAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{candidate.periodLabel}</Badge>
                      </TableCell>
                      <TableCell>
                        {candidate.previousRange?.name || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {formatCurrency(candidate.totalSales)}
                      </TableCell>
                      <TableCell className="text-right">{candidate.totalInsuredCount}名</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openDemoteDialog(candidate)}
                          disabled={demoting === candidate.id}
                        >
                          {demoting === candidate.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <ArrowDownCircle className="h-4 w-4 mr-1" />
                              降格
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 降格確認ダイアログ */}
        <AlertDialog open={showDemoteDialog} onOpenChange={setShowDemoteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                降格処理の確認
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  <strong>{selectedCandidate?.user.name}</strong> さんをFPエイドに降格します。
                </p>
                <ul className="text-sm space-y-1 mt-2">
                  <li>• ロールがMANAGERからFPに変更されます</li>
                  <li>• MGRレンジが解除されます</li>
                  <li>• 4ヶ月以内に再昇格条件を達成すると再昇格面接が可能になります</li>
                </ul>
                <p className="mt-4 font-medium">この操作は取り消せません。よろしいですか？</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                onClick={executeDemotion}
                className="bg-red-600 hover:bg-red-700"
              >
                降格を実行
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  )
}

export default function DemotionCandidatesPage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <DemotionCandidatesPageContent />
    </ProtectedRoute>
  )
}

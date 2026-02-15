'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  CheckCircle,
  AlertTriangle,
  Play,
  ArrowDown,
  ArrowUp,
  Minus,
  Clock
} from 'lucide-react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

interface Assessment {
  id: string
  userId: string
  periodYear: number
  periodHalf: number
  totalSales: number
  totalInsuredCount: number
  isExempt: boolean
  isDemotionCandidate: boolean
  status: 'PENDING' | 'CONFIRMED' | 'DEMOTED'
  confirmedAt: string | null
  user: {
    id: string
    memberId: string
    name: string
    email: string
    role: string
  }
  previousRange: { name: string; rangeNumber: number } | null
  newRange: { name: string; rangeNumber: number } | null
}

function ManagerAssessmentsPageContent() {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [selectedHalf, setSelectedHalf] = useState<string>('all')
  const [statusCounts, setStatusCounts] = useState<{ [key: string]: number }>({})
  const [showExecuteDialog, setShowExecuteDialog] = useState(false)

  useEffect(() => {
    fetchAssessments()
  }, [selectedYear, selectedHalf])

  const fetchAssessments = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedYear && selectedYear !== 'all') params.set('year', selectedYear)
      if (selectedHalf && selectedHalf !== 'all') params.set('half', selectedHalf)

      const res = await fetch(`/api/admin/manager-assessments?${params}`)
      const data = await res.json()

      if (data.success) {
        setAssessments(data.assessments)
        setStatusCounts(data.statusCounts || {})
      }
    } catch (error) {
      console.error('Failed to fetch assessments:', error)
    } finally {
      setLoading(false)
    }
  }

  const executeAssessment = async () => {
    setExecuting(true)
    try {
      const body: any = {}
      if (selectedYear && selectedYear !== 'all' && selectedHalf && selectedHalf !== 'all') {
        body.year = parseInt(selectedYear)
        body.half = parseInt(selectedHalf)
      }

      const res = await fetch('/api/admin/manager-assessments/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()

      if (data.success) {
        alert(`査定完了: ${data.processedCount}名処理、降格候補${data.demotionCandidateCount}名、免除${data.exemptCount}名`)
        fetchAssessments()
      } else {
        alert(data.error || '査定の実行に失敗しました')
      }
    } catch (error) {
      alert('査定の実行に失敗しました')
    } finally {
      setExecuting(false)
      setShowExecuteDialog(false)
    }
  }

  const confirmAssessment = async (assessmentId: string) => {
    setConfirming(assessmentId)
    try {
      const res = await fetch(`/api/admin/manager-assessments/${assessmentId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applyRangeChange: true })
      })
      const data = await res.json()

      if (data.success) {
        alert(data.message)
        fetchAssessments()
      } else {
        alert(data.error || '確定に失敗しました')
      }
    } catch (error) {
      alert('確定に失敗しました')
    } finally {
      setConfirming(null)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount)

  const getStatusBadge = (assessment: Assessment) => {
    if (assessment.isExempt) {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" aria-hidden="true" />免除中</Badge>
    }
    if (assessment.status === 'CONFIRMED') {
      return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" aria-hidden="true" />確定</Badge>
    }
    if (assessment.status === 'DEMOTED') {
      return <Badge variant="destructive"><ArrowDown className="h-3 w-3 mr-1" aria-hidden="true" />降格済</Badge>
    }
    if (assessment.isDemotionCandidate) {
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" aria-hidden="true" />降格候補</Badge>
    }
    return <Badge variant="outline">未確定</Badge>
  }

  const getRangeChange = (assessment: Assessment) => {
    const prev = assessment.previousRange?.rangeNumber
    const next = assessment.newRange?.rangeNumber

    if (!prev || !next || prev === next) {
      return <Minus className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
    }
    if (next > prev) {
      return <ArrowUp className="h-4 w-4 text-green-600" aria-hidden="true" />
    }
    return <ArrowDown className="h-4 w-4 text-red-600" aria-hidden="true" />
  }

  const currentYear = new Date().getFullYear()
  const years = [currentYear, currentYear - 1, currentYear - 2]

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">MGR半期査定管理</h1>
            <p className="text-muted-foreground">マネージャーの半期売上に基づく査定を管理</p>
          </div>
          <Button onClick={() => setShowExecuteDialog(true)} disabled={executing}>
            {executing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                実行中...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" aria-hidden="true" />
                査定実行
              </>
            )}
          </Button>
        </div>

        {/* ステータス集計 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">未確定</p>
              <p className="text-2xl font-bold">{statusCounts['PENDING'] || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">確定済</p>
              <p className="text-2xl font-bold text-green-600">{statusCounts['CONFIRMED'] || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">降格済</p>
              <p className="text-2xl font-bold text-red-600">{statusCounts['DEMOTED'] || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">合計</p>
              <p className="text-2xl font-bold">{assessments.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* フィルター */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="年" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全期間</SelectItem>
                  {years.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}年</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedHalf} onValueChange={setSelectedHalf}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="期" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全期</SelectItem>
                  <SelectItem value="1">上期（1-6月）</SelectItem>
                  <SelectItem value="2">下期（7-12月）</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 査定一覧 */}
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
                    <TableHead>会員番号</TableHead>
                    <TableHead>氏名</TableHead>
                    <TableHead>期間</TableHead>
                    <TableHead className="text-right">売上合計</TableHead>
                    <TableHead className="text-right">被保険者</TableHead>
                    <TableHead>レンジ変更</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessments.map((assessment) => (
                    <TableRow key={assessment.id}>
                      <TableCell className="font-mono text-sm">{assessment.user.memberId}</TableCell>
                      <TableCell>{assessment.user.name}</TableCell>
                      <TableCell>
                        {assessment.periodYear}年{assessment.periodHalf === 1 ? '上期' : '下期'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(assessment.totalSales)}
                      </TableCell>
                      <TableCell className="text-right">{assessment.totalInsuredCount}名</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{assessment.previousRange?.name || '-'}</span>
                          {getRangeChange(assessment)}
                          <span className="text-sm">{assessment.newRange?.name || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(assessment)}</TableCell>
                      <TableCell>
                        {assessment.status === 'PENDING' && !assessment.isExempt && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => confirmAssessment(assessment.id)}
                            disabled={confirming === assessment.id}
                          >
                            {confirming === assessment.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                              '確定'
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {assessments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        査定データがありません
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 査定実行確認ダイアログ */}
        <AlertDialog open={showExecuteDialog} onOpenChange={setShowExecuteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>半期査定を実行しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                全マネージャーの半期売上を集計し、査定結果を生成します。
                既存の未確定査定データは上書きされます。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction onClick={executeAssessment}>
                実行
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  )
}

export default function ManagerAssessmentsPage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <ManagerAssessmentsPageContent />
    </ProtectedRoute>
  )
}

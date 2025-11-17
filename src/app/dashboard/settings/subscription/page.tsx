'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { SubscriptionGuard } from "@/components/auth/subscription-guard"
import { Sidebar } from "@/components/navigation/sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  FileText,
  PauseCircle,
  PlayCircle
} from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import { useAuth } from "@/contexts/auth-context"
import { authenticatedFetch } from "@/lib/utils/api-client"

interface SubscriptionData {
  id: string
  status: string
  stripeSubscriptionId: string | null
  stripeCustomerId: string | null
  currentPeriodEnd: string | null
  stripeDetails: {
    status: string
    currentPeriodEnd: string
    currentPeriodStart: string
    cancelAtPeriodEnd: boolean
    canceledAt: string | null
    amount: number
    currency: string
  } | null
  paymentMethod: {
    brand: string
    last4: string
    expMonth: number | null
    expYear: number | null
  } | null
}

interface Invoice {
  id: string
  amount: number
  currency: string
  status: string
  paidAt: string | null
  dueDate: string | null
  invoicePdf: string | null
  hostedInvoiceUrl: string | null
  periodStart: string | null
  periodEnd: string | null
}

function SubscriptionManagementPage() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isReactivating, setIsReactivating] = useState(false)
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false)
  const [isSuspending, setIsSuspending] = useState(false)
  const [isResumingSuspension, setIsResumingSuspension] = useState(false)
  const [showSuspensionDialog, setShowSuspensionDialog] = useState(false)
  const [suspensionEndDate, setSuspensionEndDate] = useState('')
  const [suspensionReason, setSuspensionReason] = useState('')

  useEffect(() => {
    if (user?.id) {
      fetchSubscription()
      fetchInvoices()
    }
  }, [user?.id])

  const fetchSubscription = async () => {
    try {
      const response = await authenticatedFetch('/api/user/subscription', {
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('サブスクリプション情報の取得に失敗しました')
      }
      const data = await response.json()
      setSubscription(data.subscription)
    } catch (error) {
      console.error('Error fetching subscription:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchInvoices = async () => {
    try {
      const response = await authenticatedFetch('/api/user/subscription/invoices', {
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('請求履歴の取得に失敗しました')
      }
      const data = await response.json()
      setInvoices(data.invoices || [])
    } catch (error) {
      console.error('Error fetching invoices:', error)
    }
  }

  const handleCancel = async () => {
    const reason = prompt('退会理由をお聞かせください（任意）')
    if (reason === null) {
      // ユーザーがキャンセルした場合
      return
    }

    if (!confirm('サブスクリプションをキャンセルして退会しますか？現在の期間が終了するまでサービスをご利用いただけます。')) {
      return
    }

    setIsCancelling(true)
    try {
      const response = await authenticatedFetch('/api/user/cancellation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: reason || undefined,
          immediate: false,
        }),
        credentials: 'include',
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '退会申請に失敗しました')
      }
      const data = await response.json()
      alert(data.message || '退会申請を受け付けました')
      window.location.reload()
    } catch (error: any) {
      alert(error.message || '退会申請に失敗しました')
    } finally {
      setIsCancelling(false)
    }
  }

  const handleReactivate = async () => {
    setIsReactivating(true)
    try {
      const response = await authenticatedFetch('/api/user/subscription/reactivate', {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '再開に失敗しました')
      }
      await fetchSubscription()
      alert('サブスクリプションが再開されました')
    } catch (error: any) {
      alert(error.message || '再開に失敗しました')
    } finally {
      setIsReactivating(false)
    }
  }

  const handleUpdatePaymentMethod = async () => {
    setIsUpdatingPayment(true)
    try {
      const response = await authenticatedFetch('/api/user/subscription/update-payment-method', {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'カード情報更新ページの作成に失敗しました')
      }
      const data = await response.json()
      window.location.href = data.url
    } catch (error: any) {
      alert(error.message || 'カード情報更新ページの作成に失敗しました')
      setIsUpdatingPayment(false)
    }
  }

  const handleSuspensionRequest = async () => {
    if (!suspensionEndDate) {
      alert('休会終了日を選択してください')
      return
    }

    if (!confirm(`${suspensionEndDate}まで休会しますか？休会中は請求が停止され、サービスへのアクセスが制限されます。`)) {
      return
    }

    setIsSuspending(true)
    try {
      const response = await authenticatedFetch('/api/user/suspension', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suspensionEndDate,
          reason: suspensionReason,
        }),
        credentials: 'include',
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '休会申請に失敗しました')
      }
      alert('休会申請を受け付けました')
      setShowSuspensionDialog(false)
      setSuspensionEndDate('')
      setSuspensionReason('')
      window.location.reload()
    } catch (error: any) {
      alert(error.message || '休会申請に失敗しました')
    } finally {
      setIsSuspending(false)
    }
  }

  const handleResumeSuspension = async () => {
    if (!confirm('休会を解除して、サブスクリプションを再開しますか？')) {
      return
    }

    setIsResumingSuspension(true)
    try {
      const response = await authenticatedFetch('/api/user/suspension', {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '休会解除に失敗しました')
      }
      alert('休会を解除しました')
      window.location.reload()
    } catch (error: any) {
      alert(error.message || '休会解除に失敗しました')
    } finally {
      setIsResumingSuspension(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">有効</Badge>
      case 'past_due':
        return <Badge className="bg-yellow-100 text-yellow-800">未払い</Badge>
      case 'canceled':
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800">キャンセル済み</Badge>
      case 'unpaid':
        return <Badge className="bg-red-100 text-red-800">未払い</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">支払済み</Badge>
      case 'open':
        return <Badge className="bg-yellow-100 text-yellow-800">未払い</Badge>
      case 'void':
        return <Badge className="bg-gray-100 text-gray-800">無効</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getCardBrandName = (brand: string) => {
    const brandMap: Record<string, string> = {
      'visa': 'Visa',
      'mastercard': 'Mastercard',
      'amex': 'American Express',
      'jcb': 'JCB',
      'diners': 'Diners Club',
      'discover': 'Discover',
      'unionpay': 'UnionPay'
    }
    return brandMap[brand.toLowerCase()] || brand.toUpperCase()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 md:ml-64">
          <DashboardHeader />
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <DashboardHeader />
        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">サブスクリプション管理</h1>
              <p className="text-slate-600 mt-1">サブスクリプション情報と請求履歴を管理できます</p>
            </div>

            {!subscription ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">サブスクリプションが見つかりません</p>
                    <p className="text-sm text-slate-500 mt-2">新規登録から決済を完了してください</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* 会員管理 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="h-5 w-5 mr-2" />
                      会員管理
                    </CardTitle>
                    <CardDescription>休会・退会の申請を行えます</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 休会セクション */}
                    <div className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 flex items-center">
                            <PauseCircle className="h-5 w-5 mr-2 text-blue-600" />
                            休会（最大3ヶ月）
                          </h3>
                          <p className="text-sm text-slate-600 mt-1">
                            一定期間サブスクリプションを停止します。休会中は請求が停止され、期間終了後に自動的に再開されます。
                          </p>
                        </div>
                      </div>

                      {showSuspensionDialog ? (
                        <div className="space-y-4 mt-4 bg-slate-50 p-4 rounded-lg">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              休会終了日
                            </label>
                            <input
                              type="date"
                              value={suspensionEndDate}
                              onChange={(e) => setSuspensionEndDate(e.target.value)}
                              min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                              max={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                              最大3ヶ月（90日）まで設定できます
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              休会理由（任意）
                            </label>
                            <textarea
                              value={suspensionReason}
                              onChange={(e) => setSuspensionReason(e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="休会の理由をお聞かせください"
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={handleSuspensionRequest}
                              disabled={isSuspending || !suspensionEndDate}
                              className="flex-1"
                            >
                              {isSuspending ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  処理中...
                                </>
                              ) : (
                                '休会申請'
                              )}
                            </Button>
                            <Button
                              onClick={() => {
                                setShowSuspensionDialog(false)
                                setSuspensionEndDate('')
                                setSuspensionReason('')
                              }}
                              variant="outline"
                            >
                              キャンセル
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          onClick={() => setShowSuspensionDialog(true)}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          <PauseCircle className="h-4 w-4 mr-2" />
                          休会を申請する
                        </Button>
                      )}
                    </div>

                    {/* 退会セクション */}
                    <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-red-900 flex items-center">
                            <XCircle className="h-5 w-5 mr-2 text-red-600" />
                            退会
                          </h3>
                          <p className="text-sm text-red-700 mt-1">
                            サブスクリプションを完全にキャンセルします。現在の期間終了時に退会となります。
                          </p>
                        </div>
                      </div>

                      <Button
                        onClick={handleCancel}
                        disabled={isCancelling}
                        variant="destructive"
                        size="sm"
                        className="w-full"
                      >
                        {isCancelling ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            処理中...
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 mr-2" />
                            退会を申請する
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* サブスクリプション情報 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CreditCard className="h-5 w-5 mr-2" />
                      サブスクリプション情報
                    </CardTitle>
                    <CardDescription>現在のサブスクリプションの状態</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* ステータス */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">ステータス</span>
                      {subscription.stripeDetails ? (
                        getStatusBadge(subscription.stripeDetails.status)
                      ) : (
                        getStatusBadge(subscription.status.toLowerCase())
                      )}
                    </div>

                    {/* 警告メッセージ */}
                    {subscription.stripeDetails?.status === 'past_due' && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-yellow-800">決済が失敗しました</p>
                            <p className="text-sm text-yellow-700 mt-1">
                              カード情報を更新して決済を完了してください。未払いが続く場合、サービスへのアクセスが制限される可能性があります。
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {subscription.stripeDetails?.cancelAtPeriodEnd && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <AlertCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-blue-800">キャンセル予定</p>
                            <p className="text-sm text-blue-700 mt-1">
                              現在の期間終了時にサブスクリプションがキャンセルされます。
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 月額料金 */}
                    {subscription.stripeDetails && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">月額料金</span>
                        <span className="text-lg font-bold text-slate-900">
                          {formatCurrency(subscription.stripeDetails.amount)}
                        </span>
                      </div>
                    )}

                    {/* 現在の期間 */}
                    {subscription.stripeDetails && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700">現在の期間</span>
                          <span className="text-sm text-slate-600">
                            {formatDate(subscription.stripeDetails.currentPeriodStart)} 〜 {formatDate(subscription.stripeDetails.currentPeriodEnd)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700">次回請求日</span>
                          <span className="text-sm text-slate-600">
                            {formatDate(subscription.stripeDetails.currentPeriodEnd)}
                          </span>
                        </div>
                      </>
                    )}

                    {/* カード情報 */}
                    {subscription.paymentMethod ? (
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700">登録カード</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleUpdatePaymentMethod}
                            disabled={isUpdatingPayment}
                          >
                            {isUpdatingPayment ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                処理中...
                              </>
                            ) : (
                              <>
                                <CreditCard className="h-4 w-4 mr-2" />
                                カード情報を変更
                              </>
                            )}
                          </Button>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4">
                          <div className="flex items-center">
                            <CreditCard className="h-8 w-8 text-slate-600 mr-3" />
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {getCardBrandName(subscription.paymentMethod.brand)} •••• {subscription.paymentMethod.last4}
                              </p>
                              {subscription.paymentMethod.expMonth && subscription.paymentMethod.expYear && (
                                <p className="text-xs text-slate-600">
                                  有効期限: {subscription.paymentMethod.expMonth}/{subscription.paymentMethod.expYear}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700">登録カード</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleUpdatePaymentMethod}
                            disabled={isUpdatingPayment}
                          >
                            {isUpdatingPayment ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                処理中...
                              </>
                            ) : (
                              <>
                                <CreditCard className="h-4 w-4 mr-2" />
                                カード情報を登録
                              </>
                            )}
                          </Button>
                        </div>
                        <p className="text-sm text-slate-600 mt-2">カード情報が登録されていません</p>
                      </div>
                    )}

                    {/* アクションボタン */}
                    <div className="border-t pt-4 flex gap-2">
                      {subscription.stripeDetails?.cancelAtPeriodEnd ? (
                        <Button
                          onClick={handleReactivate}
                          disabled={isReactivating}
                          className="flex-1"
                        >
                          {isReactivating ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              処理中...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              サブスクリプションを再開
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          onClick={handleCancel}
                          disabled={isCancelling}
                          variant="outline"
                          className="flex-1"
                        >
                          {isCancelling ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              処理中...
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 mr-2" />
                              キャンセル
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 請求履歴 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      請求履歴
                    </CardTitle>
                    <CardDescription>過去の請求書一覧</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {invoices.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-600">請求履歴がありません</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {invoices.map((invoice) => (
                          <div
                            key={invoice.id}
                            className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <FileText className="h-5 w-5 text-slate-600" />
                                <div>
                                  <p className="font-medium text-slate-900">
                                    {invoice.periodStart && invoice.periodEnd
                                      ? `${formatDate(invoice.periodStart)} 〜 ${formatDate(invoice.periodEnd)}`
                                      : invoice.paidAt
                                      ? formatDate(invoice.paidAt)
                                      : '請求書'}
                                  </p>
                                  <p className="text-sm text-slate-600">
                                    {formatCurrency(invoice.amount)} {invoice.currency.toUpperCase()}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              {getInvoiceStatusBadge(invoice.status)}
                              {invoice.hostedInvoiceUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(invoice.hostedInvoiceUrl!, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  請求書を見る
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function SubscriptionPage() {
  return (
    <ProtectedRoute>
      <SubscriptionGuard allowAccess={true}>
        <SubscriptionManagementPage />
      </SubscriptionGuard>
    </ProtectedRoute>
  )
}


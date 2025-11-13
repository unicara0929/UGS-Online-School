'use client'

import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatDate, formatDateTime } from "@/lib/utils/format"
import { useAuth } from "@/contexts/auth-context"
import { Globe, ArrowLeft, UserX } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"

function AccountSettingsPage() {
  const { user } = useAuth()
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userDetails, setUserDetails] = useState<{
    createdAt?: string
    lastLoginAt?: string
  } | null>(null)
  const [cancelForm, setCancelForm] = useState({
    reason: '',
    otherReason: '',
    continuationOption: '',
    agreeContentAccess: false,
    agreeBillingStop: false
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    // ユーザー詳細情報を取得
    const fetchUserDetails = async () => {
      if (!user?.id) return
      
      try {
        const response = await fetch(`/api/auth/profile/${user.id}`, {
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.user) {
            setUserDetails({
              createdAt: data.user.createdAt,
              lastLoginAt: data.user.lastLoginAt
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch user details:', error)
      }
    }

    fetchUserDetails()
  }, [user?.id])

  const cancellationReasons = [
    'コンテンツを視聴する時間がない',
    '金額が高いと感じた',
    '他サービスを利用するため',
    '欲しいテーマの講座/動画がなかった',
    'アプリ/サイトが使いづらい',
    'サポート対応に不満があった',
    '一時的に支出をおさえたい',
    'お試し利用だった',
    'その他'
  ]

  const continuationOptions = [
    { value: 'pause', label: '月額を一時停止したい（休会）' },
    { value: 'cheaper', label: '安いプランに変更したい' },
    { value: 'free', label: '無料会員に変更したい' },
    { value: 'cancel', label: '完全に退会したい' }
  ]

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!cancelForm.reason) {
      newErrors.reason = '退会理由を選択してください'
    }

    if (cancelForm.reason === 'その他' && !cancelForm.otherReason.trim()) {
      newErrors.otherReason = 'その他の理由を入力してください'
    }

    if (cancelForm.otherReason && (cancelForm.otherReason.length < 200 || cancelForm.otherReason.length > 500)) {
      newErrors.otherReason = '200文字以上500文字以下で入力してください'
    }

    if (!cancelForm.continuationOption) {
      newErrors.continuationOption = '継続オプションを選択してください'
    }

    if (!cancelForm.agreeContentAccess) {
      newErrors.agreeContentAccess = 'この項目に同意する必要があります'
    }

    if (!cancelForm.agreeBillingStop) {
      newErrors.agreeBillingStop = 'この項目に同意する必要があります'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCancelRequest = async () => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/user/cancel-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: user?.id,
          name: user?.name,
          email: user?.email,
          reason: cancelForm.reason,
          otherReason: cancelForm.otherReason || null,
          continuationOption: cancelForm.continuationOption,
        }),
      })

      if (!response.ok) {
        throw new Error('退会申請の送信に失敗しました')
      }

      alert('退会申請を受け付けました。運営による確認後、アカウントが削除されます。')
      setShowCancelDialog(false)
      setCancelForm({
        reason: '',
        otherReason: '',
        continuationOption: '',
        agreeContentAccess: false,
        agreeBillingStop: false
      })
      setErrors({})
    } catch (error) {
      alert('退会申請の送信に失敗しました。もう一度お試しください。')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* サイドバー */}
      <Sidebar />

      {/* メインコンテンツ */}
      <div className="flex-1 md:ml-64">
        {/* ヘッダー */}
        <DashboardHeader />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard/settings">
                <Button variant="outline" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">アカウント情報</h1>
                <p className="text-slate-600 mt-1">アカウントの詳細情報と退会申請</p>
              </div>
            </div>

            {/* アカウント情報 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  アカウント情報
                </CardTitle>
                <CardDescription>
                  アカウントの詳細情報
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">ステータス</span>
                  <Badge variant="secondary">
                    {user?.role === "member" ? "UGS会員" : 
                     user?.role === "fp" ? "FPエイド" : 
                     user?.role === "manager" ? "マネージャー" : "運営"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">登録日</span>
                  <span className="text-sm text-slate-600">
                    {userDetails?.createdAt 
                      ? formatDate(userDetails.createdAt) 
                      : '取得中...'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">最終ログイン</span>
                  <span className="text-sm text-slate-600">
                    {userDetails?.lastLoginAt 
                      ? formatDateTime(userDetails.lastLoginAt) 
                      : userDetails?.lastLoginAt === null 
                        ? '未ログイン' 
                        : '取得中...'}
                  </span>
                </div>
                <div className="pt-4 border-t">
                  <Button 
                    variant="destructive" 
                    className="w-full" 
                    onClick={() => setShowCancelDialog(true)}
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    退会申請
                  </Button>
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    退会申請後、運営による確認を経てアカウントが削除されます
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* 退会申請ダイアログ */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">退会申請</DialogTitle>
            <DialogDescription>
              退会申請フォームにご記入ください。運営による確認後、ご指定の対応を実施いたします。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* 会員情報 */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">会員情報</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    氏名 / ニックネーム
                  </label>
                  <input
                    type="text"
                    value={user?.name || ''}
                    disabled
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    登録メールアドレス
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600"
                  />
                </div>
              </div>
            </div>

            {/* 退会理由 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                退会理由 <span className="text-red-500">*</span>
              </label>
              <select
                value={cancelForm.reason}
                onChange={(e) => {
                  setCancelForm({ ...cancelForm, reason: e.target.value })
                  setErrors({ ...errors, reason: '' })
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                  errors.reason ? 'border-red-500' : 'border-slate-300'
                }`}
              >
                <option value="">選択してください</option>
                {cancellationReasons.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
              {errors.reason && (
                <p className="text-sm text-red-500 mt-1">{errors.reason}</p>
              )}
            </div>

            {/* その他の理由 */}
            {cancelForm.reason === 'その他' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  その他の理由・ご意見（任意）
                  <span className="text-slate-500 text-xs ml-2">200〜500文字</span>
                </label>
                <textarea
                  value={cancelForm.otherReason}
                  onChange={(e) => {
                    setCancelForm({ ...cancelForm, otherReason: e.target.value })
                    setErrors({ ...errors, otherReason: '' })
                  }}
                  rows={6}
                  placeholder="「どこが不満でしたか？」「今後あったら使いたい機能は？」などのご意見をお聞かせください"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                    errors.otherReason ? 'border-red-500' : 'border-slate-300'
                  }`}
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.otherReason && (
                    <p className="text-sm text-red-500">{errors.otherReason}</p>
                  )}
                  <p className={`text-xs ml-auto ${
                    cancelForm.otherReason.length < 200 || cancelForm.otherReason.length > 500
                      ? 'text-red-500'
                      : 'text-slate-500'
                  }`}>
                    {cancelForm.otherReason.length} / 200〜500文字
                  </p>
                </div>
              </div>
            )}

            {/* 継続オプション */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                継続オプション <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {continuationOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      cancelForm.continuationOption === option.value
                        ? 'border-slate-600 bg-slate-50'
                        : errors.continuationOption
                        ? 'border-red-500'
                        : 'border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="continuationOption"
                      value={option.value}
                      checked={cancelForm.continuationOption === option.value}
                      onChange={(e) => {
                        setCancelForm({ ...cancelForm, continuationOption: e.target.value })
                        setErrors({ ...errors, continuationOption: '' })
                      }}
                      className="mr-3"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
              {errors.continuationOption && (
                <p className="text-sm text-red-500 mt-1">{errors.continuationOption}</p>
              )}
            </div>

            {/* 同意事項 */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-slate-700 mb-3">同意事項 <span className="text-red-500">*</span></h3>
              <div className="space-y-3">
                <label className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                  cancelForm.agreeContentAccess
                    ? 'border-slate-600 bg-slate-50'
                    : errors.agreeContentAccess
                    ? 'border-red-500'
                    : 'border-slate-300'
                }`}>
                  <input
                    type="checkbox"
                    checked={cancelForm.agreeContentAccess}
                    onChange={(e) => {
                      setCancelForm({ ...cancelForm, agreeContentAccess: e.target.checked })
                      setErrors({ ...errors, agreeContentAccess: '' })
                    }}
                    className="mt-1 mr-3"
                  />
                  <span className="text-sm">
                    退会後は会員限定コンテンツにアクセスできなくなることを理解しました
                  </span>
                </label>
                {errors.agreeContentAccess && (
                  <p className="text-sm text-red-500">{errors.agreeContentAccess}</p>
                )}

                <label className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                  cancelForm.agreeBillingStop
                    ? 'border-slate-600 bg-slate-50'
                    : errors.agreeBillingStop
                    ? 'border-red-500'
                    : 'border-slate-300'
                }`}>
                  <input
                    type="checkbox"
                    checked={cancelForm.agreeBillingStop}
                    onChange={(e) => {
                      setCancelForm({ ...cancelForm, agreeBillingStop: e.target.checked })
                      setErrors({ ...errors, agreeBillingStop: '' })
                    }}
                    className="mt-1 mr-3"
                  />
                  <span className="text-sm">
                    今後の自動更新・請求が停止されることを確認しました
                  </span>
                </label>
                {errors.agreeBillingStop && (
                  <p className="text-sm text-red-500">{errors.agreeBillingStop}</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false)
                setCancelForm({
                  reason: '',
                  otherReason: '',
                  continuationOption: '',
                  agreeContentAccess: false,
                  agreeBillingStop: false
                })
                setErrors({})
              }}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelRequest}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? '送信中...' : '退会申請を送信'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AccountSettingsPageComponent() {
  return (
    <ProtectedRoute>
      <AccountSettingsPage />
    </ProtectedRoute>
  )
}


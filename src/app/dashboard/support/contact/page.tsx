'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { Send, Loader2, CheckCircle2, AlertCircle, HelpCircle, Clock } from 'lucide-react'
import Link from 'next/link'

const CONTACT_TYPES = [
  { value: 'ACCOUNT', label: 'アカウントについて' },
  { value: 'PAYMENT', label: '支払い・請求について' },
  { value: 'CONTENT', label: 'コンテンツについて' },
  { value: 'TECHNICAL', label: '技術的な問題' },
  { value: 'OTHER', label: 'その他' },
]

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: '未対応', color: 'bg-yellow-100 text-yellow-800' },
  IN_PROGRESS: { label: '対応中', color: 'bg-blue-100 text-blue-800' },
  RESOLVED: { label: '対応済み', color: 'bg-green-100 text-green-800' },
  CLOSED: { label: 'クローズ', color: 'bg-slate-100 text-slate-800' },
}

interface ContactSubmission {
  id: string
  type: string
  subject: string | null
  message: string
  status: string
  createdAt: string
}

function ContactPageContent() {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    type: '',
    subject: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)

  // お問い合わせ履歴を取得
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch('/api/contact', { credentials: 'include' })
        const data = await response.json()
        if (data.success) {
          setSubmissions(data.submissions)
        }
      } catch (err) {
        console.error('Failed to fetch contact history:', err)
      } finally {
        setIsLoadingHistory(false)
      }
    }
    fetchHistory()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'お問い合わせの送信に失敗しました')
      }

      setSuccess(true)
      setFormData({ type: '', subject: '', message: '' })

      // 履歴を再取得
      const historyResponse = await fetch('/api/contact', { credentials: 'include' })
      const historyData = await historyResponse.json()
      if (historyData.success) {
        setSubmissions(historyData.submissions)
      }
    } catch (err) {
      console.error('Failed to submit contact form:', err)
      setError(err instanceof Error ? err.message : 'お問い合わせの送信に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClassName = 'w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500'

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 min-w-0 md:ml-64">
        <PageHeader title="お問い合わせ" />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* ヘッダー */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900">お問い合わせ</h2>
              <p className="text-slate-600 mt-1">
                ご質問やお困りのことがありましたら、お気軽にお問い合わせください
              </p>
            </div>

            {/* FAQへの導線 */}
            <Card className="bg-slate-100 border-slate-200">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-slate-600" aria-hidden="true" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-700">
                      お問い合わせの前に、よくある質問をご確認ください
                    </p>
                  </div>
                  <Link href="/dashboard/support/faq">
                    <Button variant="outline" size="sm">
                      FAQを見る
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* 送信完了メッセージ */}
            {success && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden="true" />
                    <div>
                      <p className="font-medium text-green-800">お問い合わせを受け付けました</p>
                      <p className="text-sm text-green-700 mt-1">
                        担当者からの返信をお待ちください。通常2営業日以内にご連絡いたします。
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* エラーメッセージ */}
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600" aria-hidden="true" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* お問い合わせフォーム */}
            <Card>
              <CardHeader>
                <CardTitle>お問い合わせフォーム</CardTitle>
                <CardDescription>
                  以下の項目をご入力の上、送信してください
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* ユーザー情報（読み取り専用） */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        会員番号
                      </label>
                      <input
                        type="text"
                        value={user?.memberId || ''}
                        disabled
                        className={`${inputClassName} bg-slate-100 text-slate-600`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        お名前
                      </label>
                      <input
                        type="text"
                        value={user?.name || ''}
                        disabled
                        className={`${inputClassName} bg-slate-100 text-slate-600`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        メールアドレス
                      </label>
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className={`${inputClassName} bg-slate-100 text-slate-600`}
                        spellCheck={false}
                      />
                    </div>
                  </div>

                  {/* お問い合わせ種別 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      お問い合わせ種別 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className={inputClassName}
                      required
                    >
                      <option value="">選択してください</option>
                      {CONTACT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 件名 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      件名（任意）
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className={inputClassName}
                      placeholder="例: ログインについて"
                      maxLength={100}
                    />
                  </div>

                  {/* お問い合わせ内容 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      お問い合わせ内容 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className={inputClassName}
                      rows={6}
                      placeholder="お問い合わせ内容を詳しくご記入ください"
                      required
                      maxLength={2000}
                    />
                    <p className="text-xs text-slate-500 mt-1 text-right">
                      {formData.message.length}/2000文字
                    </p>
                  </div>

                  {/* 送信ボタン */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full md:w-auto"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                          送信中...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" aria-hidden="true" />
                          送信する
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* お問い合わせ履歴 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">お問い合わせ履歴</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-hidden="true" />
                  </div>
                ) : submissions.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">
                    お問い合わせ履歴はありません
                  </p>
                ) : (
                  <div className="space-y-3">
                    {submissions.map((submission) => (
                      <div
                        key={submission.id}
                        className="p-3 bg-slate-50 rounded-lg border border-slate-200"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${STATUS_LABELS[submission.status]?.color || 'bg-slate-100'}`}>
                              {STATUS_LABELS[submission.status]?.label || submission.status}
                            </span>
                            <span className="text-xs text-slate-500">
                              {CONTACT_TYPES.find(t => t.value === submission.type)?.label || submission.type}
                            </span>
                          </div>
                          <div className="flex items-center text-xs text-slate-500">
                            <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
                            {new Date(submission.createdAt).toLocaleDateString('ja-JP')}
                          </div>
                        </div>
                        {submission.subject && (
                          <p className="font-medium text-slate-700 text-sm">
                            {submission.subject}
                          </p>
                        )}
                        <p className="text-sm text-slate-600 line-clamp-2 mt-1">
                          {submission.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function ContactPage() {
  return (
    <ProtectedRoute requiredRoles={['member', 'fp', 'manager', 'admin']}>
      <ContactPageContent />
    </ProtectedRoute>
  )
}

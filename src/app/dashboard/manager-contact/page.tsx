'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authenticatedFetch } from '@/lib/utils/api-client'
import {
  Phone,
  MessageCircle,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  PartyPopper
} from 'lucide-react'

export default function ManagerContactPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [lineId, setLineId] = useState('')
  const [isAlreadyConfirmed, setIsAlreadyConfirmed] = useState(false)

  // FPエイドまたはFP昇格承認済みでない場合はダッシュボードにリダイレクト
  const [canAccess, setCanAccess] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) return

      // FPロールの場合はアクセス可
      if (user.role === 'fp') {
        setCanAccess(true)
        return
      }

      // FP昇格承認済みかチェック
      try {
        const response = await authenticatedFetch('/api/user/fp-onboarding-status')
        if (response.ok) {
          const data = await response.json()
          if (data.fpPromotionApproved) {
            setCanAccess(true)
            return
          }
        }
      } catch (error) {
        console.error('Error checking FP promotion status:', error)
      }

      // アクセス不可 → ダッシュボードへ
      setCanAccess(false)
      router.push('/dashboard')
    }

    checkAccess()
  }, [user, router])

  // 既存の連絡先情報を取得
  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const response = await authenticatedFetch('/api/user/manager-contact')
        if (response.ok) {
          const data = await response.json()
          setPhone(data.phone || '')
          setLineId(data.lineId || '')
          if (data.confirmed) {
            setIsAlreadyConfirmed(true)
          }
        }
      } catch (err) {
        console.error('Error fetching contact info:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (user?.id) {
      fetchContactInfo()
    }
  }, [user?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!phone.trim()) {
      setError('電話番号を入力してください')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await authenticatedFetch('/api/user/manager-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          lineId: lineId.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '保存に失敗しました')
      }

      // 成功したらコンプライアンステストページへ
      router.push('/dashboard/compliance-test')
    } catch (err: any) {
      console.error('Submit error:', err)
      setError(err.message || '保存に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkipToNext = () => {
    router.push('/dashboard/compliance-test')
  }

  if (isLoading || canAccess === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-600 mx-auto mb-4" />
          <p className="text-slate-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  // アクセス権がない場合は何も表示しない（リダイレクト中）
  if (!canAccess) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* お祝いバナー */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center">
                  <PartyPopper className="h-7 w-7 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-green-900 mb-2">
                  FPエイドへの昇格おめでとうございます！
                </h2>
                <p className="text-green-800">
                  担当マネージャーから、今後の活動についてご連絡いたします。<br />
                  スムーズにご連絡できるよう、最新の連絡先情報をご入力ください。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 連絡先入力フォーム */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Phone className="h-6 w-6" />
              連絡先情報の確認
            </CardTitle>
            <CardDescription>
              マネージャーからの連絡用に、電話番号とLINE IDをご登録ください。
              LINEグループへの招待や、初回面談の日程調整にも使用します。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">エラー</p>
                    <p className="text-sm text-red-600 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {/* 電話番号 */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  電話番号 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="090-1234-5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="text-lg"
                  required
                />
                <p className="text-xs text-slate-500">
                  マネージャーからの電話連絡に使用します。日中連絡の取れる番号をご入力ください。
                </p>
              </div>

              {/* LINE ID */}
              <div className="space-y-2">
                <Label htmlFor="lineId" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  LINE ID <span className="text-slate-400">（任意）</span>
                </Label>
                <Input
                  id="lineId"
                  type="text"
                  placeholder="your_line_id"
                  value={lineId}
                  onChange={(e) => setLineId(e.target.value)}
                  className="text-lg"
                />
                <p className="text-xs text-slate-500">
                  LINEグループへの招待や、普段のコミュニケーションに使用します。
                  入力いただくとスムーズに連絡が取れます。
                </p>
              </div>

              {/* 説明 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">マネージャーからの連絡内容</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>・ 初回コンタクト（ご挨拶・今後の流れのご説明）</li>
                  <li>・ 個別相談・面談日程の調整</li>
                  <li>・ 必要なLINEグループへの招待</li>
                  <li>・ 活動に関するサポート</li>
                </ul>
              </div>

              {/* 送信ボタン */}
              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
                  disabled={isSubmitting || !phone.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      確認して次へ進む
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>

              {/* 既に確認済みの場合のスキップリンク */}
              {isAlreadyConfirmed && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={handleSkipToNext}
                    className="text-sm text-slate-500 hover:text-slate-700 underline"
                  >
                    情報を変更せずに次へ進む
                  </button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* 次のステップ説明 */}
        <Card>
          <CardContent className="pt-6">
            <h4 className="font-medium text-slate-700 mb-3">次のステップ</h4>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-sm font-medium text-slate-600">
                1
              </div>
              <div>
                <p className="font-medium text-slate-700">コンプライアンステスト</p>
                <p className="text-sm text-slate-500">
                  FPエイドとして活動するために必要な知識を確認するテストです（合格ライン: 90%）
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 mt-4">
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-sm font-medium text-slate-600">
                2
              </div>
              <div>
                <p className="font-medium text-slate-700">ガイダンス動画</p>
                <p className="text-sm text-slate-500">
                  FPエイドとしての活動内容やルールを説明する動画を視聴していただきます
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

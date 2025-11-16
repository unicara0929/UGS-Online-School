'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { authenticatedFetch } from '@/lib/utils/api-client'
import { Copy, Check, Users, Gift, TrendingUp, Loader2 } from 'lucide-react'

export default function ReferralsPage() {
  const { user } = useAuth()
  const [referralCode, setReferralCode] = useState('')
  const [referralLink, setReferralLink] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isCopied, setIsCopied] = useState(false)
  const [referralStats, setReferralStats] = useState({
    totalReferrals: 0,
    pendingReferrals: 0,
    approvedReferrals: 0
  })

  useEffect(() => {
    fetchReferralData()
  }, [])

  const fetchReferralData = async () => {
    setIsLoading(true)
    try {
      // 紹介コードを取得
      const codeResponse = await authenticatedFetch('/api/user/referral-code')
      if (codeResponse.ok) {
        const data = await codeResponse.json()
        setReferralCode(data.referralCode)
        setReferralLink(data.referralLink)
      }

      // 紹介実績を取得
      const statsResponse = await authenticatedFetch('/api/user/referral-stats')
      if (statsResponse.ok) {
        const stats = await statsResponse.json()
        setReferralStats(stats)
      }
    } catch (error) {
      console.error('Failed to fetch referral data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-600 mx-auto mb-4" />
          <p className="text-slate-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">紹介プログラム</h1>
          <p className="text-slate-600 mt-2">
            友達を紹介して、一緒に成長しましょう
          </p>
        </div>

        {/* 紹介リンク */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              あなたの紹介リンク
            </CardTitle>
            <CardDescription>
              このリンクを友達に共有して、UGSオンラインスクールに招待しましょう
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                紹介コード
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 bg-slate-100 border border-slate-300 rounded-lg font-mono text-lg font-bold text-slate-900">
                  {referralCode}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                紹介リンク
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 bg-slate-100 border border-slate-300 rounded-lg text-sm text-slate-700 overflow-x-auto">
                  {referralLink}
                </div>
                <Button
                  onClick={handleCopy}
                  variant={isCopied ? "default" : "outline"}
                  className="flex-shrink-0"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      コピー済み
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      コピー
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>使い方:</strong> このリンクを友達に共有してください。友達がリンク経由で登録・決済を完了すると、自動的にあなたの紹介として記録されます。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 紹介実績 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Users className="h-4 w-4" />
                総紹介数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {referralStats.totalReferrals}
              </div>
              <p className="text-xs text-slate-500 mt-1">紹介した人数</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                承認済み
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {referralStats.approvedReferrals}
              </div>
              <p className="text-xs text-slate-500 mt-1">承認された紹介</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Loader2 className="h-4 w-4" />
                審査中
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">
                {referralStats.pendingReferrals}
              </div>
              <p className="text-xs text-slate-500 mt-1">審査中の紹介</p>
            </CardContent>
          </Card>
        </div>

        {/* 注意事項 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">紹介プログラムについて</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 text-xs font-bold">1</span>
              </div>
              <p>
                紹介リンクを友達に共有してください。メール、SNS、メッセージアプリなど、どの方法でも構いません。
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 text-xs font-bold">2</span>
              </div>
              <p>
                友達がリンク経由で登録し、決済を完了すると、自動的にあなたの紹介として記録されます。
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 text-xs font-bold">3</span>
              </div>
              <p>
                紹介実績は自動的に集計され、このページで確認できます。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

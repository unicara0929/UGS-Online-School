'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { authenticatedFetch } from '@/lib/utils/api-client'
import { Copy, Check, Users, Gift, TrendingUp, Loader2 } from 'lucide-react'
import { Sidebar } from '@/components/navigation/sidebar'
import { ProtectedRoute } from '@/components/auth/protected-route'

function ReferralsPageContent() {
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

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 md:ml-64 min-w-0 overflow-x-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-600 mx-auto mb-4" />
              <p className="text-slate-600">読み込み中...</p>
            </div>
          </div>
        ) : (
          <div className="py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* ヘッダー */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">紹介プログラム</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-2">
            友達を紹介して、一緒に成長しましょう
          </p>
        </div>

        {/* 紹介リンク */}
        <Card className="shadow-lg">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Gift className="h-4 w-4 sm:h-5 sm:w-5" />
              あなたの紹介リンク
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              このリンクを友達に共有して、UGSに招待しましょう
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                紹介コード
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-2 sm:p-3 bg-slate-100 border border-slate-300 rounded-lg font-mono text-base sm:text-lg font-bold text-slate-900">
                  {referralCode}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                紹介リンク
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 p-2 sm:p-3 bg-slate-100 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-700 break-all">
                  {referralLink}
                </div>
                <Button
                  onClick={handleCopy}
                  variant={isCopied ? "default" : "outline"}
                  className="flex-shrink-0 w-full sm:w-auto"
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

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-blue-800">
                <strong>使い方:</strong> このリンクを友達に共有してください。友達がリンク経由で登録・決済を完了すると、自動的にあなたの紹介として記録されます。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 紹介実績 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 flex items-center gap-2">
                <Users className="h-4 w-4" />
                総紹介数
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                {referralStats.totalReferrals}
              </div>
              <p className="text-xs text-slate-500 mt-1">紹介した人数</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                承認済み
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-2xl sm:text-3xl font-bold text-green-600">
                {referralStats.approvedReferrals}
              </div>
              <p className="text-xs text-slate-500 mt-1">承認された紹介</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 flex items-center gap-2">
                <Loader2 className="h-4 w-4" />
                審査中
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-2xl sm:text-3xl font-bold text-amber-600">
                {referralStats.pendingReferrals}
              </div>
              <p className="text-xs text-slate-500 mt-1">審査中の紹介</p>
            </CardContent>
          </Card>
        </div>

        {/* 注意事項 */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">紹介プログラムについて</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-3 text-xs sm:text-sm text-slate-600">
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
        )}
      </div>
    </div>
  )
}

export default function ReferralsPage() {
  return (
    <ProtectedRoute>
      <ReferralsPageContent />
    </ProtectedRoute>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  Copy, 
  CheckCircle, 
  XCircle, 
  Clock,
  DollarSign,
  Share2,
  Loader2
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"

interface Referral {
  id: string
  referrerId: string
  referredId: string
  referralType: 'MEMBER' | 'FP'
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REWARDED'
  rewardAmount: number | null
  rewardPaidAt: string | null
  createdAt: string
  referred: {
    id: string
    name: string
    email: string
    role: string
  }
}

export function ReferralDashboard() {
  const { user } = useAuth()
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCopying, setIsCopying] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (user?.id) {
      fetchReferrals()
      fetchReferralCode()
    }
  }, [user?.id])

  const fetchReferrals = async () => {
    if (!user?.id) return

    try {
      const response = await fetch(`/api/referrals?userId=${user.id}`)
      if (!response.ok) {
        throw new Error('紹介一覧の取得に失敗しました')
      }
      const data = await response.json()
      setReferrals(data.referrals || [])
    } catch (error) {
      console.error('Error fetching referrals:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchReferralCode = async () => {
    if (!user?.id) return

    try {
      // ユーザープロファイルから紹介コードを取得
      const response = await fetch(`/api/auth/profile/${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setReferralCode(data.user?.referralCode || null)
      }
    } catch (error) {
      console.error('Error fetching referral code:', error)
    }
  }

  const copyReferralCode = async () => {
    if (!referralCode) return

    setIsCopying(true)
    try {
      const referralUrl = `${window.location.origin}/register?ref=${referralCode}`
      await navigator.clipboard.writeText(referralUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    } finally {
      setIsCopying(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800">承認済み</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800">却下</Badge>
      case 'REWARDED':
        return <Badge className="bg-blue-100 text-blue-800">報酬支払済み</Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">審査中</Badge>
    }
  }

  const getReferralTypeLabel = (type: string) => {
    return type === 'MEMBER' ? 'UGS会員紹介' : 'FPエイド紹介'
  }

  const totalReward = referrals
    .filter(r => r.status === 'APPROVED' || r.status === 'REWARDED')
    .reduce((sum, r) => sum + (r.rewardAmount || 0), 0)

  const memberReferrals = referrals.filter(r => r.referralType === 'MEMBER').length
  const fpReferrals = referrals.filter(r => r.referralType === 'FP').length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 紹介コード表示 */}
      {referralCode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Share2 className="h-5 w-5 mr-2" />
              あなたの紹介コード
            </CardTitle>
            <CardDescription>
              このコードを共有して、新しいメンバーを紹介してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="flex-1 bg-slate-100 rounded-lg px-4 py-3 font-mono text-lg font-bold">
                {referralCode}
              </div>
              <Button
                onClick={copyReferralCode}
                disabled={isCopying}
                variant="outline"
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    コピーしました
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    コピー
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-slate-600 mt-2">
              紹介リンク: <span className="font-mono text-xs">{window.location.origin}/register?ref={referralCode}</span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* 紹介統計 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総紹介数</CardTitle>
            <Users className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referrals.length}</div>
            <p className="text-xs text-slate-600">名</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">UGS会員紹介</CardTitle>
            <Users className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memberReferrals}</div>
            <p className="text-xs text-slate-600">名</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">FPエイド紹介</CardTitle>
            <Users className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fpReferrals}</div>
            <p className="text-xs text-slate-600">名</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総報酬額</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalReward)}</div>
            <p className="text-xs text-slate-600">承認済み</p>
          </CardContent>
        </Card>
      </div>

      {/* 紹介一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>紹介一覧</CardTitle>
          <CardDescription>あなたが紹介したメンバーの一覧</CardDescription>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">まだ紹介がありません</p>
              <p className="text-sm text-slate-500 mt-2">紹介コードを共有して、新しいメンバーを紹介しましょう</p>
            </div>
          ) : (
            <div className="space-y-4">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                        <span className="text-slate-700 font-medium">
                          {referral.referred.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{referral.referred.name}</p>
                        <p className="text-sm text-slate-600">{referral.referred.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-slate-600">{getReferralTypeLabel(referral.referralType)}</p>
                      {referral.rewardAmount && (
                        <p className="text-sm font-medium text-slate-900">
                          {formatCurrency(referral.rewardAmount)}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(referral.status)}
                    <div className="text-sm text-slate-500">
                      {new Date(referral.createdAt).toLocaleDateString('ja-JP')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


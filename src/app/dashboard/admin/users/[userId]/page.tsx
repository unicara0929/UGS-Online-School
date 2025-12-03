'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, CreditCard, AlertCircle, UserCheck, FileText, Users, Building2, UserPlus, TrendingUp, MessageCircle } from 'lucide-react'
import { getRoleLabel, getRoleBadgeVariant, formatDate } from '@/lib/utils/user-helpers'

interface UserDetail {
  // 基本情報
  id: string
  email: string
  name: string
  role: string

  // プロフィール情報
  phone: string | null
  lineId: string | null
  address: string | null
  bio: string | null
  attribute: string | null
  gender: string | null
  birthDate: string | null
  prefecture: string | null
  profileImageUrl: string | null

  // 会員管理情報
  membershipStatus: string
  membershipStatusReason: string | null
  membershipStatusChangedAt: string | null
  membershipStatusChangedBy: string | null
  canceledAt: string | null
  cancellationReason: string | null
  delinquentSince: string | null
  reactivatedAt: string | null

  // その他
  referralCode: string | null
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string

  // リレーション情報
  subscription: any
  referrer: {
    id: string
    name: string
    email: string
    role: string
  } | null
  referralInfo: any
  fpPromotionApplication: any

  // 紹介統計（このユーザーが紹介した人数）
  referralStats: {
    total: number
    totalApproved: number
    member: {
      total: number
      approved: number
    }
    fp: {
      total: number
      approved: number
    }
  }
  compensationBankAccount: {
    id: string
    bankName: string
    branchName: string | null
    branchNumber: string | null
    accountType: string
    accountNumber: string
    accountHolderName: string
    isYuchoBank: boolean
    yuchoSymbol: string | null
    yuchoNumber: string | null
    lastModifiedBy: string | null
    createdAt: string
    updatedAt: string
  } | null

  // Supabase認証情報
  supabaseAuth: {
    emailConfirmedAt: string | null
    lastSignInAt: string | null
    createdAt: string
  } | null
  hasSupabaseAuth: boolean
}

const getMembershipStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    PENDING: '仮登録',
    ACTIVE: '有効会員',
    PAST_DUE: '支払い遅延',
    DELINQUENT: '長期滞納',
    CANCELLATION_PENDING: '退会予定',
    CANCELED: '退会済み',
    TERMINATED: '強制解約',
    EXPIRED: '期限切れ',
  }
  return labels[status] || status
}

const getMembershipStatusVariant = (status: string) => {
  const variants: Record<string, any> = {
    ACTIVE: 'default',
    PENDING: 'secondary',
    PAST_DUE: 'destructive',
    DELINQUENT: 'destructive',
    CANCELLATION_PENDING: 'secondary',
    CANCELED: 'outline',
    TERMINATED: 'destructive',
    EXPIRED: 'outline',
  }
  return variants[status] || 'outline'
}

export default function UserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string

  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUserDetail()
  }, [userId])

  const fetchUserDetail = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/users/${userId}`, {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('ユーザー情報の取得に失敗しました')
      }
      const data = await response.json()
      setUser(data.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <User className="h-10 w-10 text-white animate-pulse" />
            </div>
            <div className="absolute inset-0 w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto animate-ping opacity-20"></div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">ユーザー情報を読み込み中...</h2>
          <p className="text-slate-600">データを取得しています</p>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto p-6">
          <Button
            onClick={() => router.push('/dashboard/admin/users')}
            variant="outline"
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            ユーザー一覧に戻る
          </Button>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-800">{error || 'ユーザーが見つかりません'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto p-6 space-y-6">
        {/* 戻るボタン */}
        <Button
          onClick={() => router.push('/dashboard/admin/users')}
          variant="outline"
          className="bg-white hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          ユーザー一覧に戻る
        </Button>

        {/* ヘッダーセクション */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-2xl border-4 border-white/30">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-4xl font-bold mb-2">{user.name}</h1>
                  <p className="text-blue-100 text-lg mb-3">{user.email}</p>
                  <div className="flex items-center space-x-3">
                    <Badge variant={getRoleBadgeVariant(user.role)} className="text-sm px-3 py-1">
                      {getRoleLabel(user.role)}
                    </Badge>
                    <Badge 
                      variant={getMembershipStatusVariant(user.membershipStatus)} 
                      className="text-sm px-3 py-1"
                    >
                      {getMembershipStatusLabel(user.membershipStatus)}
                    </Badge>
                    {!user.hasSupabaseAuth && (
                      <Badge variant="destructive" className="text-sm px-3 py-1">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        認証なし
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* プロフィール情報 */}
          <Card className="shadow-xl border-slate-200">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
              <CardTitle className="flex items-center text-slate-800">
                <User className="h-5 w-5 mr-2 text-blue-600" />
                プロフィール情報
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <InfoRow icon={<Phone className="h-4 w-4" />} label="電話番号" value={user.phone || '未設定'} />
              <InfoRow icon={<MessageCircle className="h-4 w-4" />} label="LINE ID" value={user.lineId || '未設定'} />
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="都道府県" value={user.prefecture || '未設定'} />
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="住所" value={user.address || '未設定'} />
              <InfoRow icon={<User className="h-4 w-4" />} label="性別" value={user.gender || '未設定'} />
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="生年月日" value={user.birthDate ? formatDate(user.birthDate) : '未設定'} />
              <InfoRow icon={<FileText className="h-4 w-4" />} label="属性" value={user.attribute || '未設定'} />
              {user.bio && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-sm font-semibold text-slate-600 mb-2">自己紹介</p>
                  <p className="text-slate-700 whitespace-pre-wrap">{user.bio}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 会員管理情報 */}
          <Card className="shadow-xl border-slate-200">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
              <CardTitle className="flex items-center text-slate-800">
                <UserCheck className="h-5 w-5 mr-2 text-blue-600" />
                会員管理情報
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <InfoRow 
                icon={<AlertCircle className="h-4 w-4" />} 
                label="会員ステータス" 
                value={getMembershipStatusLabel(user.membershipStatus)} 
              />
              {user.membershipStatusChangedAt && (
                <InfoRow 
                  icon={<Calendar className="h-4 w-4" />} 
                  label="ステータス変更日時" 
                  value={formatDate(user.membershipStatusChangedAt)} 
                />
              )}
              {user.membershipStatusReason && (
                <InfoRow 
                  icon={<FileText className="h-4 w-4" />} 
                  label="変更理由" 
                  value={user.membershipStatusReason} 
                />
              )}
              {user.membershipStatusChangedBy && (
                <InfoRow
                  icon={<User className="h-4 w-4" />}
                  label="変更者"
                  value={user.membershipStatusChangedBy}
                />
              )}
              {user.canceledAt && (
                <InfoRow 
                  icon={<Calendar className="h-4 w-4" />} 
                  label="退会日" 
                  value={formatDate(user.canceledAt)} 
                />
              )}
              {user.cancellationReason && (
                <InfoRow 
                  icon={<FileText className="h-4 w-4" />} 
                  label="退会理由" 
                  value={user.cancellationReason} 
                />
              )}
              {user.delinquentSince && (
                <InfoRow 
                  icon={<Calendar className="h-4 w-4" />} 
                  label="滞納開始日" 
                  value={formatDate(user.delinquentSince)} 
                />
              )}
              {user.reactivatedAt && (
                <InfoRow 
                  icon={<Calendar className="h-4 w-4" />} 
                  label="再開日" 
                  value={formatDate(user.reactivatedAt)} 
                />
              )}
            </CardContent>
          </Card>

          {/* 認証情報 */}
          <Card className="shadow-xl border-slate-200">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
              <CardTitle className="flex items-center text-slate-800">
                <Mail className="h-5 w-5 mr-2 text-blue-600" />
                認証情報
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="登録日" value={formatDate(user.createdAt)} />
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="更新日" value={formatDate(user.updatedAt)} />
              <InfoRow 
                icon={<Calendar className="h-4 w-4" />} 
                label="最終ログイン" 
                value={user.lastLoginAt ? formatDate(user.lastLoginAt) : '未ログイン'} 
              />
              {user.supabaseAuth && (
                <>
                  <InfoRow 
                    icon={<Mail className="h-4 w-4" />} 
                    label="メール認証日" 
                    value={user.supabaseAuth.emailConfirmedAt ? formatDate(user.supabaseAuth.emailConfirmedAt) : '未認証'} 
                  />
                  <InfoRow 
                    icon={<Calendar className="h-4 w-4" />} 
                    label="最終サインイン" 
                    value={user.supabaseAuth.lastSignInAt ? formatDate(user.supabaseAuth.lastSignInAt) : '未サインイン'} 
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* 紹介情報 */}
          <Card className="shadow-xl border-slate-200">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
              <CardTitle className="flex items-center text-slate-800">
                <Users className="h-5 w-5 mr-2 text-blue-600" />
                紹介情報
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <InfoRow
                icon={<FileText className="h-4 w-4" />}
                label="紹介コード"
                value={user.referralCode || '未設定'}
              />

              {/* 紹介した人数（タイプ別） */}
              <div className="pt-4 border-t border-slate-200">
                <p className="text-sm font-semibold text-slate-600 mb-3">紹介した人数</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center mb-1">
                      <TrendingUp className="h-4 w-4 text-slate-500 mr-1" />
                    </div>
                    <p className="text-2xl font-bold text-slate-700">{user.referralStats?.total ?? 0}</p>
                    <p className="text-xs text-slate-500">紹介合計</p>
                    <p className="text-xs text-slate-400">承認: {user.referralStats?.totalApproved ?? 0}件</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center mb-1">
                      <UserPlus className="h-4 w-4 text-blue-500 mr-1" />
                    </div>
                    <p className="text-2xl font-bold text-blue-700">{user.referralStats?.fp.total ?? 0}</p>
                    <p className="text-xs text-blue-600">FPエイド</p>
                    <p className="text-xs text-blue-400">承認: {user.referralStats?.fp.approved ?? 0}件</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center mb-1">
                      <UserPlus className="h-4 w-4 text-emerald-500 mr-1" />
                    </div>
                    <p className="text-2xl font-bold text-emerald-700">{user.referralStats?.member.total ?? 0}</p>
                    <p className="text-xs text-emerald-600">UGS会員</p>
                    <p className="text-xs text-emerald-400">承認: {user.referralStats?.member.approved ?? 0}件</p>
                  </div>
                </div>
              </div>

              {user.referrer ? (
                <>
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-sm font-semibold text-slate-600 mb-3">紹介者情報（このユーザーを紹介した人）</p>
                    <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                      <InfoRow icon={<User className="h-4 w-4" />} label="名前" value={user.referrer.name} />
                      <InfoRow icon={<Mail className="h-4 w-4" />} label="メール" value={user.referrer.email} />
                      <InfoRow icon={<UserCheck className="h-4 w-4" />} label="ロール" value={getRoleLabel(user.referrer.role)} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-slate-500 text-sm">紹介者なし（直接登録）</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* サブスクリプション情報 */}
          {user.subscription && (
            <Card className="shadow-xl border-slate-200 lg:col-span-2">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
                <CardTitle className="flex items-center text-slate-800">
                  <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
                  サブスクリプション情報
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow
                    icon={<FileText className="h-4 w-4" />}
                    label="Stripe カスタマーID"
                    value={user.subscription.stripeCustomerId || '未設定'}
                  />
                  <InfoRow
                    icon={<FileText className="h-4 w-4" />}
                    label="Stripe サブスクリプションID"
                    value={user.subscription.stripeSubscriptionId || '未設定'}
                  />
                  <InfoRow
                    icon={<AlertCircle className="h-4 w-4" />}
                    label="ステータス"
                    value={user.subscription.status}
                  />
                  <InfoRow
                    icon={<Calendar className="h-4 w-4" />}
                    label="現在の期間終了日"
                    value={user.subscription.currentPeriodEnd ? formatDate(user.subscription.currentPeriodEnd) : '未設定'}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* 報酬受け取り口座情報 (FP/Manager のみ) */}
          {(user.role === 'FP' || user.role === 'MANAGER') && user.compensationBankAccount && (
            <Card className="shadow-xl border-slate-200 lg:col-span-2">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
                <CardTitle className="flex items-center text-slate-800">
                  <Building2 className="h-5 w-5 mr-2 text-blue-600" />
                  報酬受け取り口座情報
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow
                    icon={<Building2 className="h-4 w-4" />}
                    label="金融機関名"
                    value={user.compensationBankAccount.bankName}
                  />
                  {user.compensationBankAccount.isYuchoBank ? (
                    <>
                      <InfoRow
                        icon={<FileText className="h-4 w-4" />}
                        label="銀行種別"
                        value="ゆうちょ銀行"
                      />
                      <InfoRow
                        icon={<FileText className="h-4 w-4" />}
                        label="記号"
                        value={user.compensationBankAccount.yuchoSymbol || '未設定'}
                      />
                      <InfoRow
                        icon={<FileText className="h-4 w-4" />}
                        label="番号"
                        value={user.compensationBankAccount.yuchoNumber || '未設定'}
                      />
                    </>
                  ) : (
                    <>
                      <InfoRow
                        icon={<Building2 className="h-4 w-4" />}
                        label="支店名"
                        value={user.compensationBankAccount.branchName || '未設定'}
                      />
                      <InfoRow
                        icon={<FileText className="h-4 w-4" />}
                        label="支店番号"
                        value={user.compensationBankAccount.branchNumber || '未設定'}
                      />
                    </>
                  )}
                  <InfoRow
                    icon={<CreditCard className="h-4 w-4" />}
                    label="口座種別"
                    value={
                      user.compensationBankAccount.accountType === 'NORMAL' ? '普通預金' :
                      user.compensationBankAccount.accountType === 'CHECKING' ? '当座預金' :
                      user.compensationBankAccount.accountType === 'SAVINGS' ? '貯蓄預金' :
                      user.compensationBankAccount.accountType
                    }
                  />
                  <InfoRow
                    icon={<FileText className="h-4 w-4" />}
                    label="口座番号"
                    value={user.compensationBankAccount.accountNumber}
                  />
                  <InfoRow
                    icon={<User className="h-4 w-4" />}
                    label="口座名義"
                    value={user.compensationBankAccount.accountHolderName}
                  />
                  <InfoRow
                    icon={<Calendar className="h-4 w-4" />}
                    label="登録日"
                    value={formatDate(user.compensationBankAccount.createdAt)}
                  />
                  <InfoRow
                    icon={<Calendar className="h-4 w-4" />}
                    label="最終更新日"
                    value={formatDate(user.compensationBankAccount.updatedAt)}
                  />
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200 bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <AlertCircle className="h-4 w-4 inline mr-2" />
                    <strong>セキュリティ情報:</strong> この口座情報は報酬支払いに使用されます。変更する場合は必ずユーザー本人に確認してください。
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-600">{label}</p>
        <p className="text-slate-900 break-words">{value}</p>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { authenticatedFetch } from '@/lib/utils/api-client'
import { handleApiResponse } from '@/lib/utils/api-helpers-client'
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from 'next/navigation'
import {
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  MessageSquare,
  Award,
  Loader2,
  ArrowRight,
  ClipboardList,
  AlertTriangle
} from "lucide-react"

interface PromotionConditions {
  lpMeetingCompleted: boolean
  surveyCompleted: boolean
  isEligible: boolean
}

interface ApplicationStatus {
  hasApplication: boolean
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | null
  appliedAt: string | null
  approvedAt: string | null
}

interface PreInterviewStatus {
  hasScheduledMeeting: boolean
  meetingScheduledAt: string | null
  preInterviewStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | null
  preInterviewDueDate: string | null
}

export function FPPromotion() {
  const { user } = useAuth()
  const router = useRouter()
  const [isApplying, setIsApplying] = useState(false)
  const [conditions, setConditions] = useState<PromotionConditions>({
    lpMeetingCompleted: false,
    surveyCompleted: false,
    isEligible: false
  })
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus>({
    hasApplication: false,
    status: null,
    appliedAt: null,
    approvedAt: null
  })
  const [preInterviewStatus, setPreInterviewStatus] = useState<PreInterviewStatus>({
    hasScheduledMeeting: false,
    meetingScheduledAt: null,
    preInterviewStatus: null,
    preInterviewDueDate: null
  })
  const [isLoading, setIsLoading] = useState(true)

  /**
   * 既存のアプリケーション情報を取得
   */
  const fetchExistingApplication = async () => {
    if (!user?.id) return

    try {
      const response = await authenticatedFetch(`/api/user/fp-promotion-application?userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.application) {
          setApplicationStatus({
            hasApplication: true,
            status: data.application.status,
            appliedAt: data.application.appliedAt,
            approvedAt: data.application.approvedAt
          })
        }
      }
    } catch (error) {
      console.error('Error fetching existing application:', error)
    }
  }

  /**
   * 事前アンケート状況を取得
   */
  const fetchPreInterviewStatus = async () => {
    try {
      const response = await authenticatedFetch('/api/pre-interview')
      if (response.ok) {
        const data = await response.json()
        if (data.response) {
          setPreInterviewStatus({
            hasScheduledMeeting: true,
            meetingScheduledAt: data.response.lpMeeting?.scheduledAt || null,
            preInterviewStatus: data.response.status,
            preInterviewDueDate: data.response.dueDate
          })
        }
      }
    } catch (error) {
      console.error('Error fetching pre-interview status:', error)
    }
  }

  /**
   * 昇格条件を取得
   * 根本的な解決: 認証が必要なAPIなので、authenticatedFetchを使用して認証トークンを送信
   */
  const fetchPromotionConditions = async () => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      // 認証が必要なAPIなので、authenticatedFetchを使用（タイムアウトはAbortSignalで設定）
      const response = await authenticatedFetch(
        `/api/promotions/eligibility?userId=${user.id}&targetRole=fp`,
        {
          signal: AbortSignal.timeout(10000) // 10秒タイムアウト
        }
      )

      const data = await handleApiResponse<{
        success: boolean
        eligibility?: {
          conditions?: {
            lpMeetingCompleted?: boolean
            surveyCompleted?: boolean
          }
          isEligible?: boolean
        }
      }>(response)

      setConditions({
        lpMeetingCompleted: data.eligibility?.conditions?.lpMeetingCompleted || false,
        surveyCompleted: data.eligibility?.conditions?.surveyCompleted || false,
        isEligible: data.eligibility?.isEligible || false
      })
    } catch (error: any) {
      console.error('Error fetching promotion conditions:', error)
      // エラーを表示するが、ページは表示する
    } finally {
      setIsLoading(false)
    }
  }

  const handlePromotionApplication = async () => {
    if (!conditions.isEligible) {
      alert('昇格条件をすべて満たしてください')
      return
    }

    setIsApplying(true)
    try {
      const response = await authenticatedFetch('/api/user/fp-promotion-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '申請に失敗しました')
      }

      alert('FPエイド昇格申請を送信しました。運営による確認後、昇格が完了します。')
      await fetchPromotionConditions()
      await fetchExistingApplication()
    } catch (error: any) {
      console.error('Application error:', error)
      alert(error.message || '申請に失敗しました')
    } finally {
      setIsApplying(false)
    }
  }

  // useEffectは関数定義の後に配置
  useEffect(() => {
    if (user?.id) {
      fetchPromotionConditions()
      fetchExistingApplication()
      fetchPreInterviewStatus()
    }
  }, [user?.id])

  const completedCount = [
    conditions.lpMeetingCompleted,
    conditions.surveyCompleted
  ].filter(Boolean).length

  if (user?.role !== 'member') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Award className="h-5 w-5 mr-2" />
            FPエイド昇格
          </CardTitle>
          <CardDescription>
            既にFPエイド以上に昇格済みです
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="text-slate-600">おめでとうございます！FPエイドに昇格済みです。</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Award className="h-5 w-5 mr-2" />
          FPエイド昇格
        </CardTitle>
        <CardDescription>
          FPエイド昇格に必要な条件を確認し、申請を行います
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* 昇格条件 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">昇格条件</h3>
            <div className="space-y-4">
              <div className="p-4 border border-slate-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-slate-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h4 className="font-medium">LP面談完了</h4>
                        <p className="text-sm text-slate-600">ライフプランナーとの面談を完了する</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {conditions.lpMeetingCompleted ? (
                          <Badge className="bg-green-100 text-green-800">完了</Badge>
                        ) : (
                          <>
                            <Badge variant="secondary">未完了</Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push('/dashboard/lp-meeting/request')}
                              className="whitespace-nowrap"
                            >
                              面談を予約
                              <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-slate-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-slate-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h4 className="font-medium">アンケート提出</h4>
                        <p className="text-sm text-slate-600">初回アンケート（10設問）を提出する</p>
                        {!conditions.lpMeetingCompleted && (
                          <p className="text-xs text-orange-600 mt-1">※ LP面談完了後に回答可能</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {conditions.surveyCompleted ? (
                          <Badge className="bg-green-100 text-green-800">完了</Badge>
                        ) : conditions.lpMeetingCompleted ? (
                          <>
                            <Badge variant="secondary">未完了</Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push('/dashboard/survey')}
                              className="whitespace-nowrap"
                            >
                              アンケートに回答
                              <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                          </>
                        ) : (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-500">ロック中</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 進捗サマリー */}
          <div className="bg-slate-50 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">昇格進捗</span>
              <span className="text-sm text-slate-600">{completedCount}/2 完了</span>
            </div>
            <Progress value={(completedCount / 2) * 100} className="h-2" />
            <p className="text-xs text-slate-600 mt-2">
              全条件を満たすと昇格申請が可能になります
            </p>
          </div>

          {/* 事前アンケート促進バナー */}
          {preInterviewStatus.hasScheduledMeeting &&
           preInterviewStatus.preInterviewStatus !== 'COMPLETED' &&
           !conditions.lpMeetingCompleted && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <ClipboardList className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-blue-800">事前アンケートにご回答ください</h4>
                    {preInterviewStatus.preInterviewStatus === 'IN_PROGRESS' ? (
                      <Badge className="bg-blue-100 text-blue-800 text-xs">回答中</Badge>
                    ) : (
                      <Badge className="bg-orange-100 text-orange-800 text-xs">未回答</Badge>
                    )}
                  </div>
                  <p className="text-sm text-blue-700 mb-3">
                    LP面談をより有意義にするため、事前アンケートへのご回答をお願いします。
                    {preInterviewStatus.meetingScheduledAt && (
                      <span className="block mt-1 text-xs">
                        面談予定日: {new Date(preInterviewStatus.meetingScheduledAt).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                  </p>
                  {preInterviewStatus.preInterviewDueDate &&
                   new Date(preInterviewStatus.preInterviewDueDate) < new Date() && (
                    <div className="flex items-center gap-1 text-xs text-red-600 mb-3">
                      <AlertTriangle className="h-3 w-3" />
                      <span>回答期限を過ぎています。お早めにご回答ください。</span>
                    </div>
                  )}
                  <Button
                    size="sm"
                    onClick={() => router.push('/dashboard/pre-interview')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <ClipboardList className="h-4 w-4 mr-2" />
                    {preInterviewStatus.preInterviewStatus === 'IN_PROGRESS' ? '回答を続ける' : 'アンケートに回答する'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 申請ステータスバナー */}
          {applicationStatus.hasApplication && applicationStatus.status === 'PENDING' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <h4 className="font-semibold text-yellow-800">審査中</h4>
              </div>
              <p className="text-sm text-yellow-700">
                昇格申請が審査中です。管理者による審査が完了するまでお待ちください。
              </p>
              {applicationStatus.appliedAt && (
                <p className="text-xs text-yellow-600 mt-2">
                  申請日: {new Date(applicationStatus.appliedAt).toLocaleDateString('ja-JP')}
                </p>
              )}
            </div>
          )}

          {applicationStatus.hasApplication && applicationStatus.status === 'REJECTED' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <h4 className="font-semibold text-red-800">申請が却下されました</h4>
              </div>
              <p className="text-sm text-red-700">
                昇格申請が却下されました。通知を確認し、条件を再度確認してから再申請してください。
              </p>
            </div>
          )}

          {/* 昇格申請 */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">昇格申請</h3>

            {/* 申請ボタン - 条件達成後、申請前のみ表示 */}
            {conditions.isEligible && !applicationStatus.hasApplication && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h4 className="font-semibold text-green-800">昇格条件を達成しました！</h4>
                  </div>
                  <p className="text-sm text-green-700">
                    全ての昇格条件を満たしました。下のボタンをクリックして昇格申請を行ってください。
                  </p>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  disabled={isApplying}
                  onClick={handlePromotionApplication}
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      申請中...
                    </>
                  ) : (
                    <>
                      <Award className="h-4 w-4 mr-2" />
                      FPエイド昇格申請
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* 条件未達成の場合 */}
            {!conditions.isEligible && !applicationStatus.hasApplication && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                <p className="text-sm text-slate-600 mb-4">
                  すべての昇格条件を満たすと、昇格申請ボタンが有効になります
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                  <span>進捗: {completedCount}/2</span>
                </div>
              </div>
            )}

            {/* 申請済みの場合（審査中・承認済みなど）はステータスバナーで表示済み */}
            {applicationStatus.hasApplication && applicationStatus.status !== 'REJECTED' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-sm text-slate-600">
                  昇格申請は送信済みです。上部のステータスをご確認ください。
                </p>
              </div>
            )}

            {/* 却下された場合は再申請可能 */}
            {applicationStatus.hasApplication && applicationStatus.status === 'REJECTED' && conditions.isEligible && (
              <div className="space-y-4">
                <Button
                  className="w-full"
                  size="lg"
                  disabled={isApplying}
                  onClick={handlePromotionApplication}
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      申請中...
                    </>
                  ) : (
                    <>
                      <Award className="h-4 w-4 mr-2" />
                      再申請する
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* 注意事項 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <h4 className="font-medium text-yellow-800 mb-2">注意事項</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• 申請後、運営による確認が完了するまで数日かかる場合があります</li>
              <li>• 昇格後は「コンプライアンステスト」（合格ライン90%）と「ガイダンス動画」の視聴が必須となります</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

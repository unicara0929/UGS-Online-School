'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { authenticatedFetch } from '@/lib/utils/api-client'
import { fetchWithTimeout, handleApiResponse } from '@/lib/utils/api-helpers-client'
import { validateFile } from '@/lib/utils/file-helpers'
import { uploadIdDocument, fetchExistingIdDocumentUrl } from '@/lib/services/file-upload-service'
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from 'next/navigation'
import { 
  CheckCircle, 
  XCircle, 
  Upload, 
  FileText,
  Calendar,
  Clock,
  MessageSquare,
  Award,
  Loader2,
  ArrowRight
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

export function FPPromotion() {
  const { user } = useAuth()
  const router = useRouter()
  const [isApplying, setIsApplying] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null)
  const [contractAgreed, setContractAgreed] = useState(false)
  const [contractUrl, setContractUrl] = useState<string | null>(null) // GMOサインのリンク
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
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user?.id) {
      fetchPromotionConditions()
      fetchExistingApplication()
      fetchContractUrl()
    }
  }, [user?.id])

  const fetchContractUrl = async () => {
    try {
      const response = await authenticatedFetch('/api/user/contract-url')
      if (response.ok) {
        const data = await response.json()
        setContractUrl(data.contractUrl)
      }
    } catch (error) {
      console.error('Error fetching contract URL:', error)
    }
  }

  /**
   * 既存のアプリケーション情報を取得
   * 根本的な解決: サービス関数を使用してロジックを分離し、可読性を向上
   */
  const fetchExistingApplication = async () => {
    if (!user?.id) return

    try {
      const response = await authenticatedFetch(`/api/user/fp-promotion-application?userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.application) {
          // 申請ステータスを設定
          setApplicationStatus({
            hasApplication: true,
            status: data.application.status,
            appliedAt: data.application.appliedAt,
            approvedAt: data.application.approvedAt
          })

          // 既存の身分証URLを取得
          if (data.application.idDocumentUrl) {
            const fileUrl = await fetchExistingIdDocumentUrl(user.id, data.application.idDocumentUrl)
            if (fileUrl) {
              setUploadedFileUrl(fileUrl)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching existing application:', error)
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

  /**
   * ファイル選択ハンドラー
   * 根本的な解決: ヘルパー関数を使用してロジックを分離し、可読性を向上
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateFile(file)
    if (!validation.valid) {
      alert(validation.error)
      return
    }

    setSelectedFile(file)
    setUploadedFileUrl(null)
  }

  /**
   * ファイルアップロードハンドラー
   * 根本的な解決: サービス関数を使用してロジックを分離し、可読性を向上
   */
  const handleFileUpload = async () => {
    if (!selectedFile || !user?.id) {
      alert('ファイルを選択してください')
      return
    }

    setIsUploading(true)
    try {
      const result = await uploadIdDocument(selectedFile, user.id)
      
      if (!result.success) {
        alert(result.error || 'アップロードに失敗しました')
        return
      }

      setUploadedFileUrl(result.fileUrl || null)
      alert('身分証のアップロードが完了しました')
    } catch (error: any) {
      console.error('Upload error:', error)
      alert(error.message || 'アップロードに失敗しました')
    } finally {
      setIsUploading(false)
    }
  }

  const handlePromotionApplication = async () => {
    if (!uploadedFileUrl) {
      alert('先に身分証をアップロードしてください')
      return
    }

    if (!contractAgreed) {
      alert('業務委託契約書の締結が必要です')
      return
    }

    setIsApplying(true)
    try {
      const response = await authenticatedFetch('/api/user/fp-promotion-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          contractAgreed: true,
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
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                <div className="flex items-center flex-1">
                  <MessageSquare className="h-5 w-5 mr-3 text-slate-600" />
                  <div className="flex-1">
                    <h4 className="font-medium">LP面談完了</h4>
                    <p className="text-sm text-slate-600">ライフプランナーとの面談を完了する</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {conditions.lpMeetingCompleted ? (
                    <Badge className="bg-green-100 text-green-800">完了</Badge>
                  ) : (
                    <>
                      <Badge variant="secondary">未完了</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push('/dashboard/lp-meeting/request')}
                      >
                        面談を予約
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                <div className="flex items-center flex-1">
                  <Calendar className="h-5 w-5 mr-3 text-slate-600" />
                  <div className="flex-1">
                    <h4 className="font-medium">アンケート提出</h4>
                    <p className="text-sm text-slate-600">初回アンケート（10設問）を提出する</p>
                    {!conditions.lpMeetingCompleted && (
                      <p className="text-xs text-orange-600 mt-1">※ LP面談完了後に回答可能</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {conditions.surveyCompleted ? (
                    <Badge className="bg-green-100 text-green-800">完了</Badge>
                  ) : conditions.lpMeetingCompleted ? (
                    <>
                      <Badge variant="secondary">未完了</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push('/dashboard/survey')}
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
          {conditions.surveyCompleted ? (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">昇格申請</h3>
              <div className="space-y-4">
              {/* 身分証アップロードと業務委託契約書は、申請前または審査完了（承認）後のみ表示 */}
              {(!applicationStatus.hasApplication || applicationStatus.status === 'APPROVED') && (
                <>
              <div className="p-4 border border-slate-200 rounded-xl">
                <h4 className="font-medium mb-2">身分証アップロード</h4>
                <p className="text-sm text-slate-600 mb-4">
                  本人確認のため、身分証（運転免許証、パスポート等）の画像をアップロードしてください
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg,application/pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="id-document-upload"
                      disabled={isUploading}
                    />
                    <label htmlFor="id-document-upload">
                      <Button variant="outline" size="sm" asChild disabled={isUploading}>
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          {selectedFile ? 'ファイルを変更' : 'ファイル選択'}
                        </span>
                      </Button>
                    </label>
                    {selectedFile && (
                      <span className="text-sm text-slate-700">
                        {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)}MB)
                      </span>
                    )}
                    {!selectedFile && !uploadedFileUrl && (
                      <span className="text-sm text-slate-500">未選択</span>
                    )}
                  </div>
                  {selectedFile && !uploadedFileUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleFileUpload}
                      disabled={isUploading}
                    >
                      {isUploading ? 'アップロード中...' : 'アップロード'}
                    </Button>
                  )}
                  {uploadedFileUrl && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>アップロード完了</span>
                      <a
                        href={uploadedFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        確認
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* 業務委託契約書 */}
              <div className="p-4 border border-slate-200 rounded-xl">
                <h4 className="font-medium mb-2">業務委託契約書の締結</h4>
                <p className="text-sm text-slate-600 mb-4">
                  業務委託契約書（GMOサイン）を確認し、締結してください
                </p>
                <div className="space-y-3">
                  {contractUrl ? (
                    <a
                      href={contractUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:underline"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      業務委託契約書を開く
                    </a>
                  ) : (
                    <p className="text-sm text-slate-500">契約書のリンクが設定されていません</p>
                  )}
                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="contract-agreement"
                      checked={contractAgreed}
                      onChange={(e) => setContractAgreed(e.target.checked)}
                      className="mt-1"
                      disabled={!contractUrl}
                    />
                    <label htmlFor="contract-agreement" className="text-sm text-slate-700 cursor-pointer">
                      業務委託契約書の内容を確認し、同意します
                    </label>
                  </div>
                </div>
              </div>
              </>
              )}

              {/* 申請ボタンは申請前のみ表示 */}
              {!applicationStatus.hasApplication && (
                <Button
                  className="w-full"
                  disabled={
                    !conditions.isEligible ||
                    isApplying ||
                    !uploadedFileUrl ||
                    !contractAgreed
                  }
                  onClick={handlePromotionApplication}
                >
                  {isApplying ? '申請中...' : 'FPエイド昇格申請'}
                </Button>
              )}

              {!applicationStatus.hasApplication && (
                <>
                  {!conditions.isEligible && (
                    <p className="text-sm text-slate-500 text-center">
                      昇格条件をすべて満たすと申請可能になります
                    </p>
                  )}
                  {conditions.isEligible && !uploadedFileUrl && (
                    <p className="text-sm text-slate-500 text-center">
                      身分証のアップロードが必要です
                    </p>
                  )}
                  {conditions.isEligible && uploadedFileUrl && !contractAgreed && (
                    <p className="text-sm text-slate-500 text-center">
                      業務委託契約書の締結が必要です
                    </p>
                  )}
                </>
              )}
              </div>
            </div>
          ) : (
            <div className="border-t pt-6">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                <h3 className="text-lg font-semibold mb-2">昇格申請</h3>
                <p className="text-sm text-slate-600 mb-4">
                  すべての昇格条件を満たすと、昇格申請セクションが表示されます
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                  <span>進捗: {completedCount}/2</span>
                </div>
              </div>
            </div>
          )}

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

'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { Calendar, Clock, Video, XCircle, Loader2, Plus, X } from "lucide-react"
import { formatDateTime } from "@/lib/utils/format"
import { authenticatedFetch } from "@/lib/utils/api-client"

interface LPMeeting {
  id: string
  memberId: string
  fpId?: string | null
  counselorName?: string | null
  status: 'REQUESTED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  preferredDates: string[]
  scheduledAt?: string | null
  completedAt?: string | null
  cancelledAt?: string | null
  meetingUrl?: string | null
  meetingPlatform?: string | null
  notes?: string | null
  memberNotes?: string | null
  createdAt: string
  updatedAt: string
  member?: {
    id: string
    name: string
    email: string
  }
  fp?: {
    id: string
    name: string
    email: string
  }
}

function LPMeetingRequestPageContent() {
  const { user } = useAuth()
  const [meeting, setMeeting] = useState<LPMeeting | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [preferredDates, setPreferredDates] = useState<string[]>([])
  const [memberNotes, setMemberNotes] = useState('')
  const [meetingLocation, setMeetingLocation] = useState<'OFFLINE' | 'UGS_OFFICE' | ''>('')
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    if (user?.id) {
      fetchMeeting()
    }
  }, [user?.id])

  const fetchMeeting = async () => {
    if (!user?.id) return

    try {
      // GET /api/lp-meetings/request で自分の面談情報を取得
      const response = await authenticatedFetch(`/api/lp-meetings/request`)
      
      // レスポンスのステータスコードとエラー詳細を確認
      if (!response.ok) {
        let errorMessage = '面談情報の取得に失敗しました'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
          console.error('API Error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          })
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          console.error('Response status:', response.status, response.statusText)
        }
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      setMeeting(data.meeting)
      
      // CANCELLEDまたはNO_SHOWの場合のみ再申請可能
      if (data.meeting && 
          (data.meeting.status === 'CANCELLED' || data.meeting.status === 'NO_SHOW')) {
        setShowRequestForm(true)
      } else if (data.meeting) {
        // REQUESTED、SCHEDULED、COMPLETEDの場合は申請フォームを非表示
        setShowRequestForm(false)
      } else {
        // 面談がない場合は申請フォームを表示
        setShowRequestForm(true)
      }
    } catch (error) {
      console.error('Error fetching meeting:', error)
      setShowRequestForm(true) // エラー時は申請フォームを表示
    } finally {
      setIsLoading(false)
    }
  }

  const addPreferredDate = () => {
    if (preferredDates.length >= 5) {
      alert('希望日時は5つまで選択できます')
      return
    }
    setPreferredDates([...preferredDates, ''])
  }

  const removePreferredDate = (index: number) => {
    const updated = preferredDates.filter((_, i) => i !== index)
    setPreferredDates(updated)

    // バリデーション再実行
    const error = validatePreferredDates(updated)
    setValidationError(error)
  }

  /**
   * 2つの時間帯が重複しているかチェック
   * 各時間帯は開始時刻から60分間とする
   * @param date1 1つ目の開始日時
   * @param date2 2つ目の開始日時
   * @returns 重複している場合true
   */
  const checkTimeOverlap = (date1: Date, date2: Date): boolean => {
    const MEETING_DURATION_MS = 60 * 60 * 1000 // 60分をミリ秒で表現

    const start1 = date1.getTime()
    const end1 = start1 + MEETING_DURATION_MS
    const start2 = date2.getTime()
    const end2 = start2 + MEETING_DURATION_MS

    // 重複条件: 時間帯1の開始が時間帯2の終了より前 AND 時間帯2の開始が時間帯1の終了より前
    return start1 < end2 && start2 < end1
  }

  /**
   * 候補日時のバリデーションを実行
   * @param dates 候補日時の配列
   * @returns エラーメッセージ（エラーがない場合は空文字）
   */
  const validatePreferredDates = (dates: string[]): string => {
    // 空の値をフィルタリング
    const validDates = dates.filter(d => d)
    if (validDates.length < 2) {
      return '' // 2つ未満の場合はチェック不要
    }

    const dateObjects = validDates.map(d => new Date(d))

    for (let i = 0; i < dateObjects.length; i++) {
      for (let j = i + 1; j < dateObjects.length; j++) {
        if (checkTimeOverlap(dateObjects[i], dateObjects[j])) {
          const formatDate = (d: Date) => {
            return d.toLocaleString('ja-JP', {
              month: 'numeric',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          }
          return `候補${i + 1}と候補${j + 1}が重複しています（${formatDate(dateObjects[i])}〜 / ${formatDate(dateObjects[j])}〜）`
        }
      }
    }

    return ''
  }

  /**
   * 明日の日付を取得（YYYY-MM-DD形式）
   */
  const getTomorrowDate = (): string => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const year = tomorrow.getFullYear()
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0')
    const day = String(tomorrow.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  /**
   * 30分刻みの時間オプションを生成（09:00〜21:00）
   */
  const generateTimeOptions = (): string[] => {
    const options: string[] = []
    for (let hour = 9; hour <= 21; hour++) {
      options.push(`${String(hour).padStart(2, '0')}:00`)
      if (hour < 21) {
        options.push(`${String(hour).padStart(2, '0')}:30`)
      }
    }
    return options
  }

  /**
   * 時刻を30分単位に丸める
   * @param dateString datetime-local形式の文字列
   * @returns 30分単位に丸められた文字列
   */
  const roundToHalfHour = (dateString: string): string => {
    if (!dateString) return ''

    const date = new Date(dateString)
    const minutes = date.getMinutes()

    // 30分単位に丸める（0分または30分）
    const roundedMinutes = minutes < 30 ? 0 : 30
    date.setMinutes(roundedMinutes)
    date.setSeconds(0)
    date.setMilliseconds(0)

    // datetime-local形式に戻す（YYYY-MM-DDTHH:mm）
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const mins = String(date.getMinutes()).padStart(2, '0')

    return `${year}-${month}-${day}T${hours}:${mins}`
  }

  const updatePreferredDate = (index: number, value: string) => {
    const updated = [...preferredDates]
    // 30分単位に丸める
    updated[index] = roundToHalfHour(value)
    setPreferredDates(updated)

    // バリデーション実行
    const error = validatePreferredDates(updated)
    setValidationError(error)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    // 面談場所のバリデーション
    if (!meetingLocation) {
      alert('面談場所を選択してください')
      return
    }

    if (preferredDates.length !== 5) {
      alert('希望日時を5つ選択してください')
      return
    }

    // すべての日時が入力されているか確認
    if (preferredDates.some(date => !date)) {
      alert('すべての希望日時を入力してください')
      return
    }

    // 未来の日時であることを確認
    const now = new Date()
    for (const date of preferredDates) {
      const dateObj = new Date(date)
      if (dateObj <= now) {
        alert('希望日時は未来の日時を選択してください')
        return
      }
    }

    // 候補日時の重複チェック（60分面談として1分でも重複があればエラー）
    const overlapError = validatePreferredDates(preferredDates)
    if (overlapError) {
      alert(`${overlapError}\n\n面談時間は1枠60分のため、重複しない時間帯を選択してください。`)
      return
    }

    setIsSubmitting(true)
    try {
      const response = await authenticatedFetch('/api/lp-meetings/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: user.id,
          preferredDates: preferredDates,
          meetingLocation: meetingLocation,
          memberNotes: memberNotes || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '面談予約申請に失敗しました')
      }

      alert('面談予約申請を送信しました。運営側で確認後、面談が確定されます。')
      await fetchMeeting()
      setPreferredDates([])
      setMeetingLocation('')
      setMemberNotes('')
    } catch (error: any) {
      alert(error.message || '面談予約申請に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REQUESTED':
        return <Badge className="bg-yellow-100 text-yellow-800">申請中</Badge>
      case 'SCHEDULED':
        return <Badge className="bg-blue-100 text-blue-800">予約済み</Badge>
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800">完了</Badge>
      case 'CANCELLED':
        return <Badge className="bg-red-100 text-red-800">キャンセル</Badge>
      case 'NO_SHOW':
        return <Badge className="bg-orange-100 text-orange-800">無断欠席</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getPlatformLabel = (platform: string | null | undefined) => {
    switch (platform) {
      case 'ZOOM': return 'Zoom'
      case 'GOOGLE_MEET': return 'Google Meet'
      case 'TEAMS': return 'Microsoft Teams'
      case 'OTHER': return 'その他'
      default: return '未設定'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 md:ml-64">
        <PageHeader title="LP面談予約" />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          {meeting && !showRequestForm ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    面談状況
                  </CardTitle>
                  <CardDescription>現在のLP面談の状況</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">ステータス</span>
                      {getStatusBadge(meeting.status)}
                    </div>

                    {meeting.status === 'REQUESTED' && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-700">希望日時（5つ）</p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                          {(meeting.preferredDates as string[]).map((date, index) => (
                            <li key={index}>{formatDateTime(new Date(date))}</li>
                          ))}
                        </ul>
                        {meeting.memberNotes && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-slate-700 mb-1">要望・質問事項</p>
                            <p className="text-sm text-slate-600">{meeting.memberNotes}</p>
                          </div>
                        )}
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            <Clock className="h-4 w-4 inline mr-1" />
                            申請済みです。運営側で確認後、面談が確定されます。
                          </p>
                        </div>
                      </div>
                    )}

                    {meeting.status === 'SCHEDULED' && meeting.scheduledAt && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-1">確定日時</p>
                          <p className="text-sm text-slate-900">{formatDateTime(new Date(meeting.scheduledAt))}</p>
                        </div>
                        {(meeting.counselorName || meeting.fp) && (
                          <div>
                            <p className="text-sm font-medium text-slate-700 mb-1">面談担当者</p>
                            <p className="text-sm text-slate-900">{meeting.counselorName || meeting.fp?.name}</p>
                          </div>
                        )}
                        {meeting.meetingUrl && (
                          <div>
                            <p className="text-sm font-medium text-slate-700 mb-1">オンライン面談URL</p>
                            <div className="flex items-center space-x-2">
                              <Video className="h-4 w-4 text-slate-600" />
                              <a
                                href={meeting.meetingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline"
                              >
                                {meeting.meetingUrl}
                              </a>
                            </div>
                            {meeting.meetingPlatform && (
                              <p className="text-xs text-slate-500 mt-1">
                                プラットフォーム: {getPlatformLabel(meeting.meetingPlatform)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {meeting.status === 'COMPLETED' && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-1">完了日時</p>
                          <p className="text-sm text-slate-900">
                            {meeting.completedAt ? formatDateTime(new Date(meeting.completedAt)) : '-'}
                          </p>
                        </div>
                        {(meeting.counselorName || meeting.fp) && (
                          <div>
                            <p className="text-sm font-medium text-slate-700 mb-1">面談担当者</p>
                            <p className="text-sm text-slate-900">{meeting.counselorName || meeting.fp?.name}</p>
                          </div>
                        )}
                        {meeting.notes && (
                          <div>
                            <p className="text-sm font-medium text-slate-700 mb-1">面談メモ</p>
                            <p className="text-sm text-slate-600">{meeting.notes}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {meeting.status === 'CANCELLED' && (
                      <div className="space-y-3">
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-800">
                            この面談はキャンセルされました。再度申請することができます。
                          </p>
                        </div>
                      </div>
                    )}

                    {meeting.status === 'NO_SHOW' && (
                      <div className="space-y-3">
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-800">
                            この面談は無断欠席となりました。再度申請することができます。
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  LP面談予約申請
                </CardTitle>
                <CardDescription>
                  FPエイド昇格の条件の一つであるLP面談の予約申請を行います
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* 面談場所の選択 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      面談場所 *
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                        <input
                          type="radio"
                          name="meetingLocation"
                          value="OFFLINE"
                          checked={meetingLocation === 'OFFLINE'}
                          onChange={(e) => setMeetingLocation(e.target.value as 'OFFLINE' | 'UGS_OFFICE')}
                          className="mt-1 mr-3"
                          required
                        />
                        <div>
                          <div className="font-medium text-slate-900">オンライン</div>
                          <div className="text-sm text-slate-600 mt-1">
                            ZoomやGoogle Meetなどのオンラインツールを使用した面談
                          </div>
                        </div>
                      </label>
                      <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                        <input
                          type="radio"
                          name="meetingLocation"
                          value="UGS_OFFICE"
                          checked={meetingLocation === 'UGS_OFFICE'}
                          onChange={(e) => setMeetingLocation(e.target.value as 'OFFLINE' | 'UGS_OFFICE')}
                          className="mt-1 mr-3"
                          required
                        />
                        <div>
                          <div className="font-medium text-slate-900">UGS本社（対面）</div>
                          <div className="text-sm text-slate-600 mt-1">
                            愛知県名古屋市のUGS本社オフィスでの対面面談
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      希望日時（5つ選択してください）*
                    </label>
                    <div className="space-y-3">
                      {preferredDates.map((date, index) => {
                        // datetime-local形式から日付と時間を分離
                        const dateValue = date ? date.split('T')[0] : ''
                        const timeValue = date ? date.split('T')[1] || '' : ''

                        return (
                          <div key={index} className="flex items-start sm:items-center gap-2">
                            <div className="flex-1 flex flex-col sm:flex-row gap-2">
                              {/* 日付選択 */}
                              <input
                                type="date"
                                value={dateValue}
                                min={getTomorrowDate()}
                                onChange={(e) => {
                                  const newDate = e.target.value
                                  const currentTime = timeValue || '10:00'
                                  updatePreferredDate(index, `${newDate}T${currentTime}`)
                                }}
                                className="w-full sm:flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 text-base"
                                required
                              />
                              {/* 時間選択（30分刻み） */}
                              <select
                                value={timeValue}
                                onChange={(e) => {
                                  const newTime = e.target.value
                                  const currentDate = dateValue || getTomorrowDate()
                                  updatePreferredDate(index, `${currentDate}T${newTime}`)
                                }}
                                className="w-full sm:w-28 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 text-base"
                                required
                              >
                                <option value="">時間</option>
                                {generateTimeOptions().map((time) => (
                                  <option key={time} value={time}>{time}</option>
                                ))}
                              </select>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removePreferredDate(index)}
                              className="flex-shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )
                      })}
                      {preferredDates.length < 5 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addPreferredDate}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          希望日時を追加
                        </Button>
                      )}
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-slate-500">
                        {preferredDates.length}/5 選択済み
                      </p>
                      <p className="text-xs text-slate-500">
                        ※時間は30分刻み（10:00、10:30、11:00...）で選択できます
                      </p>
                      <p className="text-xs text-slate-500">
                        ※面談時間は1枠60分です。重複しない時間帯を選択してください。
                      </p>
                      {validationError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-800">
                            <XCircle className="h-4 w-4 inline mr-1" />
                            {validationError}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      要望・質問事項（任意）
                    </label>
                    <textarea
                      value={memberNotes}
                      onChange={(e) => setMemberNotes(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                      placeholder="面談で聞きたいことや要望があれば記入してください"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || !meetingLocation || preferredDates.length !== 5 || !!validationError}
                    className="w-full"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        申請中...
                      </>
                    ) : (
                      <>
                        <Calendar className="h-4 w-4 mr-2" />
                        面談予約を申請
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}

export default function LPMeetingRequestPage() {
  return (
    <ProtectedRoute requiredRoles={['member']}>
      <LPMeetingRequestPageContent />
    </ProtectedRoute>
  )
}


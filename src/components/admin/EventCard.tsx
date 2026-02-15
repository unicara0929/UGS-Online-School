'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Calendar, Clock, MapPin, Users, Video, Edit, Trash2, Image, FileText, Link2, CheckCircle2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { AdminEventItem } from '@/types/event'
import { getTargetRoleLabel, getAttendanceTypeLabel, getEventStatusLabel } from '@/constants/event'

interface EventCardProps {
  event: AdminEventItem
  onEdit: (event: AdminEventItem) => void
  onDelete: (id: string) => void
  onMtgComplete?: (event: AdminEventItem) => void
  isSubmitting: boolean
  showArchiveInfo?: boolean
}

export function EventCard({ event, onEdit, onDelete, onMtgComplete, isSubmitting, showArchiveInfo = false }: EventCardProps) {
  const router = useRouter()

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy年M月d日(E)', { locale: ja })
    } catch {
      return dateString
    }
  }

  const getLocationDisplay = () => {
    if (event.location) return event.location
    switch (event.venueType) {
      case 'online': return 'オンライン'
      case 'hybrid': return 'ハイブリッド'
      default: return '未設定'
    }
  }

  const renderVenueIcon = () => {
    switch (event.venueType) {
      case 'online':
        return <Video className="h-4 w-4 mr-2" aria-hidden="true" />
      case 'offline':
        return <MapPin className="h-4 w-4 mr-2" aria-hidden="true" />
      default:
        return (
          <>
            <Video className="h-4 w-4 mr-1" aria-hidden="true" />
            <MapPin className="h-4 w-4 mr-2" aria-hidden="true" />
          </>
        )
    }
  }

  return (
    <Card className="hover:shadow-xl transition-shadow duration-300">
      {/* サムネイル画像 */}
      {event.thumbnailUrl && (
        <div className="w-full h-48 overflow-hidden rounded-t-lg">
          <img
            src={event.thumbnailUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          {/* バッジ */}
          <div className="flex items-center gap-2 flex-wrap">
            {event.isRecurring && (
              <Badge className="bg-blue-600">全体MTG</Badge>
            )}
            {event.targetRoles.map(role => (
              <Badge key={role} variant="outline">
                {getTargetRoleLabel(role)}
              </Badge>
            ))}
            <Badge variant={event.attendanceType === 'required' ? 'destructive' : 'secondary'}>
              {getAttendanceTypeLabel(event.attendanceType)}
            </Badge>
          </div>

          {/* アクションボタン */}
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(event)}
              disabled={isSubmitting}
            >
              <Edit className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(event.id)}
              disabled={isSubmitting}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <CardTitle className="text-lg">{event.title}</CardTitle>
        <CardDescription>{event.description}</CardDescription>
      </CardHeader>

      <CardContent>
        {/* イベント情報 */}
        <div className="space-y-3">
          <div className="flex items-center text-sm text-slate-600">
            <Calendar className="h-4 w-4 mr-2" aria-hidden="true" />
            {formatDate(event.date)}
          </div>
          <div className="flex items-center text-sm text-slate-600">
            <Clock className="h-4 w-4 mr-2" aria-hidden="true" />
            {event.time || '時間未定'}
          </div>
          <div className="flex items-center text-sm text-slate-600">
            {renderVenueIcon()}
            {getLocationDisplay()}
          </div>
          <div className="text-xs text-slate-500">
            ステータス: {getEventStatusLabel(event.status)}
          </div>
        </div>

        {/* 過去イベント記録情報 */}
        {showArchiveInfo && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-sm font-semibold text-slate-700 mb-2">開催記録</p>
            <div className="space-y-2">
              {/* 記録のステータス表示 */}
              <div className="flex flex-wrap gap-2">
                {event.summary && (
                  <div className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                    <CheckCircle2 className="h-3 w-3 mr-1" aria-hidden="true" />
                    概要あり
                  </div>
                )}
                {event.photos && event.photos.length > 0 && (
                  <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    <Image className="h-3 w-3 mr-1" aria-hidden="true" />
                    写真 {event.photos.length}枚
                  </div>
                )}
                {event.materialsUrl && (
                  <div className="flex items-center text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                    <FileText className="h-3 w-3 mr-1" aria-hidden="true" />
                    資料あり
                  </div>
                )}
                {event.vimeoUrl && (
                  <div className="flex items-center text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                    <Link2 className="h-3 w-3 mr-1" aria-hidden="true" />
                    録画あり
                  </div>
                )}
                {event.actualParticipants && (
                  <div className="flex items-center text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                    <Users className="h-3 w-3 mr-1" aria-hidden="true" />
                    実参加 {event.actualParticipants}名
                  </div>
                )}
              </div>
              {/* 記録がない場合 */}
              {!event.summary && (!event.photos || event.photos.length === 0) && !event.materialsUrl && !event.vimeoUrl && (
                <p className="text-xs text-slate-400">記録が登録されていません</p>
              )}
            </div>
          </div>
        )}

        {/* 参加者一覧 */}
        {event.registrations.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-700 mb-1">
              {event.isRecurring ? 'FPエイド参加状況' : '参加者一覧'}
              <span className="ml-2 text-xs font-normal text-slate-500">({event.registrations.length}名)</span>
            </p>
            {event.isRecurring ? (
              // 全体MTG用: ステータス付きリスト
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {event.registrations.map((registration) => {
                  // ステータスに応じたバッジの色とアイコン
                  const getStatusBadge = () => {
                    switch (registration.status) {
                      case 'attended_code':
                        return <Badge className="bg-green-600 text-[10px] px-1.5 py-0">参加済</Badge>
                      case 'attended_video':
                        return <Badge className="bg-blue-600 text-[10px] px-1.5 py-0">動画完了</Badge>
                      case 'exempted':
                        // 欠席申請の詳細状態を表示
                        if (registration.exemptionStatus === 'APPROVED') {
                          return <Badge className="bg-purple-600 text-[10px] px-1.5 py-0">欠席承認</Badge>
                        } else if (registration.exemptionStatus === 'PENDING') {
                          return <Badge className="bg-yellow-600 text-[10px] px-1.5 py-0">欠席申請中</Badge>
                        }
                        return <Badge className="bg-purple-600 text-[10px] px-1.5 py-0">欠席</Badge>
                      case 'video_incomplete':
                        return <Badge className="bg-orange-600 text-[10px] px-1.5 py-0">対応中</Badge>
                      case 'registered':
                        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-400 text-slate-500">未対応</Badge>
                      default:
                        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-400 text-slate-500">未対応</Badge>
                    }
                  }

                  // 出席完了しているかどうか
                  const isAttendanceCompleted = registration.status === 'attended_code' || registration.status === 'attended_video'
                  // 欠席承認されているかどうか
                  const isExempted = registration.status === 'exempted' && registration.exemptionStatus === 'APPROVED'

                  return (
                    <div key={registration.id} className="flex items-center justify-between text-xs bg-slate-50 px-2 py-1.5 rounded">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-slate-500 shrink-0">{registration.userMemberId || '-'}</span>
                        <span className="font-medium truncate">{registration.userName || '名前未設定'}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* 動画・アンケート状況（出席完了・欠席承認以外の人のみ表示） */}
                        {!isAttendanceCompleted && !isExempted && (
                          <div className="flex items-center gap-1">
                            <Video className={`h-3 w-3 ${registration.videoWatched ? 'text-green-600' : 'text-slate-300'}`} aria-hidden="true" />
                            <FileText className={`h-3 w-3 ${registration.surveyCompleted ? 'text-green-600' : 'text-slate-300'}`} aria-hidden="true" />
                          </div>
                        )}
                        {/* 欠席申請がある場合のアイコン表示（未承認） */}
                        {registration.hasExemption && registration.exemptionStatus === 'PENDING' && (
                          <AlertCircle className="h-3 w-3 text-yellow-600" aria-hidden="true" />
                        )}
                        {getStatusBadge()}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              // 通常イベント用: シンプルリスト
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {event.registrations.map((registration) => (
                  <li key={registration.id} className="text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">
                    <span className="font-medium">{registration.userName || '名前未設定'}</span>
                    <span className="ml-2 text-slate-500">{registration.userEmail || 'メール未設定'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {event.registrations.length === 0 && !showArchiveInfo && (
          <p className="text-xs text-slate-500 mt-4">参加者はまだいません</p>
        )}

        {/* ボタン */}
        <div className="mt-4 space-y-2">
          {/* 参加者管理ボタン（過去イベントでも表示） */}
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => router.push(
              event.isRecurring
                ? `/dashboard/admin/events/${event.id}/mtg`
                : `/dashboard/admin/events/${event.id}`
            )}
          >
            <Users className="h-4 w-4 mr-2" aria-hidden="true" />
            {event.isRecurring ? 'FPエイド参加状況' : '参加者を管理'}
          </Button>

          {showArchiveInfo ? (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => router.push(`/dashboard/admin/events/${event.id}/archive`)}
            >
              <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
              記録を編集
            </Button>
          ) : (
            <>
              {/* 完了設定ボタンを表示（開催予定のイベントのみ） */}
              {event.status === 'upcoming' && onMtgComplete && (
                <Button
                  size="sm"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => onMtgComplete(event)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" aria-hidden="true" />
                  完了設定（動画・資料）
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

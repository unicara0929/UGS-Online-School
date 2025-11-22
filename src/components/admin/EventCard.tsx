'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Calendar, Clock, MapPin, Users, Video, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { AdminEventItem } from '@/types/event'
import { getTargetRoleLabel, getAttendanceTypeLabel, getEventStatusLabel } from '@/constants/event'

interface EventCardProps {
  event: AdminEventItem
  onEdit: (event: AdminEventItem) => void
  onDelete: (id: string) => void
  isSubmitting: boolean
}

export function EventCard({ event, onEdit, onDelete, isSubmitting }: EventCardProps) {
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
        return <Video className="h-4 w-4 mr-2" />
      case 'offline':
        return <MapPin className="h-4 w-4 mr-2" />
      default:
        return (
          <>
            <Video className="h-4 w-4 mr-1" />
            <MapPin className="h-4 w-4 mr-2" />
          </>
        )
    }
  }

  return (
    <Card className="hover:shadow-xl transition-all duration-300">
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
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(event.id)}
              disabled={isSubmitting}
            >
              <Trash2 className="h-4 w-4" />
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
            <Calendar className="h-4 w-4 mr-2" />
            {formatDate(event.date)}
          </div>
          <div className="flex items-center text-sm text-slate-600">
            <Clock className="h-4 w-4 mr-2" />
            {event.time || '時間未定'}
          </div>
          <div className="flex items-center text-sm text-slate-600">
            {renderVenueIcon()}
            {getLocationDisplay()}
          </div>
          <div className="flex items-center text-sm text-slate-600">
            <Users className="h-4 w-4 mr-2" />
            {event.currentParticipants}/{event.maxParticipants ?? '∞'}名
          </div>
          <div className="text-xs text-slate-500">
            ステータス: {getEventStatusLabel(event.status)}
          </div>
        </div>

        {/* 参加者一覧 */}
        {event.registrations.length > 0 ? (
          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-700 mb-1">参加者一覧</p>
            <ul className="space-y-1 max-h-32 overflow-y-auto">
              {event.registrations.map((registration) => (
                <li key={registration.id} className="text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">
                  <span className="font-medium">{registration.userName || '名前未設定'}</span>
                  <span className="ml-2 text-slate-500">{registration.userEmail || 'メール未設定'}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-slate-500 mt-4">参加者はまだいません</p>
        )}

        {/* 参加者管理ボタン */}
        <div className="mt-4">
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => router.push(`/dashboard/admin/events/${event.id}`)}
          >
            <Users className="h-4 w-4 mr-2" />
            参加者を管理
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Info,
  Loader2,
  CheckCheck,
  Search,
  X
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { formatDateTime } from "@/lib/utils/format"
import { useNewBadge } from "@/hooks/use-new-badge"

interface Notification {
  id: string
  userId: string
  type: string
  priority: 'CRITICAL' | 'INFO' | 'SUCCESS'
  title: string
  message: string
  actionUrl?: string | null
  isRead: boolean
  readAt?: string | null
  createdAt: string
}

export function NotificationList() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { markCategoryViewed, fetchBadgeStatus } = useNewBadge()
  const hasMarkedViewed = useRef(false)

  // 検索フィルタリング
  const filteredNotifications = useMemo(() => {
    if (!searchQuery.trim()) return notifications
    const query = searchQuery.toLowerCase()
    return notifications.filter(n =>
      n.title.toLowerCase().includes(query) ||
      n.message.toLowerCase().includes(query)
    )
  }, [notifications, searchQuery])

  // ページを開いたときにカテゴリを閲覧済みとしてマーク
  useEffect(() => {
    if (!hasMarkedViewed.current) {
      markCategoryViewed('NOTIFICATIONS')
      hasMarkedViewed.current = true
    }
  }, [markCategoryViewed])

  useEffect(() => {
    if (user?.id) {
      fetchNotifications()
    }
  }, [user?.id])

  const fetchNotifications = async () => {
    if (!user?.id) return

    try {
      const response = await fetch(`/api/notifications?userId=${user.id}`, {
        credentials: 'include' // Cookieベースの認証に必要
      })
      if (!response.ok) {
        throw new Error('通知一覧の取得に失敗しました')
      }
      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)

      // 未読通知がある場合、バックグラウンドで既読にしてサイドバーのバッジを消す
      if ((data.unreadCount || 0) > 0) {
        fetch('/api/notifications/mark-all-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }).then(() => fetchBadgeStatus()).catch(console.error)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        credentials: 'include' // Cookieベースの認証に必要
      })
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId
              ? { ...n, isRead: true, readAt: new Date().toISOString() }
              : n
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
        // サイドバーのバッジを更新
        fetchBadgeStatus()
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!user?.id) return

    setIsMarkingAllRead(true)
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
        )
        setUnreadCount(0)
        // サイドバーのバッジを更新
        fetchBadgeStatus()
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
    } finally {
      setIsMarkingAllRead(false)
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
      case 'SUCCESS':
        return <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
      default:
        return <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return <Badge className="bg-red-100 text-red-800 text-xs px-1.5 py-0">重要</Badge>
      case 'SUCCESS':
        return <Badge className="bg-green-100 text-green-800 text-xs px-1.5 py-0">成功</Badge>
      default:
        return <Badge className="bg-blue-100 text-blue-800 text-xs px-1.5 py-0">情報</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    )
  }

  const unreadNotifications = filteredNotifications.filter(n => !n.isRead)
  const readNotifications = filteredNotifications.filter(n => n.isRead)

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">通知</h2>
          <p className="text-slate-600 mt-1">
            {unreadCount > 0 ? `${unreadCount}件の未読通知があります` : '未読通知はありません'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            onClick={markAllAsRead}
            disabled={isMarkingAllRead}
            variant="outline"
            className="self-start sm:self-auto"
          >
            {isMarkingAllRead ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                処理中...
              </>
            ) : (
              <>
                <CheckCheck className="h-4 w-4 mr-2" />
                すべて既読にする
              </>
            )}
          </Button>
        )}
      </div>

      {/* 検索バー */}
      {notifications.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="通知を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* 検索結果表示 */}
      {searchQuery && (
        <p className="text-sm text-slate-600">
          「{searchQuery}」の検索結果: {filteredNotifications.length}件
        </p>
      )}

      {/* 未読通知 */}
      {unreadNotifications.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-900">未読</h3>
          {unreadNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`border-l-4 cursor-pointer transition-all hover:shadow-md ${
                notification.priority === 'CRITICAL'
                  ? 'border-l-red-500 bg-red-50/50 hover:bg-red-50'
                  : notification.priority === 'SUCCESS'
                  ? 'border-l-green-500 bg-green-50/50 hover:bg-green-50'
                  : 'border-l-blue-500 bg-blue-50/50 hover:bg-blue-50'
              }`}
              onClick={() => {
                markAsRead(notification.id)
                if (notification.actionUrl) {
                  window.open(notification.actionUrl, '_blank', 'noopener,noreferrer')
                }
              }}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  {getPriorityIcon(notification.priority)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-slate-900 truncate">{notification.title}</span>
                      {getPriorityBadge(notification.priority)}
                      <span className="text-xs text-slate-500">{formatDateTime(new Date(notification.createdAt))}</span>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2 mt-0.5">{notification.message}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        markAsRead(notification.id)
                      }}
                      className="h-7 w-7 p-0"
                      title="既読にする"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 既読通知 */}
      {readNotifications.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-900">既読</h3>
          {readNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`opacity-60 hover:opacity-100 transition-all hover:shadow-md ${
                notification.actionUrl ? 'cursor-pointer' : ''
              }`}
              onClick={() => {
                if (notification.actionUrl) {
                  window.open(notification.actionUrl, '_blank', 'noopener,noreferrer')
                }
              }}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  {getPriorityIcon(notification.priority)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-slate-900 truncate">{notification.title}</span>
                      {getPriorityBadge(notification.priority)}
                      <span className="text-xs text-slate-500">{formatDateTime(new Date(notification.createdAt))}</span>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2 mt-0.5">{notification.message}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 検索結果が0件の場合 */}
      {searchQuery && filteredNotifications.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">「{searchQuery}」に一致する通知はありません</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="mt-4"
              >
                検索をクリア
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 通知がない場合 */}
      {notifications.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">通知はありません</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Bell, 
  CheckCircle, 
  AlertCircle, 
  Info,
  Loader2,
  CheckCheck
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { formatDateTime } from "@/lib/utils/format"

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

  useEffect(() => {
    if (user?.id) {
      fetchNotifications()
    }
  }, [user?.id])

  const fetchNotifications = async () => {
    if (!user?.id) return

    try {
      const response = await fetch(`/api/notifications?userId=${user.id}`)
      if (!response.ok) {
        throw new Error('通知一覧の取得に失敗しました')
      }
      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
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
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case 'SUCCESS':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      default:
        return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return <Badge className="bg-red-100 text-red-800">重要</Badge>
      case 'SUCCESS':
        return <Badge className="bg-green-100 text-green-800">成功</Badge>
      default:
        return <Badge className="bg-blue-100 text-blue-800">情報</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    )
  }

  const unreadNotifications = notifications.filter(n => !n.isRead)
  const readNotifications = notifications.filter(n => n.isRead)

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
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

      {/* 未読通知 */}
      {unreadNotifications.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">未読</h3>
          {unreadNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`border-l-4 ${
                notification.priority === 'CRITICAL'
                  ? 'border-l-red-500 bg-red-50/50'
                  : notification.priority === 'SUCCESS'
                  ? 'border-l-green-500 bg-green-50/50'
                  : 'border-l-blue-500 bg-blue-50/50'
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getPriorityIcon(notification.priority)}
                      <CardTitle className="text-lg">{notification.title}</CardTitle>
                      {getPriorityBadge(notification.priority)}
                    </div>
                    <p className="text-slate-700 mb-2">{notification.message}</p>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(new Date(notification.createdAt))}
                    </p>
                    {notification.actionUrl && (
                      <Button
                        variant="link"
                        className="p-0 h-auto mt-2"
                        onClick={() => {
                          markAsRead(notification.id)
                          window.location.href = notification.actionUrl!
                        }}
                      >
                        詳細を見る →
                      </Button>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAsRead(notification.id)}
                    className="ml-4"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 既読通知 */}
      {readNotifications.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">既読</h3>
          {readNotifications.map((notification) => (
            <Card
              key={notification.id}
              className="opacity-60 hover:opacity-100 transition-opacity"
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getPriorityIcon(notification.priority)}
                      <CardTitle className="text-lg">{notification.title}</CardTitle>
                      {getPriorityBadge(notification.priority)}
                    </div>
                    <p className="text-slate-700 mb-2">{notification.message}</p>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(new Date(notification.createdAt))}
                    </p>
                    {notification.actionUrl && (
                      <Button
                        variant="link"
                        className="p-0 h-auto mt-2"
                        onClick={() => {
                          window.location.href = notification.actionUrl!
                        }}
                      >
                        詳細を見る →
                      </Button>
                    )}
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-600 ml-4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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


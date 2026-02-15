'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, ChevronRight, X } from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  targetUrl: string | null
  contentType: string | null
  contentId: string | null
  createdAt: string
}

export function NotificationBar() {
  const router = useRouter()
  const [notification, setNotification] = useState<Notification | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    fetchLatestNotification()
  }, [])

  const fetchLatestNotification = async () => {
    try {
      const response = await fetch('/api/notifications/latest')
      const data = await response.json()

      if (data.success && data.notification) {
        setNotification(data.notification)
      }
    } catch (error) {
      console.error('Failed to fetch notification:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClick = async () => {
    if (!notification) return

    try {
      // 既読マーク
      await fetch(`/api/notifications/${notification.id}/read`, {
        method: 'POST'
      })

      // 詳細ページを新規タブで開く
      if (notification.targetUrl) {
        window.open(notification.targetUrl, '_blank', 'noopener,noreferrer')
      }

      // 通知を非表示
      setNotification(null)
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const handleDismiss = async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!notification) return

    try {
      // 既読マーク（遷移せずに閉じる）
      await fetch(`/api/notifications/${notification.id}/read`, {
        method: 'POST'
      })

      // 通知を非表示
      setIsDismissed(true)
      setTimeout(() => setNotification(null), 300) // アニメーション後に削除
    } catch (error) {
      console.error('Failed to dismiss notification:', error)
    }
  }

  // ローディング中または通知がない場合は何も表示しない
  if (isLoading || !notification) {
    return null
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
      className={`
        bg-gradient-to-r from-blue-500 to-blue-600 text-white
        px-4 py-3 md:px-6
        flex items-center justify-between
        cursor-pointer
        hover:from-blue-600 hover:to-blue-700
        transition-[opacity,transform] duration-300
        shadow-lg
        ${isDismissed ? 'opacity-0 transform -translate-y-2' : 'opacity-100'}
      `}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* アイコン */}
        <div className="flex-shrink-0">
          <div className="relative">
            <Bell className="h-5 w-5 md:h-6 md:w-6" aria-hidden="true" />
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
          </div>
        </div>

        {/* NEWバッジ */}
        <div className="flex-shrink-0">
          <span className="bg-white text-blue-600 text-xs font-bold px-2 py-1 rounded-full">
            NEW
          </span>
        </div>

        {/* タイトル */}
        <p className="text-sm md:text-base font-medium truncate flex-1">
          {notification.title}
        </p>
      </div>

      {/* 右側のボタン群 */}
      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0 ml-2">
        {/* 詳細を見るボタン（PC表示） */}
        <div className="hidden md:flex items-center gap-1 text-sm font-semibold">
          <span>詳細を見る</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </div>

        {/* 矢印アイコン（スマホ表示） */}
        <ChevronRight className="h-5 w-5 md:hidden" aria-hidden="true" />

        {/* 閉じるボタン */}
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 hover:bg-white/20 rounded-full transition-colors"
          aria-label="通知を閉じる"
        >
          <X className="h-4 w-4 md:h-5 md:w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

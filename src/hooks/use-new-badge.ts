'use client'

import { useState, useEffect, useCallback } from 'react'

interface BadgeStatus {
  events: number
  courses: number
  materials: number
  notifications: number
}

export function useNewBadge() {
  const [badges, setBadges] = useState<BadgeStatus>({
    events: 0,
    courses: 0,
    materials: 0,
    notifications: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  const fetchBadgeStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/new-badge/status', {
        credentials: 'include',
      })

      if (!response.ok) {
        console.error('Failed to fetch badge status')
        return
      }

      const data = await response.json()
      if (data.success) {
        setBadges(data.badges)
      }
    } catch (error) {
      console.error('Error fetching badge status:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // カテゴリを閲覧済みとしてマーク
  const markCategoryViewed = useCallback(async (category: 'EVENTS' | 'COURSES' | 'MATERIALS' | 'NOTIFICATIONS') => {
    try {
      const response = await fetch('/api/new-badge/mark-viewed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ category }),
      })

      if (response.ok) {
        // バッジ状態を再取得
        await fetchBadgeStatus()
      }
    } catch (error) {
      console.error('Error marking category as viewed:', error)
    }
  }, [fetchBadgeStatus])

  // コンテンツを閲覧済みとして記録
  const recordContentView = useCallback(async (contentType: 'EVENT' | 'COURSE' | 'LESSON' | 'MATERIAL', contentId: string) => {
    try {
      await fetch('/api/content-view/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ contentType, contentId }),
      })
    } catch (error) {
      console.error('Error recording content view:', error)
    }
  }, [])

  useEffect(() => {
    fetchBadgeStatus()

    // 30秒ごとにバッジ状態を更新
    const interval = setInterval(fetchBadgeStatus, 30000)

    return () => clearInterval(interval)
  }, [fetchBadgeStatus])

  return {
    badges,
    isLoading,
    fetchBadgeStatus,
    markCategoryViewed,
    recordContentView,
  }
}

'use client'

import { useState, useCallback, useMemo } from 'react'
import type { AdminEventItem } from '@/types/event'

interface UseEventsReturn {
  events: AdminEventItem[]
  isLoading: boolean
  error: string | null
  totalParticipants: number
  fetchEvents: () => Promise<void>
  createEvent: (eventData: any) => Promise<boolean>
  updateEvent: (eventId: string, eventData: any) => Promise<boolean>
  deleteEvent: (eventId: string) => Promise<boolean>
}

export function useEvents(): UseEventsReturn {
  const [events, setEvents] = useState<AdminEventItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const totalParticipants = useMemo(
    () => events.reduce((sum, event) => sum + event.currentParticipants, 0),
    [events]
  )

  const fetchEvents = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/events', {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'イベント情報の取得に失敗しました')
      }

      const formattedEvents: AdminEventItem[] = data.events.map((event: any) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        type: event.type,
        targetRoles: event.targetRoles || [],
        attendanceType: event.attendanceType || 'optional',
        venueType: event.venueType || 'online',
        location: event.location,
        maxParticipants: event.maxParticipants,
        status: event.status,
        thumbnailUrl: event.thumbnailUrl || null,
        currentParticipants: event.currentParticipants,
        registrations: event.registrations,
        // 過去イベント記録用
        summary: event.summary || null,
        photos: event.photos || [],
        materialsUrl: event.materialsUrl || null,
        vimeoUrl: event.vimeoUrl || null,
        actualParticipants: event.actualParticipants || null,
        actualLocation: event.actualLocation || null,
        adminNotes: event.adminNotes || null,
        isArchiveOnly: event.isArchiveOnly || false,
      }))

      setEvents(formattedEvents)
    } catch (err) {
      console.error('Failed to fetch admin events:', err)
      setError(err instanceof Error ? err.message : 'イベント情報の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createEvent = useCallback(async (eventData: any): Promise<boolean> => {
    try {
      const response = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(eventData),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'イベントの作成に失敗しました')
      }

      setEvents(prev => [...prev, data.event])
      return true
    } catch (err) {
      console.error('Failed to create event:', err)
      alert(err instanceof Error ? err.message : 'イベントの作成に失敗しました')
      return false
    }
  }, [])

  const updateEvent = useCallback(async (eventId: string, eventData: any): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(eventData),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'イベントの更新に失敗しました')
      }

      await fetchEvents()
      return true
    } catch (err) {
      console.error('Failed to update event:', err)
      alert(err instanceof Error ? err.message : 'イベントの更新に失敗しました')
      return false
    }
  }, [fetchEvents])

  const deleteEvent = useCallback(async (eventId: string): Promise<boolean> => {
    if (!confirm('このイベントを削除しますか？')) return false

    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'イベントの削除に失敗しました')
      }

      setEvents(prev => prev.filter(event => event.id !== eventId))
      return true
    } catch (err) {
      console.error('Failed to delete event:', err)
      alert(err instanceof Error ? err.message : 'イベントの削除に失敗しました')
      return false
    }
  }, [])

  return {
    events,
    isLoading,
    error,
    totalParticipants,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  }
}

'use client'

import { useState, useEffect } from 'react'
import { ContinueWatching } from './continue-watching'
import { PopularRanking } from './popular-ranking'
import { NewVideos } from './new-videos'

interface VideoSectionsData {
  continueWatching: any[]
  popularRanking: {
    weekly: any[]
    monthly: any[]
    allTime: any[]
  }
  newVideos: any[]
}

function VideoSectionsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[1, 2].map((section) => (
        <div key={section}>
          <div className="h-6 w-32 bg-slate-200 rounded mb-3" />
          <div className="flex gap-3 sm:gap-4 overflow-hidden">
            {[1, 2, 3, 4].map((card) => (
              <div key={card} className="flex-shrink-0 w-[200px] sm:w-[240px]">
                <div className="aspect-video bg-slate-200 rounded-lg" />
                <div className="mt-2 space-y-1.5">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function VideoSections() {
  const [data, setData] = useState<VideoSectionsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard/video-sections', {
          credentials: 'include',
        })
        const json = await response.json()
        if (json.success) {
          setData(json)
        }
      } catch (error) {
        console.error('Error fetching video sections:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (isLoading) return <VideoSectionsSkeleton />

  if (!data) return null

  const hasAnyData =
    data.continueWatching.length > 0 ||
    data.popularRanking.weekly.length > 0 ||
    data.popularRanking.monthly.length > 0 ||
    data.popularRanking.allTime.length > 0 ||
    data.newVideos.length > 0

  if (!hasAnyData) return null

  return (
    <div className="space-y-6">
      <ContinueWatching items={data.continueWatching} />
      <PopularRanking
        weekly={data.popularRanking.weekly}
        monthly={data.popularRanking.monthly}
        allTime={data.popularRanking.allTime}
      />
      <NewVideos items={data.newVideos} />
    </div>
  )
}

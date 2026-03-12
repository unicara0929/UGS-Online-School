'use client'

import { Sparkles } from 'lucide-react'
import { VideoCard } from './video-card'

interface NewVideoItem {
  lessonId: string
  courseId: string
  lessonTitle: string
  courseTitle: string
  thumbnailUrl: string | null
  createdAt: string
}

interface NewVideosProps {
  items: NewVideoItem[]
}

export function NewVideos({ items }: NewVideosProps) {
  if (items.length === 0) return null

  return (
    <section>
      <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" aria-hidden="true" />
        新着動画
      </h3>
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
        {items.map((item) => (
          <VideoCard
            key={item.lessonId}
            thumbnailUrl={item.thumbnailUrl}
            title={item.lessonTitle}
            subtitle={item.courseTitle}
            href={`/dashboard/learn/${item.courseId}?lesson=${item.lessonId}`}
            overlay={
              <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2">
                <span className="inline-block bg-red-500 text-white text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded">
                  NEW
                </span>
              </div>
            }
          />
        ))}
      </div>
    </section>
  )
}

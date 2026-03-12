'use client'

import { Play } from 'lucide-react'
import { VideoCard } from './video-card'

interface ContinueWatchingItem {
  lessonId: string
  courseId: string
  lessonTitle: string
  courseTitle: string
  thumbnailUrl: string | null
  currentTime: number
  videoDuration: number
}

interface ContinueWatchingProps {
  items: ContinueWatchingItem[]
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function ContinueWatching({ items }: ContinueWatchingProps) {
  if (items.length === 0) return null

  return (
    <section>
      <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
        <Play className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" aria-hidden="true" />
        続きを見る
      </h3>
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
        {items.map((item) => {
          const progress = item.videoDuration > 0
            ? Math.round((item.currentTime / item.videoDuration) * 100)
            : 0

          return (
            <VideoCard
              key={item.lessonId}
              thumbnailUrl={item.thumbnailUrl}
              title={item.lessonTitle}
              subtitle={item.courseTitle}
              href={`/dashboard/learn/${item.courseId}?lesson=${item.lessonId}`}
              overlay={
                <>
                  {/* 再生アイコンオーバーレイ */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center scale-0 group-hover:scale-100 transition-transform">
                      <Play className="h-5 w-5 text-slate-700 ml-0.5" aria-hidden="true" />
                    </div>
                  </div>
                  {/* プログレスバー */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </>
              }
              footer={
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {formatTime(item.currentTime)} / {formatTime(item.videoDuration)}
                </p>
              }
            />
          )
        })}
      </div>
    </section>
  )
}

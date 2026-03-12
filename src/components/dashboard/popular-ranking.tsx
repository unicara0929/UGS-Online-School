'use client'

import { useState } from 'react'
import { Trophy, Star } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { VideoCard } from './video-card'

interface RankingItem {
  rank: number
  lessonId: string
  courseId: string
  lessonTitle: string
  courseTitle: string
  thumbnailUrl: string | null
  avgRating: number | null
}

interface PopularRankingProps {
  weekly: RankingItem[]
  monthly: RankingItem[]
  allTime: RankingItem[]
}

function getRankBadgeColor(rank: number): string {
  switch (rank) {
    case 1: return 'bg-yellow-400 text-yellow-900'
    case 2: return 'bg-gray-300 text-gray-700'
    case 3: return 'bg-amber-600 text-amber-50'
    default: return 'bg-slate-600 text-white'
  }
}

function RankingList({ items }: { items: RankingItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500 py-4">まだデータがありません</p>
  }

  return (
    <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
      {items.map((item) => (
        <VideoCard
          key={item.lessonId}
          thumbnailUrl={item.thumbnailUrl}
          title={item.lessonTitle}
          subtitle={item.courseTitle}
          href={`/dashboard/learn/${item.courseId}?lesson=${item.lessonId}`}
          overlay={
            <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2">
              <span className={`inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-xs sm:text-sm font-bold ${getRankBadgeColor(item.rank)}`}>
                {item.rank}
              </span>
            </div>
          }
          footer={
            item.avgRating != null ? (
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" aria-hidden="true" />
                <span className="text-[10px] sm:text-xs text-slate-600">{item.avgRating.toFixed(1)}</span>
              </div>
            ) : null
          }
        />
      ))}
    </div>
  )
}

export function PopularRanking({ weekly, monthly, allTime }: PopularRankingProps) {
  const hasData = weekly.length > 0 || monthly.length > 0 || allTime.length > 0
  if (!hasData) return null

  return (
    <section>
      <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
        <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" aria-hidden="true" />
        人気ランキング
      </h3>
      <Tabs defaultValue="weekly">
        <TabsList className="mb-3">
          <TabsTrigger value="weekly">週間</TabsTrigger>
          <TabsTrigger value="monthly">月間</TabsTrigger>
          <TabsTrigger value="allTime">全期間</TabsTrigger>
        </TabsList>
        <TabsContent value="weekly">
          <RankingList items={weekly} />
        </TabsContent>
        <TabsContent value="monthly">
          <RankingList items={monthly} />
        </TabsContent>
        <TabsContent value="allTime">
          <RankingList items={allTime} />
        </TabsContent>
      </Tabs>
    </section>
  )
}

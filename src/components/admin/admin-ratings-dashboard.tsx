'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Star, ChevronDown, ChevronRight, MessageSquare, Loader2 } from 'lucide-react'

interface LowRatingComment {
  rating: number
  comment: string
  userName: string
  createdAt: string
}

interface LessonStats {
  id: string
  title: string
  order: number
  avgRating: number
  totalRatings: number
  distribution: number[]
  lowRatingComments: LowRatingComment[]
}

interface CourseStats {
  id: string
  title: string
  avgRating: number
  totalRatings: number
  distribution: number[]
  lessons: LessonStats[]
}

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-6 w-6 sm:h-8 sm:w-8' : 'h-4 w-4'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={`${sizeClass} ${
            value <= Math.round(rating)
              ? 'text-yellow-500 fill-yellow-400'
              : 'text-slate-300 fill-none'
          }`}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

function DistributionBar({ distribution, totalRatings }: { distribution: number[]; totalRatings: number }) {
  if (totalRatings === 0) {
    return <p className="text-xs text-slate-400">評価データなし</p>
  }

  return (
    <div className="space-y-1">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = distribution[star - 1]
        const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0
        return (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="w-3 text-right text-slate-600">{star}</span>
            <Star className="h-3 w-3 text-yellow-500 fill-yellow-400 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="w-8 text-right text-slate-500">{count}件</span>
          </div>
        )
      })}
    </div>
  )
}

export function AdminRatingsDashboard() {
  const [courses, setCourses] = useState<CourseStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/admin/ratings', { credentials: 'include' })
        const data = await res.json()
        if (data.success) {
          setCourses(data.courses)
        }
      } catch (err) {
        console.error('Failed to fetch ratings:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const toggleCourse = (courseId: string) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev)
      if (next.has(courseId)) {
        next.delete(courseId)
      } else {
        next.add(courseId)
      }
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  // 全体集計
  const allRatingsCount = courses.reduce((sum, c) => sum + c.totalRatings, 0)
  const overallAvg =
    allRatingsCount > 0
      ? Math.round(
          (courses.reduce((sum, c) => sum + c.avgRating * c.totalRatings, 0) /
            allRatingsCount) *
            10
        ) / 10
      : 0
  const overallDistribution = [0, 0, 0, 0, 0]
  courses.forEach((c) => {
    c.distribution.forEach((count, i) => {
      overallDistribution[i] += count
    })
  })

  return (
    <div className="space-y-6">
      {/* 全体サマリー */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">全体サマリー</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-6">
            {/* 平均評価 */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-3xl sm:text-4xl font-bold text-slate-900">
                  {overallAvg > 0 ? overallAvg.toFixed(1) : '-'}
                </p>
                <StarDisplay rating={overallAvg} size="lg" />
                <p className="text-xs text-slate-500 mt-1">
                  {allRatingsCount}件の評価
                </p>
              </div>
            </div>

            {/* 分布 */}
            <div className="flex-1 max-w-xs">
              <DistributionBar
                distribution={overallDistribution}
                totalRatings={allRatingsCount}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* コース別一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">コース別評価</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {courses.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">
              評価データがありません
            </div>
          ) : (
            <div className="divide-y">
              {courses.map((course) => {
                const isExpanded = expandedCourses.has(course.id)
                // 最低評価レッスンを見つける
                const lessonsWithRatings = course.lessons.filter(
                  (l) => l.totalRatings > 0
                )
                const lowestLesson =
                  lessonsWithRatings.length > 0
                    ? lessonsWithRatings.reduce((min, l) =>
                        l.avgRating < min.avgRating ? l : min
                      )
                    : null

                return (
                  <div key={course.id}>
                    {/* コース行 */}
                    <button
                      type="button"
                      onClick={() => toggleCourse(course.id)}
                      className="w-full px-4 sm:px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      )}

                      {/* コース名 */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {course.title}
                        </p>
                        {lowestLesson && lowestLesson.avgRating < course.avgRating && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            最低評価: {lowestLesson.title} ({lowestLesson.avgRating.toFixed(1)})
                          </p>
                        )}
                      </div>

                      {/* 平均評価 */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StarDisplay rating={course.avgRating} />
                        <span className="text-sm font-medium text-slate-700 w-8 text-right">
                          {course.avgRating > 0 ? course.avgRating.toFixed(1) : '-'}
                        </span>
                      </div>

                      {/* 評価数 */}
                      <span className="text-xs text-slate-500 flex-shrink-0 w-12 text-right">
                        {course.totalRatings}件
                      </span>
                    </button>

                    {/* レッスン別ドリルダウン */}
                    {isExpanded && (
                      <div className="bg-slate-50 border-t">
                        {course.lessons.length === 0 ? (
                          <div className="px-6 py-4 text-xs text-slate-400">
                            レッスンがありません
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {course.lessons.map((lesson) => (
                              <div key={lesson.id} className="px-6 sm:px-10 py-4">
                                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                                  {/* レッスン情報 */}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800">
                                      {lesson.order}. {lesson.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <StarDisplay rating={lesson.avgRating} />
                                      <span className="text-xs text-slate-600">
                                        {lesson.avgRating > 0
                                          ? lesson.avgRating.toFixed(1)
                                          : '-'}{' '}
                                        ({lesson.totalRatings}件)
                                      </span>
                                    </div>
                                  </div>

                                  {/* 分布バー */}
                                  <div className="w-full sm:w-48">
                                    <DistributionBar
                                      distribution={lesson.distribution}
                                      totalRatings={lesson.totalRatings}
                                    />
                                  </div>
                                </div>

                                {/* 低評価コメント */}
                                {lesson.lowRatingComments.length > 0 && (
                                  <div className="mt-3 space-y-2">
                                    <p className="text-xs font-medium text-red-600 flex items-center gap-1">
                                      <MessageSquare className="h-3 w-3" />
                                      低評価コメント
                                    </p>
                                    {lesson.lowRatingComments.map((c, i) => (
                                      <div
                                        key={i}
                                        className="bg-white rounded-lg p-3 border border-red-100"
                                      >
                                        <div className="flex items-center gap-2 mb-1">
                                          <StarDisplay rating={c.rating} />
                                          <span className="text-xs text-slate-500">
                                            {c.userName}
                                          </span>
                                          <span className="text-xs text-slate-400">
                                            {new Date(c.createdAt).toLocaleDateString('ja-JP')}
                                          </span>
                                        </div>
                                        <p className="text-xs text-slate-700">
                                          {c.comment}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

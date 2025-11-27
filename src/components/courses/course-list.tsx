'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/contexts/auth-context"
import {
  BookOpen,
  Lock,
  Play,
  CheckCircle,
  Clock,
  FileText,
  Video,
  Loader2,
  Sparkles
} from "lucide-react"
import Link from "next/link"
import { useNewBadge } from "@/hooks/use-new-badge"

interface Course {
  id: string
  title: string
  description: string
  category: 'income' | 'lifestyle' | 'startup'
  level: 'basic' | 'advanced' | 'intermediate'
  lessons: Lesson[]
  isLocked: boolean
  progress: number
  isNew?: boolean
  updatedAt?: string
}

interface Lesson {
  id: string
  title: string
  description: string
  duration: number
  isCompleted: boolean
  order: number
}

export function CourseList() {
  const { user, canAccessFPContent } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { markCategoryViewed, recordContentView } = useNewBadge()
  const hasMarkedViewed = useRef(false)

  // ページを開いたときにカテゴリを閲覧済みとしてマーク
  useEffect(() => {
    if (!hasMarkedViewed.current) {
      markCategoryViewed('COURSES')
      hasMarkedViewed.current = true
    }
  }, [markCategoryViewed])

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/courses', {
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'コース情報の取得に失敗しました')
      }

      setCourses(data.courses)
    } catch (err) {
      console.error('Failed to fetch courses:', err)
      setError(err instanceof Error ? err.message : 'コース情報の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
        <Button onClick={fetchCourses} className="mt-4">
          再読み込み
        </Button>
      </div>
    )
  }


  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'income': return '所得を増やす'
      case 'lifestyle': return '生き方を豊かにする'
      case 'startup': return 'スタートアップ支援'
      default: return category
    }
  }

  const getLevelLabel = (level: string) => {
    return level === 'basic' ? '基礎編' : '実践編'
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'income': return 'bg-green-100 text-green-800'
      case 'lifestyle': return 'bg-blue-100 text-blue-800'
      case 'startup': return 'bg-purple-100 text-purple-800'
      default: return 'bg-slate-100 text-slate-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">教育コンテンツ一覧</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {courses.map(course => (
          <Card key={course.id} className="hover:shadow-xl transition-all duration-300">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                  {course.isNew && (
                    <Badge className="bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0 animate-pulse text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      NEW
                    </Badge>
                  )}
                  <Badge className={`${getCategoryColor(course.category)} text-xs`}>
                    {getCategoryLabel(course.category)}
                  </Badge>
                </div>
                <Badge variant="outline" className="text-xs">
                  {getLevelLabel(course.level)}
                </Badge>
              </div>
              <CardTitle className="text-base sm:text-lg line-clamp-2">{course.title}</CardTitle>
              <CardDescription className="text-sm line-clamp-2">{course.description}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="space-y-3 sm:space-y-4">
                {/* 進捗状況 */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs sm:text-sm font-medium">進捗</span>
                    <span className="text-xs sm:text-sm text-slate-600">{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} className="h-2" />
                </div>

                {/* レッスン一覧 */}
                <div className="space-y-2">
                  <h4 className="text-xs sm:text-sm font-medium text-slate-700">レッスン一覧</h4>
                  <div className="max-h-28 sm:max-h-32 overflow-y-auto space-y-1">
                    {course.lessons.map(lesson => (
                      <div key={lesson.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center flex-1 min-w-0">
                          {lesson.isCompleted ? (
                            <CheckCircle className="h-3 w-3 text-green-500 mr-1.5 sm:mr-2 flex-shrink-0" />
                          ) : (
                            <div className="h-3 w-3 border border-slate-300 rounded-full mr-1.5 sm:mr-2 flex-shrink-0" />
                          )}
                          <span className="truncate">{lesson.title}</span>
                        </div>
                        <div className="flex items-center text-slate-500 ml-2 flex-shrink-0">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{lesson.duration}分</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* アクションボタン */}
                <div className="flex gap-2">
                  {course.isLocked ? (
                    <Button 
                      size="sm" 
                      disabled
                      className="flex-1"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      ロック中
                    </Button>
                  ) : (
                    <Link href={`/dashboard/learn/${course.id}`} className="flex-1">
                      <Button 
                        size="sm" 
                        className="w-full"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        学習開始
                      </Button>
                    </Link>
                  )}
                  {!course.isLocked && (
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* ロック理由 */}
                {course.isLocked && (
                  <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                    {course.category === 'startup' && !canAccessFPContent() && 
                      "FPエイド昇格後に利用可能"
                    }
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

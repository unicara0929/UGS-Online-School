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
  Loader2,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  DollarSign,
  Briefcase,
  Rocket,
  GraduationCap
} from "lucide-react"
import Link from "next/link"
import { useNewBadge } from "@/hooks/use-new-badge"

interface Course {
  id: string
  title: string
  description: string
  category: 'MONEY_LITERACY' | 'PRACTICAL_SKILL' | 'STARTUP_SUPPORT' | 'STARTUP_GUIDE'
  level: 'BASIC' | 'ADVANCED'
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

type CategoryType = 'MONEY_LITERACY' | 'PRACTICAL_SKILL' | 'STARTUP_SUPPORT' | 'STARTUP_GUIDE'

interface CategoryInfo {
  key: CategoryType
  label: string
  description: string
  icon: React.ReactNode
  bgColor: string
  borderColor: string
  iconBg: string
}

// UGS会員用カテゴリー（はじめにが先頭）
const CATEGORIES_FOR_MEMBER: CategoryInfo[] = [
  {
    key: 'STARTUP_GUIDE',
    label: 'はじめに',
    description: 'アプリの使い方・UGSの考え方',
    icon: <GraduationCap className="h-6 w-6 text-white" aria-hidden="true" />,
    bgColor: 'from-amber-50 to-orange-50',
    borderColor: 'border-amber-200',
    iconBg: 'from-amber-400 to-orange-500',
  },
  {
    key: 'MONEY_LITERACY',
    label: '所得を増やすマネーリテラシー全般',
    description: 'お金の知識を身につけ、資産形成の基礎を学ぶ',
    icon: <DollarSign className="h-6 w-6 text-white" aria-hidden="true" />,
    bgColor: 'from-green-50 to-emerald-50',
    borderColor: 'border-green-200',
    iconBg: 'from-green-400 to-emerald-500',
  },
  {
    key: 'PRACTICAL_SKILL',
    label: '実践スキル',
    description: '営業・ビジネススキルを実践的に学ぶ',
    icon: <Briefcase className="h-6 w-6 text-white" aria-hidden="true" />,
    bgColor: 'from-blue-50 to-indigo-50',
    borderColor: 'border-blue-200',
    iconBg: 'from-blue-400 to-indigo-500',
  },
  {
    key: 'STARTUP_SUPPORT',
    label: 'スタートアップ支援',
    description: '起業・独立に必要な知識とスキルを習得',
    icon: <Rocket className="h-6 w-6 text-white" aria-hidden="true" />,
    bgColor: 'from-purple-50 to-violet-50',
    borderColor: 'border-purple-200',
    iconBg: 'from-purple-400 to-violet-500',
  },
]

// FP/MGR/ADMIN用カテゴリー（はじめに除外）
const CATEGORIES_FOR_OTHERS: CategoryInfo[] = [
  {
    key: 'MONEY_LITERACY',
    label: '所得を増やすマネーリテラシー全般',
    description: 'お金の知識を身につけ、資産形成の基礎を学ぶ',
    icon: <DollarSign className="h-6 w-6 text-white" aria-hidden="true" />,
    bgColor: 'from-green-50 to-emerald-50',
    borderColor: 'border-green-200',
    iconBg: 'from-green-400 to-emerald-500',
  },
  {
    key: 'PRACTICAL_SKILL',
    label: '実践スキル',
    description: '営業・ビジネススキルを実践的に学ぶ',
    icon: <Briefcase className="h-6 w-6 text-white" aria-hidden="true" />,
    bgColor: 'from-blue-50 to-indigo-50',
    borderColor: 'border-blue-200',
    iconBg: 'from-blue-400 to-indigo-500',
  },
  {
    key: 'STARTUP_SUPPORT',
    label: 'スタートアップ支援',
    description: '起業・独立に必要な知識とスキルを習得',
    icon: <Rocket className="h-6 w-6 text-white" aria-hidden="true" />,
    bgColor: 'from-purple-50 to-violet-50',
    borderColor: 'border-purple-200',
    iconBg: 'from-purple-400 to-violet-500',
  },
]

export function CourseList() {
  const { user, canAccessFPContent } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null)
  const { markCategoryViewed } = useNewBadge()
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
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden="true" />
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

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'BASIC': return '基礎編'
      case 'ADVANCED': return '応用編'
      default: return level
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'BASIC': return 'bg-blue-100 text-blue-800'
      case 'ADVANCED': return 'bg-orange-100 text-orange-800'
      default: return 'bg-slate-100 text-slate-800'
    }
  }

  // カテゴリーごとのコース数とレッスン数を計算
  const getCategoryStats = (category: CategoryType) => {
    const categoryCourses = courses.filter(c => c.category === category)
    const totalLessons = categoryCourses.reduce((sum, c) => sum + c.lessons.length, 0)
    const completedLessons = categoryCourses.reduce(
      (sum, c) => sum + c.lessons.filter(l => l.isCompleted).length, 0
    )
    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
    const isLocked = categoryCourses.every(c => c.isLocked)
    return { courseCount: categoryCourses.length, totalLessons, completedLessons, progress, isLocked }
  }

  // 選択されたカテゴリーのコースを取得
  const getCoursesForCategory = (category: CategoryType) => {
    return courses.filter(c => c.category === category)
  }

  // カテゴリーカードをレンダリング
  const renderCategoryCard = (categoryInfo: CategoryInfo) => {
    const stats = getCategoryStats(categoryInfo.key)
    const hasNewContent = courses.some(c => c.category === categoryInfo.key && c.isNew)

    return (
      <Card
        key={categoryInfo.key}
        className={`hover:shadow-xl transition-shadow duration-300 cursor-pointer bg-gradient-to-r ${categoryInfo.bgColor} ${categoryInfo.borderColor} border-2`}
        onClick={() => !stats.isLocked && setSelectedCategory(categoryInfo.key)}
      >
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-start justify-between">
            <div className={`flex items-center justify-center w-12 h-12 bg-gradient-to-br ${categoryInfo.iconBg} rounded-xl shadow-md`}>
              {categoryInfo.icon}
            </div>
            <div className="flex items-center gap-2">
              {hasNewContent && (
                <Badge className="bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0 animate-pulse text-xs">
                  <Sparkles className="h-3 w-3 mr-1" aria-hidden="true" />
                  NEW
                </Badge>
              )}
              {stats.isLocked && (
                <Badge variant="secondary" className="text-xs">
                  <Lock className="h-3 w-3 mr-1" aria-hidden="true" />
                  ロック中
                </Badge>
              )}
            </div>
          </div>
          <CardTitle className="text-lg sm:text-xl mt-4">{categoryInfo.label}</CardTitle>
          <CardDescription className="text-sm">{categoryInfo.description}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="space-y-3">
            {/* 進捗状況 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs sm:text-sm font-medium">進捗</span>
                <span className="text-xs sm:text-sm text-slate-600">
                  {stats.completedLessons}/{stats.totalLessons} レッスン ({stats.progress}%)
                </span>
              </div>
              <Progress value={stats.progress} className="h-2" />
            </div>

            {/* コース数表示 */}
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>{stats.courseCount}コース</span>
              {!stats.isLocked && (
                <span className="flex items-center text-blue-600 font-medium">
                  詳細を見る
                  <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
                </span>
              )}
            </div>

            {/* ロック理由 */}
            {stats.isLocked && (
              <div className="text-xs text-slate-500 bg-white/50 p-2 rounded">
                このカテゴリは現在のロールでは閲覧できません
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // コースカードをレンダリング（基礎編/応用編）
  const renderCourseCard = (course: Course) => (
    <Card key={course.id} className="hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      <CardHeader className="p-3 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {course.isNew && (
            <Badge className="bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0 animate-pulse text-xs">
              <Sparkles className="h-3 w-3 mr-1" aria-hidden="true" />
              NEW
            </Badge>
          )}
          {/* はじめにカテゴリのコースはレベルバッジを表示しない */}
          {course.category !== 'STARTUP_GUIDE' && (
            <Badge className={`${getLevelColor(course.level)} text-xs`}>
              {getLevelLabel(course.level)}
            </Badge>
          )}
        </div>
        <CardTitle className="text-sm sm:text-lg line-clamp-2">{course.title}</CardTitle>
        <CardDescription className="text-xs sm:text-sm line-clamp-2">{course.description}</CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
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
            <h4 className="text-xs sm:text-sm font-medium text-slate-700">
              コンテンツ一覧（{course.lessons.length}本）
            </h4>
            <div className="max-h-32 sm:max-h-48 overflow-y-auto space-y-1">
              {course.lessons.map(lesson => (
                <div key={lesson.id} className="flex items-center text-[10px] sm:text-xs bg-slate-50 p-1.5 sm:p-2 rounded">
                  <div className="flex items-center flex-1 min-w-0 overflow-hidden">
                    {lesson.isCompleted ? (
                      <CheckCircle className="h-3 w-3 text-green-500 mr-1 sm:mr-2 flex-shrink-0" aria-hidden="true" />
                    ) : (
                      <div className="h-3 w-3 border border-slate-300 rounded-full mr-1 sm:mr-2 flex-shrink-0" />
                    )}
                    <span className="truncate">{lesson.title}</span>
                  </div>
                  <div className="flex items-center text-slate-500 ml-1 sm:ml-2 flex-shrink-0">
                    <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" aria-hidden="true" />
                    <span>{Math.round(lesson.duration / 60)}分</span>
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
                <Lock className="h-4 w-4 mr-2" aria-hidden="true" />
                ロック中
              </Button>
            ) : (
              <Link href={`/dashboard/learn/${course.id}`} className="flex-1">
                <Button
                  size="sm"
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" aria-hidden="true" />
                  学習開始
                </Button>
              </Link>
            )}
          </div>

          {/* ロック理由 */}
          {course.isLocked && (
            <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
              このコースは現在のロールでは閲覧できません
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  // UGS会員（member）は「はじめに」を先頭に表示、他のロールは除外
  const isMember = user?.role === 'member'
  const visibleCategories = isMember ? CATEGORIES_FOR_MEMBER : CATEGORIES_FOR_OTHERS

  // カテゴリー選択時の表示
  if (selectedCategory) {
    const categoryInfo = visibleCategories.find(c => c.key === selectedCategory)!
    const categoryCourses = getCoursesForCategory(selectedCategory)

    return (
      <div className="space-y-6">
        {/* 戻るボタン */}
        <Button
          variant="ghost"
          onClick={() => setSelectedCategory(null)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          カテゴリー一覧に戻る
        </Button>

        {/* カテゴリーヘッダー */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br ${categoryInfo.iconBg} rounded-xl shadow-md flex-shrink-0`}>
            {categoryInfo.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-2xl font-bold text-slate-900 truncate">{categoryInfo.label}</h2>
            <p className="text-xs sm:text-sm text-slate-500 line-clamp-1">{categoryInfo.description}</p>
          </div>
        </div>

        {/* コース一覧（基礎編/応用編） */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {categoryCourses
            .sort((a, b) => (a.level === 'BASIC' ? -1 : 1))
            .map(renderCourseCard)}
        </div>
      </div>
    )
  }

  // カテゴリー一覧表示
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-2xl font-bold text-slate-900">教育コンテンツ</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {visibleCategories.map(renderCategoryCard)}
      </div>
    </div>
  )
}

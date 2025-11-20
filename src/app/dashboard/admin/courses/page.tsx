'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  AlertCircle,
  PlayCircle
} from 'lucide-react'

interface Course {
  id: string
  title: string
  description: string | null
  category: 'BASIC' | 'ADVANCED' | 'PRACTICAL'
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  isLocked: boolean
  isPublished: boolean
  order: number
  lessonCount: number
  createdAt: string
  updatedAt: string
}

const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    BASIC: '基礎編',
    ADVANCED: '応用編',
    PRACTICAL: '実践編'
  }
  return labels[category] || category
}

const getLevelLabel = (level: string) => {
  const labels: Record<string, string> = {
    BEGINNER: '初級',
    INTERMEDIATE: '中級',
    ADVANCED: '上級'
  }
  return labels[level] || level
}

export default function AdminCoursesPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/courses', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('コース一覧の取得に失敗しました')
      }

      const data = await response.json()
      setCourses(data.courses)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (courseId: string, title: string) => {
    if (!confirm(`コース「${title}」を削除してもよろしいですか？\n\n※このコースに含まれるすべてのレッスンも削除されます。`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'コースの削除に失敗しました')
      }

      alert('コースを削除しました')
      fetchCourses()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました')
    }
  }

  const handleTogglePublish = async (courseId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          isPublished: !currentStatus
        })
      })

      if (!response.ok) {
        throw new Error('公開ステータスの変更に失敗しました')
      }

      fetchCourses()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <BookOpen className="h-10 w-10 text-white animate-pulse" />
            </div>
            <div className="absolute inset-0 w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto animate-ping opacity-20"></div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">コース一覧を読み込み中...</h2>
          <p className="text-slate-600">データを取得しています</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        <Card className="max-w-2xl mx-auto border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto p-6 space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">教育コンテンツ管理</h1>
            <p className="text-slate-600">コースとレッスンを管理します</p>
          </div>
          <Button
            onClick={() => router.push('/dashboard/admin/courses/new')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            新規コース作成
          </Button>
        </div>

        {/* コース一覧 */}
        {courses.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 mb-4">まだコースが登録されていません</p>
              <Button
                onClick={() => router.push('/dashboard/admin/courses/new')}
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                最初のコースを作成
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {courses.map((course) => (
              <Card key={course.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start space-x-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-xl font-bold text-slate-900">{course.title}</h3>
                            {!course.isPublished && (
                              <Badge variant="secondary">
                                <EyeOff className="h-3 w-3 mr-1" />
                                非公開
                              </Badge>
                            )}
                            {course.isLocked && (
                              <Badge variant="outline">
                                <Lock className="h-3 w-3 mr-1" />
                                FP限定
                              </Badge>
                            )}
                          </div>
                          {course.description && (
                            <p className="text-slate-600 mb-3">{course.description}</p>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-slate-500">
                            <span className="flex items-center">
                              <Badge variant="outline" className="mr-2">
                                {getCategoryLabel(course.category)}
                              </Badge>
                              <Badge variant="outline">
                                {getLevelLabel(course.level)}
                              </Badge>
                            </span>
                            <span className="flex items-center">
                              <PlayCircle className="h-4 w-4 mr-1" />
                              {course.lessonCount}レッスン
                            </span>
                            <span>並び順: {course.order}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* アクションボタン */}
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTogglePublish(course.id, course.isPublished)}
                        title={course.isPublished ? '非公開にする' : '公開する'}
                      >
                        {course.isPublished ? (
                          <><Eye className="h-4 w-4 mr-1" />公開中</>
                        ) : (
                          <><EyeOff className="h-4 w-4 mr-1" />非公開</>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/admin/courses/${course.id}`)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        編集
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(course.id, course.title)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        削除
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

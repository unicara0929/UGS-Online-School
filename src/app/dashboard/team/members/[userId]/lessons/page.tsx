'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Loader2,
  ArrowLeft,
  BookOpen,
  User,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

interface CompletedLesson {
  id: string
  lessonId: string
  lessonTitle: string
  lessonOrder: number
  courseId: string
  courseTitle: string
  completedAt: string | null
}

interface UserInfo {
  name: string
  email: string
}

export default function CompletedLessonsPage({ params }: { params: Promise<{ userId: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [lessons, setLessons] = useState<CompletedLesson[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCompletedLessons()
  }, [resolvedParams.userId])

  const fetchCompletedLessons = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/team/members/${resolvedParams.userId}/completed-lessons`, {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '視聴済みレッスンの取得に失敗しました')
      }

      setUser(data.user)
      setLessons(data.lessons)
      setTotalCount(data.totalCount)
    } catch (err) {
      console.error('Failed to fetch completed lessons:', err)
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <ProtectedRoute requiredRoles={['manager', 'admin']}>
        <DashboardLayout>
          <div className="p-6 flex items-center justify-center min-h-screen">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" aria-hidden="true" />
              <p className="text-slate-600">視聴済みレッスンを読み込み中...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute requiredRoles={['manager', 'admin']}>
        <DashboardLayout>
          <div className="p-6">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard/team')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
              チーム一覧に戻る
            </Button>
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <p role="alert" className="text-red-600">{error}</p>
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRoles={['manager', 'admin']}>
      <DashboardLayout>
        <div className="p-6 space-y-6">
          {/* ヘッダー */}
          <div>
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard/team')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
              チーム一覧に戻る
            </Button>

            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-blue-600" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">視聴済みレッスン一覧</h1>
                {user && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <User className="h-4 w-4" aria-hidden="true" />
                    <span>{user.name}さん</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
              <span className="font-semibold">合計 {totalCount} レッスン完了</span>
            </div>
          </div>

          {/* レッスン一覧テーブル */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" aria-hidden="true" />
                視聴済みレッスン
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lessons.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-slate-300" aria-hidden="true" />
                  <p>視聴済みのレッスンはありません</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="font-semibold text-slate-700">コース名</TableHead>
                        <TableHead className="font-semibold text-slate-700">レッスン名</TableHead>
                        <TableHead className="font-semibold text-slate-700">視聴完了日</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lessons.map((lesson) => (
                        <TableRow key={lesson.id} className="hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-900">
                            {lesson.courseTitle}
                          </TableCell>
                          <TableCell className="text-slate-700">
                            {lesson.lessonTitle}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {formatDate(lesson.completedAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

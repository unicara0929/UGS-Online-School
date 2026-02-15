'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowLeft,
  Save,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  PlayCircle,
  AlertCircle,
  FileText,
  Clock,
  GripVertical
} from 'lucide-react'

interface Course {
  id: string
  title: string
  description: string | null
  category: 'MONEY_LITERACY' | 'PRACTICAL_SKILL' | 'STARTUP_SUPPORT' | 'STARTUP_GUIDE'
  level: 'BASIC' | 'ADVANCED'
  isLocked: boolean
  isPublished: boolean
  order: number
  lessons: Lesson[]
}

interface Lesson {
  id: string
  title: string
  description: string | null
  duration: number
  order: number
  videoUrl: string | null
  pdfUrl: string | null
  isPublished: boolean
}

// ドラッグ可能なレッスンカード
function SortableLessonCard({
  lesson,
  onEdit,
  onDelete,
  onTogglePublish,
}: {
  lesson: Lesson
  onEdit: (lesson: Lesson) => void
  onDelete: (id: string, title: string) => void
  onTogglePublish: (id: string, status: boolean) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`hover:shadow-md transition-shadow ${isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start flex-1">
            {/* ドラッグハンドル */}
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-2 -ml-2 mr-2 text-slate-400 hover:text-slate-600"
            >
              <GripVertical className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-sm text-slate-400 font-mono">{lesson.order}.</span>
                <h4 className="font-semibold text-slate-900">{lesson.title}</h4>
                {!lesson.isPublished && (
                  <Badge variant="secondary" className="text-xs">
                    <EyeOff className="h-3 w-3 mr-1" aria-hidden="true" />
                    非公開
                  </Badge>
                )}
              </div>
              {lesson.description && (
                <p className="text-sm text-slate-600 mb-2 ml-8">{lesson.description}</p>
              )}
              <div className="flex items-center space-x-4 text-sm text-slate-500 ml-8">
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
                  {Math.floor(lesson.duration / 60)}分{lesson.duration % 60}秒
                </span>
                {lesson.videoUrl && (
                  <span className="flex items-center">
                    <PlayCircle className="h-3 w-3 mr-1" aria-hidden="true" />
                    動画あり
                  </span>
                )}
                {lesson.pdfUrl && (
                  <span className="flex items-center">
                    <FileText className="h-3 w-3 mr-1" aria-hidden="true" />
                    PDFあり
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTogglePublish(lesson.id, lesson.isPublished)}
            >
              {lesson.isPublished ? (
                <><Eye className="h-3 w-3 mr-1" aria-hidden="true" />公開</>
              ) : (
                <><EyeOff className="h-3 w-3 mr-1" aria-hidden="true" />非公開</>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(lesson)}
            >
              <Edit className="h-3 w-3 mr-1" aria-hidden="true" />
              編集
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(lesson.id, lesson.title)}
            >
              <Trash2 className="h-3 w-3 mr-1" aria-hidden="true" />
              削除
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function EditCoursePage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string

  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)

  // コース編集用のフォームデータ
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    category: 'MONEY_LITERACY' as 'MONEY_LITERACY' | 'PRACTICAL_SKILL' | 'STARTUP_SUPPORT' | 'STARTUP_GUIDE',
    level: 'BASIC' as 'BASIC' | 'ADVANCED',
    isLocked: false,
    viewableRoles: [] as string[],
    isPublished: true,
    order: 0
  })

  // レッスン編集用のモーダル状態
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [isAddingLesson, setIsAddingLesson] = useState(false)
  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    duration: 0,
    order: 0,
    videoUrl: '',
    pdfUrl: '',
    isPublished: true
  })

  // ドラッグ&ドロップ用センサー
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchCourse()
  }, [courseId])

  const fetchCourse = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('コースの取得に失敗しました')
      }

      const data = await response.json()
      setCourse(data.course)

      // フォームに初期値を設定
      setCourseForm({
        title: data.course.title,
        description: data.course.description || '',
        category: data.course.category,
        level: data.course.level,
        isLocked: data.course.isLocked,
        viewableRoles: data.course.viewableRoles || [],
        isPublished: data.course.isPublished,
        order: data.course.order
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id || !course) return

    const oldIndex = course.lessons.findIndex((l) => l.id === active.id)
    const newIndex = course.lessons.findIndex((l) => l.id === over.id)

    const newLessons = arrayMove(course.lessons, oldIndex, newIndex).map((lesson, index) => ({
      ...lesson,
      order: index + 1
    }))

    // 楽観的更新
    setCourse({ ...course, lessons: newLessons })

    // サーバーに保存
    setReordering(true)
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/lessons/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ lessonIds: newLessons.map(l => l.id) })
      })

      if (!response.ok) {
        throw new Error('並び替えの保存に失敗しました')
      }
    } catch (err) {
      // エラー時は元に戻す
      fetchCourse()
      alert(err instanceof Error ? err.message : '並び替えに失敗しました')
    } finally {
      setReordering(false)
    }
  }

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!courseForm.title.trim()) {
      alert('コースタイトルを入力してください')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(courseForm)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'コースの更新に失敗しました')
      }

      alert('コース情報を更新しました')
      fetchCourse()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  const handleAddLesson = () => {
    setEditingLesson(null)
    setLessonForm({
      title: '',
      description: '',
      duration: 0,
      order: course?.lessons.length || 0,
      videoUrl: '',
      pdfUrl: '',
      isPublished: true
    })
    setIsAddingLesson(true)
  }

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson)
    setLessonForm({
      title: lesson.title,
      description: lesson.description || '',
      duration: lesson.duration,
      order: lesson.order,
      videoUrl: lesson.videoUrl || '',
      pdfUrl: lesson.pdfUrl || '',
      isPublished: lesson.isPublished
    })
    setIsAddingLesson(true)
  }

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!lessonForm.title.trim()) {
      alert('レッスンタイトルを入力してください')
      return
    }

    if (lessonForm.duration < 0) {
      alert('有効な動画時間を入力してください')
      return
    }

    setSaving(true)
    try {
      const url = editingLesson
        ? `/api/admin/lessons/${editingLesson.id}`
        : `/api/admin/courses/${courseId}/lessons`

      const method = editingLesson ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(lessonForm)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'レッスンの保存に失敗しました')
      }

      alert(editingLesson ? 'レッスンを更新しました' : 'レッスンを追加しました')
      setIsAddingLesson(false)
      setEditingLesson(null)
      fetchCourse()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteLesson = async (lessonId: string, title: string) => {
    if (!confirm(`レッスン「${title}」を削除してもよろしいですか？`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/lessons/${lessonId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'レッスンの削除に失敗しました')
      }

      alert('レッスンを削除しました')
      fetchCourse()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました')
    }
  }

  const handleToggleLessonPublish = async (lessonId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/lessons/${lessonId}`, {
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

      fetchCourse()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl animate-pulse">
            <PlayCircle className="h-8 w-8 text-white" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">読み込み中...</h2>
        </div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        <Card className="max-w-2xl mx-auto border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600" aria-hidden="true" />
              <p role="alert" className="text-red-800">{error || 'コースが見つかりません'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto p-6 space-y-6 max-w-6xl">
        {/* 戻るボタン */}
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/admin/courses')}
          className="bg-white hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
          コース一覧に戻る
        </Button>

        {/* コース情報編集 */}
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b">
            <CardTitle className="text-2xl">コース情報編集</CardTitle>
            <CardDescription>基本情報を更新します</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSaveCourse} className="space-y-6">
              {/* タイトル */}
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-slate-700 mb-2">
                  コースタイトル <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* 説明 */}
              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-slate-700 mb-2">
                  説明
                </label>
                <textarea
                  id="description"
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>

              {/* カテゴリとレベル */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="category" className="block text-sm font-semibold text-slate-700 mb-2">
                    大カテゴリー <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="category"
                    value={courseForm.category}
                    onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value as Course['category'] })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="MONEY_LITERACY">所得を増やすマネーリテラシー全般</option>
                    <option value="PRACTICAL_SKILL">実践スキル</option>
                    <option value="STARTUP_SUPPORT">スタートアップ支援</option>
                    <option value="STARTUP_GUIDE">はじめに</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="level" className="block text-sm font-semibold text-slate-700 mb-2">
                    編 <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="level"
                    value={courseForm.level}
                    onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value as Course['level'] })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="BASIC">基礎編</option>
                    <option value="ADVANCED">応用編</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="order" className="block text-sm font-semibold text-slate-700 mb-2">
                    並び順
                  </label>
                  <input
                    id="order"
                    type="number"
                    value={courseForm.order}
                    onChange={(e) => setCourseForm({ ...courseForm, order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
              </div>

              {/* 公開設定 */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">公開設定</h3>

                <div className="flex items-center space-x-3">
                  <input
                    id="isPublished"
                    type="checkbox"
                    checked={courseForm.isPublished}
                    onChange={(e) => setCourseForm({ ...courseForm, isPublished: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="isPublished" className="text-sm font-medium text-slate-700">
                    公開する
                  </label>
                </div>

                {/* 閲覧可能ロール選択 */}
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    閲覧可能なロール（選択しない場合は全員閲覧可能）
                  </label>
                  <div className="space-y-2 bg-slate-50 p-4 rounded-lg">
                    {[
                      { value: 'MEMBER', label: 'UGS会員（メンバー）' },
                      { value: 'FP', label: 'FPエイド' },
                      { value: 'MANAGER', label: 'マネージャー' },
                      { value: 'ADMIN', label: '管理者' },
                    ].map((role) => (
                      <div key={role.value} className="flex items-center space-x-3">
                        <input
                          id={`role-${role.value}`}
                          type="checkbox"
                          checked={courseForm.viewableRoles.includes(role.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCourseForm({
                                ...courseForm,
                                viewableRoles: [...courseForm.viewableRoles, role.value]
                              })
                            } else {
                              setCourseForm({
                                ...courseForm,
                                viewableRoles: courseForm.viewableRoles.filter(r => r !== role.value)
                              })
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <label htmlFor={`role-${role.value}`} className="text-sm text-slate-700">
                          {role.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    ※ ロールを選択すると、選択したロールのユーザーのみが閲覧できます。
                    何も選択しない場合は全員が閲覧可能です。
                  </p>
                </div>
              </div>

              {/* ボタン */}
              <div className="flex justify-end pt-6 border-t">
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                  {saving ? '保存中...' : 'コース情報を保存'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* レッスン管理 */}
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">レッスン管理</CardTitle>
                <CardDescription>
                  ドラッグ&ドロップで並び替えできます
                  {reordering && <span className="ml-2 text-blue-600">保存中...</span>}
                </CardDescription>
              </div>
              <Button
                onClick={handleAddLesson}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                レッスンを追加
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {course.lessons.length === 0 ? (
              <div className="text-center py-12">
                <PlayCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" aria-hidden="true" />
                <p className="text-slate-600 mb-4">まだレッスンが登録されていません</p>
                <Button onClick={handleAddLesson} variant="outline">
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                  最初のレッスンを追加
                </Button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={course.lessons.map(l => l.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {course.lessons.map((lesson) => (
                      <SortableLessonCard
                        key={lesson.id}
                        lesson={lesson}
                        onEdit={handleEditLesson}
                        onDelete={handleDeleteLesson}
                        onTogglePublish={handleToggleLessonPublish}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>

        {/* レッスン追加/編集モーダル */}
        {isAddingLesson && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b sticky top-0 z-10">
                <CardTitle>{editingLesson ? 'レッスン編集' : 'レッスン追加'}</CardTitle>
                <CardDescription>
                  {editingLesson ? 'レッスンの内容を編集します' : '新しいレッスンを追加します'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSaveLesson} className="space-y-6">
                  {/* タイトル */}
                  <div>
                    <label htmlFor="lessonTitle" className="block text-sm font-semibold text-slate-700 mb-2">
                      レッスンタイトル <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="lessonTitle"
                      type="text"
                      value={lessonForm.title}
                      onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* 説明 */}
                  <div>
                    <label htmlFor="lessonDescription" className="block text-sm font-semibold text-slate-700 mb-2">
                      説明
                    </label>
                    <textarea
                      id="lessonDescription"
                      value={lessonForm.description}
                      onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>

                  {/* Vimeo URL */}
                  <div>
                    <label htmlFor="videoUrl" className="block text-sm font-semibold text-slate-700 mb-2">
                      Vimeo動画URL または Video ID
                    </label>
                    <input
                      id="videoUrl"
                      type="text"
                      value={lessonForm.videoUrl}
                      onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="例: https://vimeo.com/123456789 または 123456789"
                    />
                    <p className="text-sm text-slate-500 mt-1">
                      Vimeoの動画URLまたはVideo ID（数値のみ）を入力してください
                    </p>
                  </div>

                  {/* PDF URL */}
                  <div>
                    <label htmlFor="pdfUrl" className="block text-sm font-semibold text-slate-700 mb-2">
                      PDF URL
                    </label>
                    <input
                      id="pdfUrl"
                      type="text"
                      value={lessonForm.pdfUrl}
                      onChange={(e) => setLessonForm({ ...lessonForm, pdfUrl: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="例: https://example.com/document.pdf"
                    />
                  </div>

                  {/* 動画時間と並び順 */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="duration" className="block text-sm font-semibold text-slate-700 mb-2">
                        動画時間（秒）
                        <span className="text-xs text-slate-400 ml-2">※Vimeo URL入力時は自動取得</span>
                      </label>
                      <input
                        id="duration"
                        type="number"
                        value={lessonForm.duration}
                        onChange={(e) => setLessonForm({ ...lessonForm, duration: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        placeholder="0で自動取得"
                      />
                      <p className="text-sm text-slate-500 mt-1">
                        {lessonForm.duration > 0
                          ? `${Math.floor(lessonForm.duration / 60)}分${lessonForm.duration % 60}秒`
                          : 'Vimeo URLから自動取得されます'}
                      </p>
                    </div>

                    <div>
                      <label htmlFor="lessonOrder" className="block text-sm font-semibold text-slate-700 mb-2">
                        並び順
                      </label>
                      <input
                        id="lessonOrder"
                        type="number"
                        value={lessonForm.order}
                        onChange={(e) => setLessonForm({ ...lessonForm, order: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                  </div>

                  {/* 公開設定 */}
                  <div className="border-t pt-6">
                    <div className="flex items-center space-x-3">
                      <input
                        id="lessonPublished"
                        type="checkbox"
                        checked={lessonForm.isPublished}
                        onChange={(e) => setLessonForm({ ...lessonForm, isPublished: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <label htmlFor="lessonPublished" className="text-sm font-medium text-slate-700">
                        公開する
                      </label>
                    </div>
                  </div>

                  {/* ボタン */}
                  <div className="flex justify-end space-x-4 pt-6 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddingLesson(false)
                        setEditingLesson(null)
                      }}
                      disabled={saving}
                    >
                      キャンセル
                    </Button>
                    <Button
                      type="submit"
                      disabled={saving}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                      {saving ? '保存中...' : editingLesson ? 'レッスンを更新' : 'レッスンを追加'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

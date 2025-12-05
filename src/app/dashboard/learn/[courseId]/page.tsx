'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { useAuth } from "@/contexts/auth-context"
import { 
  BookOpen, 
  Play, 
  CheckCircle,
  Clock,
  FileText,
  Video,
  ArrowLeft,
  ArrowRight,
  Pause,
  RotateCcw,
  Bell,
  LogOut
} from "lucide-react"

interface Lesson {
  id: string
  title: string
  description: string
  duration: number
  isCompleted: boolean
  order: number
  content: string
  videoUrl?: string
  vimeoId?: string // Vimeo動画ID
  materials?: string[]
}

interface Course {
  id: string
  title: string
  description: string
  category: 'income' | 'lifestyle' | 'startup'
  level: 'basic' | 'advanced'
  lessons: Lesson[]
  progress: number
}

// Vimeo Player APIの型定義
declare global {
  interface Window {
    Vimeo?: {
      Player: new (element: HTMLIFrameElement) => {
        on: (event: string, callback: (data: any) => void) => void
        off: (event: string) => void
        getDuration: () => Promise<number>
        getCurrentTime: () => Promise<number>
      }
    }
  }
}

// モックデータは削除され、APIから取得するようになりました
const COURSES_OLD: Course[] = [
  {
    id: "1",
    title: "所得を増やす",
    description: "マネーリテラシー全般 - 知識をつけて、稼ぐ力を育てる",
    category: "income",
    level: "basic",
    progress: 25,
    lessons: [
      {
        id: "1-1",
        title: "お金の基本概念",
        description: "お金の本質と価値について学ぶ",
        duration: 15,
        isCompleted: true,
        order: 1,
        content: "お金は単なる紙切れや数字ではありません。お金は価値の交換手段であり、時間と労力の対価です。このレッスンでは、お金の本質的な意味と、現代社会におけるお金の役割について詳しく学びます。",
        videoUrl: "https://example.com/video1",
        vimeoId: "1135031850", // テスト用動画ID
        materials: ["お金の歴史.pdf", "価値の概念.pdf"]
      },
      {
        id: "1-2",
        title: "収入の種類と特徴",
        description: "給与、事業収入、投資収入の違い",
        duration: 20,
        isCompleted: true,
        order: 2,
        content: "収入には様々な種類があります。給与所得、事業所得、投資所得など、それぞれに特徴があります。このレッスンでは、各収入の種類とその特徴、税務上の取り扱いについて学びます。",
        videoUrl: "https://example.com/video2",
        vimeoId: "1135031850", // テスト用動画ID
        materials: ["収入の種類一覧.pdf", "税務ガイド.pdf"]
      },
      {
        id: "1-3",
        title: "税金の基礎知識",
        description: "所得税、住民税の仕組み",
        duration: 25,
        isCompleted: false,
        order: 3,
        content: "税金は社会の基盤を支える重要な制度です。所得税、住民税、消費税など、様々な税金の仕組みを理解することで、適切な税務管理ができるようになります。",
        videoUrl: "https://example.com/video3",
        vimeoId: "1135031850", // テスト用動画ID
        materials: ["税金の基礎.pdf", "計算例.pdf"]
      },
      {
        id: "1-4",
        title: "社会保険制度",
        description: "健康保険、年金制度の理解",
        duration: 18,
        isCompleted: false,
        order: 4,
        content: "社会保険制度は、私たちの生活を支える重要なセーフティネットです。健康保険、年金保険、雇用保険、労災保険、介護保険の5つの制度について詳しく学びます。",
        videoUrl: "https://example.com/video4",
        vimeoId: "1135031850", // テスト用動画ID
        materials: ["社会保険制度ガイド.pdf"]
      }
    ]
  },
  {
    id: "2",
    title: "生き方を豊かにする",
    description: "金融・経済を正しく理解し、お金を「怖いもの」から「使いこなす力」へ",
    category: "lifestyle",
    level: "basic",
    progress: 0,
    lessons: [
      {
        id: "2-1",
        title: "金融リテラシー基礎",
        description: "金融の基本概念",
        duration: 20,
        isCompleted: false,
        order: 1,
        content: "金融リテラシーとは、金融に関する知識と判断力のことです。このレッスンでは、金融の基本概念から始めて、日常生活で必要な金融知識を身につけます。",
        videoUrl: "https://example.com/video5",
        vimeoId: "1135031850", // テスト用動画ID
        materials: ["金融リテラシー基礎.pdf"]
      }
    ]
  },
  {
    id: "3",
    title: "スタートアップ支援",
    description: "ゼロから事業を立ち上げるために必要な知識・仕組みを学ぶ",
    category: "startup",
    level: "basic",
    progress: 0,
    lessons: [
      {
        id: "3-1",
        title: "起業の基礎知識",
        description: "起業に必要な基本知識",
        duration: 30,
        isCompleted: false,
        order: 1,
        content: "起業は夢を現実にする第一歩です。このレッスンでは、起業に必要な基本的な知識と心構えについて学びます。",
        videoUrl: "https://example.com/video6",
        vimeoId: "1135031850", // テスト用動画ID
        materials: ["起業ガイド.pdf"]
      }
    ]
  }
]

function LearningPage() {
  const { user, logout } = useAuth()
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [course, setCourse] = useState<Course | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [lessonProgress, setLessonProgress] = useState(0)
  const [vimeoPlayer, setVimeoPlayer] = useState<any>(null)

  // コースデータをAPIから取得
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/courses/${courseId}`, {
          credentials: 'include',
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'コース情報の取得に失敗しました')
        }

        setCourse(data.course)
      } catch (err) {
        console.error('Failed to fetch course:', err)
        setCourse(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCourse()
  }, [courseId])

  const currentLesson = course?.lessons[currentLessonIndex]

  // レッスン完了を記録する関数
  const handleCompleteLesson = async () => {
    if (!course || !currentLesson) return

    try {
      const response = await fetch('/api/courses/progress', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: course.id,
          lessonId: currentLesson.id,
          isCompleted: true,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // コースデータを再取得して進捗を更新
        const courseResponse = await fetch(`/api/courses/${courseId}`, {
          credentials: 'include',
        })
        const courseData = await courseResponse.json()
        if (courseResponse.ok && courseData.success) {
          setCourse(courseData.course)
        }
      }
    } catch (err) {
      console.error('Failed to mark lesson as complete:', err)
    }
  }

  // レッスンが切り替わったときに再生状態をリセット
  useEffect(() => {
    setIsPlaying(false)
    setLessonProgress(0)

    // 前のVimeo Playerをクリーンアップ
    if (vimeoPlayer) {
      try {
        vimeoPlayer.off('timeupdate')
        vimeoPlayer.off('play')
        vimeoPlayer.off('pause')
        vimeoPlayer.off('ended')
      } catch (err) {
        console.error('Error cleaning up Vimeo Player:', err)
      }
      setVimeoPlayer(null)
    }
  }, [currentLessonIndex])

  // Vimeo Player APIスクリプトを読み込む（1回のみ）
  useEffect(() => {
    // 既にスクリプトが読み込まれているかチェック
    const existingScript = document.querySelector('script[src="https://player.vimeo.com/api/player.js"]')

    if (!existingScript) {
      console.log('Loading Vimeo Player API script...')
      const script = document.createElement('script')
      script.src = 'https://player.vimeo.com/api/player.js'
      script.async = true
      document.body.appendChild(script)

      script.onload = () => {
        console.log('Vimeo Player API script loaded successfully')
      }

      script.onerror = () => {
        console.error('Failed to load Vimeo Player API script')
      }
    }
  }, [])

  // iframeがロードされたときにVimeo Playerを初期化
  const handleIframeLoad = useCallback(() => {
    if (!iframeRef.current || !currentLesson?.vimeoId) {
      console.log('Skipping Player initialization - iframe or vimeoId not ready')
      return
    }

    // @ts-ignore - Vimeo Player APIはグローバルに読み込まれる
    if (!window.Vimeo) {
      console.warn('Vimeo Player API not loaded yet, will retry on next iframe load')
      return
    }

    try {
      console.log('Initializing Vimeo Player for lesson:', currentLesson.id)
      // @ts-ignore
      const player = new window.Vimeo.Player(iframeRef.current)
      setVimeoPlayer(player)

      // 動画の時間更新を監視
      player.on('timeupdate', (data: { seconds: number; duration: number }) => {
        if (data.duration > 0) {
          const progress = (data.seconds / data.duration) * 100
          setLessonProgress(Math.round(progress))
        }
      })

      // 再生・一時停止状態を監視
      player.on('play', () => {
        setIsPlaying(true)
      })

      player.on('pause', () => {
        setIsPlaying(false)
      })

      // 動画終了時の処理
      player.on('ended', () => {
        setLessonProgress(100)
        setIsPlaying(false)
        console.log('Video ended for lesson:', currentLesson.id)
      })

      console.log('✓ Vimeo Player initialized successfully for lesson:', currentLesson.id)
    } catch (err) {
      console.error('Error initializing Vimeo Player:', err)
    }
  }, [currentLesson])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (vimeoPlayer) {
        try {
          vimeoPlayer.off('timeupdate')
          vimeoPlayer.off('play')
          vimeoPlayer.off('pause')
          vimeoPlayer.off('ended')
        } catch (err) {
          console.error('Error cleaning up Vimeo Player:', err)
        }
      }
    }
  }, [vimeoPlayer])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-slate-600">コースを読み込み中...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-slate-900 mb-2">コースが見つかりません</h2>
              <p className="text-slate-600 mb-4">指定されたコースは存在しません。</p>
              <Button onClick={() => router.push('/dashboard/courses')}>
                コース一覧に戻る
              </Button>
            </div>
          </CardContent>
        </Card>
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
    switch (level) {
      case 'basic': return '基礎編'
      case 'intermediate': return '実践編'
      case 'advanced': return '応用編'
      default: return level
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'income': return 'bg-green-100 text-green-800'
      case 'lifestyle': return 'bg-blue-100 text-blue-800'
      case 'startup': return 'bg-purple-100 text-purple-800'
      default: return 'bg-slate-100 text-slate-800'
    }
  }

  const handlePreviousLesson = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1)
      setLessonProgress(0)
      setIsPlaying(false)
    }
  }

  const handleNextLesson = () => {
    if (currentLessonIndex < course.lessons.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1)
      setLessonProgress(0)
      setIsPlaying(false)
    }
  }

  const handlePlayPause = async () => {
    if (vimeoPlayer) {
      try {
        if (isPlaying) {
          await vimeoPlayer.pause()
        } else {
          await vimeoPlayer.play()
        }
      } catch (err) {
        console.error('Error controlling Vimeo player:', err)
      }
    } else {
      // Vimeo Playerが初期化されていない場合は手動でトグル
      setIsPlaying(!isPlaying)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* サイドバー */}
      <Sidebar />

      {/* メインコンテンツ */}
      <div className="flex-1 md:ml-64">
        {/* ヘッダー */}
        <header className="bg-white shadow-lg border-b border-slate-200">
          <div className="px-3 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-14 sm:h-16">
              {/* 左側: 戻るボタンとタイトル */}
              <div className="flex items-center gap-2 sm:gap-4 ml-10 md:ml-0 min-w-0 flex-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/dashboard')}
                  className="flex-shrink-0 h-8 px-2 sm:px-3"
                >
                  <ArrowLeft className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">戻る</span>
                </Button>
                <div className="min-w-0 flex-1">
                  <h1 className="text-sm sm:text-xl font-bold text-slate-900 truncate">{course.title}</h1>
                  <p className="text-xs sm:text-sm text-slate-600 truncate hidden sm:block">{course.description}</p>
                </div>
              </div>
              {/* 右側: ユーザー情報 */}
              <div className="flex items-center space-x-1 sm:space-x-4 flex-shrink-0">
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs sm:text-sm font-medium">
                      {user?.name.charAt(0)}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-slate-700 hidden sm:block">{user?.name}</span>
                  <Button variant="ghost" size="sm" onClick={logout} className="h-7 sm:h-8 px-1.5 sm:px-3">
                    <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
                    <span className="hidden sm:inline">ログアウト</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
            {/* レッスン一覧サイドバー */}
            <div className="lg:col-span-3 order-2 lg:order-1">
              <Card>
                <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                  <CardTitle className="flex items-center text-xs sm:text-sm">
                    <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                    レッスン一覧
                  </CardTitle>
                  <div className="flex items-center space-x-1 flex-wrap gap-1">
                    <Badge className={`${getCategoryColor(course.category)} text-[10px] sm:text-xs`}>
                      {getCategoryLabel(course.category)}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] sm:text-xs">
                      {getLevelLabel(course.level)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0">
                  <div className="space-y-0.5">
                    {course.lessons.map((lesson, index) => (
                      <div
                        key={lesson.id}
                        className={`p-1.5 sm:p-2 rounded cursor-pointer transition-colors ${
                          index === currentLessonIndex
                            ? 'bg-slate-700 text-white'
                            : lesson.isCompleted
                            ? 'bg-green-50 text-green-800 hover:bg-green-100'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                        onClick={() => {
                          setCurrentLessonIndex(index)
                          setLessonProgress(0)
                          setIsPlaying(false)
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center min-w-0 flex-1">
                            {lesson.isCompleted ? (
                              <CheckCircle className="h-3 w-3 mr-1.5 text-green-500 flex-shrink-0" />
                            ) : (
                              <div className="h-3 w-3 border border-slate-300 rounded-full mr-1.5 flex-shrink-0" />
                            )}
                            <span className="text-[10px] sm:text-xs font-medium truncate">{lesson.title}</span>
                          </div>
                          <div className="flex items-center text-[10px] sm:text-xs ml-1.5 flex-shrink-0">
                            <Clock className="h-2.5 w-2.5 mr-0.5" />
                            <span>{lesson.duration}分</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* メイン学習エリア */}
            <div className="lg:col-span-9 order-1 lg:order-2">
              {currentLesson && (
                <div className="space-y-3 sm:space-y-4">
                  {/* レッスンヘッダー */}
                  <Card>
                    <CardHeader className="p-3 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base sm:text-2xl truncate">{currentLesson.title}</CardTitle>
                          <CardDescription className="text-xs sm:text-base mt-1 sm:mt-2 line-clamp-2">
                            {currentLesson.description}
                          </CardDescription>
                        </div>
                        <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
                          <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
                          <span className="text-xs sm:text-base text-slate-600">{currentLesson.duration}分</span>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* 動画プレイヤーエリア */}
                  <Card>
                    <CardContent className="p-0">
                      {currentLesson.vimeoId ? (
                        <iframe
                          ref={iframeRef}
                          key={`vimeo-${currentLesson.id}`} // レッスンが切り替わったときにiframeを再マウント
                          src={`https://player.vimeo.com/video/${currentLesson.vimeoId}?api=1`}
                          loading="lazy"
                          allow="autoplay; fullscreen; picture-in-picture"
                          allowFullScreen
                          className="w-full aspect-video rounded-t-lg"
                          title={currentLesson.title}
                          onLoad={handleIframeLoad}
                        />
                      ) : (
                        <div className="aspect-video bg-slate-900 rounded-t-lg flex items-center justify-center">
                          <div className="text-center text-white">
                            <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">動画プレイヤー</p>
                            <p className="text-sm opacity-75">動画が設定されていません</p>
                          </div>
                        </div>
                      )}
                      
                      {/* 動画コントロール */}
                      <div className="p-3 sm:p-4 bg-slate-50 border-t">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                          <div className="flex items-center space-x-2 sm:space-x-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handlePlayPause}
                              className="h-8 text-xs sm:text-sm"
                            >
                              {isPlaying ? (
                                <Pause className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              ) : (
                                <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              )}
                              {isPlaying ? '停止' : '再生'}
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 text-xs sm:text-sm hidden sm:flex">
                              <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              リセット
                            </Button>
                          </div>

                          <div className="flex items-center space-x-2 sm:space-x-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handlePreviousLesson}
                              disabled={currentLessonIndex === 0}
                              className="h-8 text-xs sm:text-sm flex-1 sm:flex-none"
                            >
                              <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
                              <span className="hidden sm:inline">前へ</span>
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleNextLesson}
                              disabled={currentLessonIndex === course.lessons.length - 1}
                              className="h-8 text-xs sm:text-sm flex-1 sm:flex-none"
                            >
                              <span className="hidden sm:inline">次へ</span>
                              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:ml-2" />
                            </Button>
                          </div>
                        </div>

                        {/* 進捗バー */}
                        <div className="mt-3 sm:mt-4">
                          <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                            <span className="text-xs sm:text-sm font-medium">進捗</span>
                            <span className="text-xs sm:text-sm text-slate-600">{lessonProgress}%</span>
                          </div>
                          <Progress value={lessonProgress} className="h-1.5 sm:h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* レッスン内容 */}
                  <Card>
                    <CardHeader className="p-3 sm:p-6">
                      <CardTitle className="text-sm sm:text-lg">レッスン内容</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6 pt-0">
                      <div className="prose max-w-none">
                        <p className="text-xs sm:text-base text-slate-700 leading-relaxed">
                          {currentLesson.content}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 教育コンテンツ・資料 */}
                  {currentLesson.materials && currentLesson.materials.length > 0 && (
                    <Card>
                      <CardHeader className="p-3 sm:p-6">
                        <CardTitle className="flex items-center text-sm sm:text-lg">
                          <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                          教材・資料
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-6 pt-0">
                        <div className="space-y-2">
                          {currentLesson.materials.map((material, index) => (
                            <div key={index} className="flex items-center justify-between gap-2 p-2 sm:p-3 bg-slate-50 rounded-lg">
                              <div className="flex items-center min-w-0 flex-1">
                                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 text-slate-500 flex-shrink-0" />
                                <span className="text-xs sm:text-sm font-medium truncate">{material}</span>
                              </div>
                              <Button variant="outline" size="sm" className="h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3 flex-shrink-0">
                                DL
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* レッスン完了ボタン */}
                  <Card>
                    <CardContent className="p-3 sm:p-6">
                      <div className="text-center">
                        <Button
                          size="sm"
                          onClick={handleCompleteLesson}
                          disabled={currentLesson.isCompleted}
                          className="h-9 sm:h-10 text-xs sm:text-sm w-full sm:w-auto"
                        >
                          {currentLesson.isCompleted ? (
                            <>
                              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                              完了済み
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                              レッスンを完了
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function LearningPageWrapper() {
  return (
    <ProtectedRoute>
      <LearningPage />
    </ProtectedRoute>
  )
}

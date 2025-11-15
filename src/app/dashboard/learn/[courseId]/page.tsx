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

// モックデータ（コンポーネント外で定義）
const COURSES: Course[] = [
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

  const [currentLessonIndex, setCurrentLessonIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [lessonProgress, setLessonProgress] = useState(0)
  const [vimeoPlayer, setVimeoPlayer] = useState<any>(null)

  // コースデータを取得（useCallbackより前に定義）
  const course = COURSES.find(c => c.id === courseId)
  const currentLesson = course?.lessons[currentLessonIndex]

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

  if (!course) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-slate-900 mb-2">コースが見つかりません</h2>
              <p className="text-slate-600 mb-4">指定されたコースは存在しません。</p>
              <Button onClick={() => router.push('/dashboard')}>
                ダッシュボードに戻る
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

  const handleCompleteLesson = () => {
    // レッスン完了の処理
    setLessonProgress(100)
    // 実際のアプリケーションでは、ここでAPIを呼び出してレッスン完了を記録
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* サイドバー */}
      <Sidebar />

      {/* メインコンテンツ */}
      <div className="flex-1 md:ml-64">
        {/* ヘッダー */}
        <header className="bg-white shadow-lg border-b border-slate-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => router.push('/dashboard')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  ダッシュボードに戻る
                </Button>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">{course.title}</h1>
                  <p className="text-sm text-slate-600">{course.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="icon">
                  <Bell className="h-5 w-5" />
                </Button>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.name.charAt(0)}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-slate-700">{user?.name}</span>
                  <Button variant="ghost" size="sm" onClick={logout}>
                    <LogOut className="h-4 w-4 mr-1" />
                    ログアウト
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* レッスン一覧サイドバー */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-sm">
                    <BookOpen className="h-4 w-4 mr-2" />
                    レッスン一覧
                  </CardTitle>
                  <div className="flex items-center space-x-1">
                    <Badge className={`${getCategoryColor(course.category)} text-xs`}>
                      {getCategoryLabel(course.category)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {getLevelLabel(course.level)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-0.5">
                    {course.lessons.map((lesson, index) => (
                      <div
                        key={lesson.id}
                        className={`p-1.5 rounded cursor-pointer transition-colors ${
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
                            <span className="text-xs font-medium truncate">{lesson.title}</span>
                          </div>
                          <div className="flex items-center text-xs ml-1.5 flex-shrink-0">
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
            <div className="lg:col-span-9">
              {currentLesson && (
                <div className="space-y-4">
                  {/* レッスンヘッダー */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-2xl">{currentLesson.title}</CardTitle>
                          <CardDescription className="text-base mt-2">
                            {currentLesson.description}
                          </CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-5 w-5 text-slate-500" />
                          <span className="text-slate-600">{currentLesson.duration}分</span>
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
                      <div className="p-4 bg-slate-50 border-t">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handlePlayPause}
                            >
                              {isPlaying ? (
                                <Pause className="h-4 w-4 mr-2" />
                              ) : (
                                <Play className="h-4 w-4 mr-2" />
                              )}
                              {isPlaying ? '一時停止' : '再生'}
                            </Button>
                            <Button variant="outline" size="sm">
                              <RotateCcw className="h-4 w-4 mr-2" />
                              リセット
                            </Button>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handlePreviousLesson}
                              disabled={currentLessonIndex === 0}
                            >
                              <ArrowLeft className="h-4 w-4 mr-2" />
                              前のレッスン
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleNextLesson}
                              disabled={currentLessonIndex === course.lessons.length - 1}
                            >
                              次のレッスン
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* 進捗バー */}
                        <div className="mt-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">進捗</span>
                            <span className="text-sm text-slate-600">{lessonProgress}%</span>
                          </div>
                          <Progress value={lessonProgress} className="h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* レッスン内容 */}
                  <Card>
                    <CardHeader>
                      <CardTitle>レッスン内容</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose max-w-none">
                        <p className="text-slate-700 leading-relaxed">
                          {currentLesson.content}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 教育コンテンツ・資料 */}
                  {currentLesson.materials && currentLesson.materials.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <FileText className="h-5 w-5 mr-2" />
                          教育コンテンツ・資料
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {currentLesson.materials.map((material, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-2 text-slate-500" />
                                <span className="text-sm font-medium">{material}</span>
                              </div>
                              <Button variant="outline" size="sm">
                                ダウンロード
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* レッスン完了ボタン */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <Button 
                          size="lg" 
                          onClick={handleCompleteLesson}
                          disabled={currentLesson.isCompleted}
                        >
                          {currentLesson.isCompleted ? (
                            <>
                              <CheckCircle className="h-5 w-5 mr-2" />
                              レッスン完了済み
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-5 w-5 mr-2" />
                              レッスンを完了する
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

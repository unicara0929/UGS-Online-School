'use client'

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
  Video
} from "lucide-react"
import Link from "next/link"

interface Course {
  id: string
  title: string
  description: string
  category: 'income' | 'lifestyle' | 'startup'
  level: 'basic' | 'advanced'
  lessons: Lesson[]
  isLocked: boolean
  progress: number
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

  // モックデータ
  const courses: Course[] = [
    {
      id: "1",
      title: "所得を増やす",
      description: "マネーリテラシー全般 - 知識をつけて、稼ぐ力を育てる",
      category: "income",
      level: "basic",
      progress: 25,
      isLocked: false,
      lessons: [
        { id: "1-1", title: "お金の基本概念", description: "お金の本質と価値について学ぶ", duration: 15, isCompleted: true, order: 1 },
        { id: "1-2", title: "収入の種類と特徴", description: "給与、事業収入、投資収入の違い", duration: 20, isCompleted: true, order: 2 },
        { id: "1-3", title: "税金の基礎知識", description: "所得税、住民税の仕組み", duration: 25, isCompleted: false, order: 3 },
        { id: "1-4", title: "社会保険制度", description: "健康保険、年金制度の理解", duration: 18, isCompleted: false, order: 4 },
        { id: "1-5", title: "資産形成の考え方", description: "長期投資の重要性", duration: 22, isCompleted: false, order: 5 },
        { id: "1-6", title: "リスクとリターン", description: "投資におけるリスク管理", duration: 16, isCompleted: false, order: 6 },
        { id: "1-7", title: "複利の力", description: "複利効果の理解と活用", duration: 14, isCompleted: false, order: 7 },
        { id: "1-8", title: "ライフプランニング基礎", description: "人生設計とお金の計画", duration: 28, isCompleted: false, order: 8 }
      ]
    },
    {
      id: "2",
      title: "生き方を豊かにする",
      description: "金融・経済を正しく理解し、お金を「怖いもの」から「使いこなす力」へ",
      category: "lifestyle",
      level: "basic",
      progress: 0,
      isLocked: false,
      lessons: [
        { id: "2-1", title: "金融リテラシー基礎", description: "金融の基本概念", duration: 20, isCompleted: false, order: 1 },
        { id: "2-2", title: "経済の仕組み", description: "経済活動の理解", duration: 25, isCompleted: false, order: 2 },
        { id: "2-3", title: "投資の基本", description: "投資の種類と特徴", duration: 22, isCompleted: false, order: 3 },
        { id: "2-4", title: "保険の役割", description: "保険の必要性と選び方", duration: 18, isCompleted: false, order: 4 },
        { id: "2-5", title: "ライフイベントとお金", description: "人生の節目でのお金の管理", duration: 24, isCompleted: false, order: 5 },
        { id: "2-6", title: "消費者保護", description: "消費者としての権利と注意点", duration: 16, isCompleted: false, order: 6 },
        { id: "2-7", title: "マインドセット", description: "豊かな人生のための考え方", duration: 20, isCompleted: false, order: 7 }
      ]
    },
    {
      id: "3",
      title: "スタートアップ支援",
      description: "ゼロから事業を立ち上げるために必要な知識・仕組みを学ぶ",
      category: "startup",
      level: "basic",
      progress: 0,
      isLocked: !canAccessFPContent(),
      lessons: [
        { id: "3-1", title: "起業の基礎知識", description: "起業に必要な基本知識", duration: 30, isCompleted: false, order: 1 },
        { id: "3-2", title: "ビジネスモデル設計", description: "持続可能なビジネスモデル", duration: 35, isCompleted: false, order: 2 },
        { id: "3-3", title: "マーケティング入門", description: "顧客獲得の基本戦略", duration: 28, isCompleted: false, order: 3 },
        { id: "3-4", title: "セールス基礎", description: "営業スキルの基本", duration: 32, isCompleted: false, order: 4 },
        { id: "3-5", title: "会計・財務基礎", description: "事業運営の財務管理", duration: 40, isCompleted: false, order: 5 },
        { id: "3-6", title: "法務・コンプライアンス", description: "事業運営の法的要件", duration: 25, isCompleted: false, order: 6 }
      ]
    }
  ]

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

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {courses.map(course => (
          <Card key={course.id} className="hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Badge className={getCategoryColor(course.category)}>
                  {getCategoryLabel(course.category)}
                </Badge>
                <Badge variant="outline">
                  {getLevelLabel(course.level)}
                </Badge>
              </div>
              <CardTitle className="text-lg">{course.title}</CardTitle>
              <CardDescription>{course.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 進捗状況 */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">進捗</span>
                    <span className="text-sm text-slate-600">{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} className="h-2" />
                </div>

                {/* レッスン一覧 */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-700">レッスン一覧</h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {course.lessons.map(lesson => (
                      <div key={lesson.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center flex-1 min-w-0">
                          {lesson.isCompleted ? (
                            <CheckCircle className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                          ) : (
                            <div className="h-3 w-3 border border-slate-300 rounded-full mr-2 flex-shrink-0" />
                          )}
                          <span className="truncate">{lesson.title}</span>
                        </div>
                        <div className="flex items-center text-slate-500 ml-2">
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

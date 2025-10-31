'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/contexts/auth-context"
import { 
  CheckCircle, 
  XCircle, 
  Upload, 
  FileText,
  Calendar,
  MessageSquare,
  Award
} from "lucide-react"

export function FPPromotion() {
  const { user } = useAuth()
  const [isApplying, setIsApplying] = useState(false)

  // モックデータ
  const promotionConditions = {
    testPassed: false,
    lpMeetingCompleted: false,
    surveyCompleted: false,
    isEligible: false
  }

  const handlePromotionApplication = async () => {
    setIsApplying(true)
    // 実際の実装では、身分証アップロードと申請処理を行う
    setTimeout(() => {
      setIsApplying(false)
      alert('FPエイド昇格申請を送信しました。運営による確認後、昇格が完了します。')
    }, 2000)
  }

  if (user?.role !== 'member') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Award className="h-5 w-5 mr-2" />
            FPエイド昇格
          </CardTitle>
          <CardDescription>
            既にFPエイド以上に昇格済みです
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="text-slate-600">おめでとうございます！FPエイドに昇格済みです。</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Award className="h-5 w-5 mr-2" />
          FPエイド昇格
        </CardTitle>
        <CardDescription>
          FPエイド昇格に必要な条件を確認し、申請を行います
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* 昇格条件 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">昇格条件</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 mr-3 text-slate-600" />
                  <div>
                    <h4 className="font-medium">基礎編テスト合格</h4>
                    <p className="text-sm text-slate-600">3カテゴリの基礎編テストに合格する</p>
                  </div>
                </div>
                <Badge variant={promotionConditions.testPassed ? "success" : "secondary"}>
                  {promotionConditions.testPassed ? "完了" : "未完了"}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                <div className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-3 text-slate-600" />
                  <div>
                    <h4 className="font-medium">LP面談完了</h4>
                    <p className="text-sm text-slate-600">ライフプランナーとの面談を完了する</p>
                  </div>
                </div>
                <Badge variant={promotionConditions.lpMeetingCompleted ? "success" : "secondary"}>
                  {promotionConditions.lpMeetingCompleted ? "完了" : "未完了"}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-3 text-slate-600" />
                  <div>
                    <h4 className="font-medium">アンケート提出</h4>
                    <p className="text-sm text-slate-600">初回アンケートを提出する</p>
                  </div>
                </div>
                <Badge variant={promotionConditions.surveyCompleted ? "success" : "secondary"}>
                  {promotionConditions.surveyCompleted ? "完了" : "未完了"}
                </Badge>
              </div>
            </div>
          </div>

          {/* 進捗サマリー */}
          <div className="bg-slate-50 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">昇格進捗</span>
              <span className="text-sm text-slate-600">0/3 完了</span>
            </div>
            <Progress value={0} className="h-2" />
            <p className="text-xs text-slate-600 mt-2">
              全条件を満たすと昇格申請が可能になります
            </p>
          </div>

          {/* 昇格申請 */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">昇格申請</h3>
            <div className="space-y-4">
              <div className="p-4 border border-slate-200 rounded-xl">
                <h4 className="font-medium mb-2">身分証アップロード</h4>
                <p className="text-sm text-slate-600 mb-4">
                  本人確認のため、身分証（運転免許証、パスポート等）の画像をアップロードしてください
                </p>
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    ファイル選択
                  </Button>
                  <span className="text-sm text-slate-500">未選択</span>
                </div>
              </div>

              <Button 
                className="w-full" 
                disabled={!promotionConditions.isEligible || isApplying}
                onClick={handlePromotionApplication}
              >
                {isApplying ? '申請中...' : 'FPエイド昇格申請'}
              </Button>

              {!promotionConditions.isEligible && (
                <p className="text-sm text-slate-500 text-center">
                  昇格条件をすべて満たすと申請可能になります
                </p>
              )}
            </div>
          </div>

          {/* 注意事項 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <h4 className="font-medium text-yellow-800 mb-2">注意事項</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• 身分証の画像は鮮明で、文字が読み取れるものをアップロードしてください</li>
              <li>• 申請後、運営による確認が完了するまで数日かかる場合があります</li>
              <li>• 昇格後はFPエイド昇格後ガイダンスの視聴が必須となります</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

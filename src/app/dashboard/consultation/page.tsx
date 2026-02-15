'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Wallet,
  Home,
  Briefcase,
  Building2,
  HelpCircle,
  ArrowRight,
  History,
  Shirt,
  Sun
} from 'lucide-react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

// 相談ジャンルの定義
const CONSULTATION_TYPES = [
  {
    id: 'LIFE_PLAN',
    name: 'ライフプラン',
    description: '将来設計、資産形成、保険の見直しなど',
    icon: Wallet,
    color: 'bg-blue-500',
  },
  {
    id: 'HOUSING',
    name: '住宅相談',
    description: '住宅購入、住宅ローン、土地探し、予算相談、物件探し',
    icon: Home,
    color: 'bg-green-500',
  },
  {
    id: 'CAREER',
    name: '転職相談',
    description: 'キャリアプラン、転職相談、企業探し',
    icon: Briefcase,
    color: 'bg-purple-500',
  },
  {
    id: 'RENTAL',
    name: '賃貸相談',
    description: '物件探し、相見積もり、引越し相談',
    icon: Building2,
    color: 'bg-orange-500',
  },
  {
    id: 'ORDER_SUIT',
    name: 'オーダースーツ作成',
    description: 'ビジネススーツ、フォーマルスーツのオーダーメイド',
    icon: Shirt,
    color: 'bg-indigo-500',
  },
  {
    id: 'SOLAR_BATTERY',
    name: '太陽光・蓄電池',
    description: '太陽光パネル設置、蓄電池導入のご相談',
    icon: Sun,
    color: 'bg-yellow-500',
  },
  {
    id: 'OTHER',
    name: 'その他',
    description: '上記以外のご相談',
    icon: HelpCircle,
    color: 'bg-gray-500',
  },
]

export default function ConsultationPage() {
  const router = useRouter()

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">個別相談</h1>
          <p className="text-muted-foreground mt-1">
            ご相談したいジャンルを選択してください
          </p>
        </div>
        <Link href="/dashboard/consultation/history">
          <Button variant="outline">
            <History className="w-4 h-4 mr-2" aria-hidden="true" />
            相談履歴
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {CONSULTATION_TYPES.map((type) => {
          const Icon = type.icon
          return (
            <Card
              key={type.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push(`/dashboard/consultation/${type.id.toLowerCase().replace('_', '-')}`)}
            >
              <CardHeader className="pb-3">
                <div className={`w-12 h-12 rounded-lg ${type.color} flex items-center justify-center mb-3`}>
                  <Icon className="w-6 h-6 text-white" aria-hidden="true" />
                </div>
                <CardTitle className="text-lg">{type.name}</CardTitle>
                <CardDescription>{type.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="w-full justify-between">
                  相談する
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">ご相談の流れ</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          <li>上記からジャンルを選択</li>
          <li>相談内容と希望日時を入力</li>
          <li>担当者から連絡をお待ちください</li>
        </ol>
      </div>
      </div>
    </DashboardLayout>
  )
}

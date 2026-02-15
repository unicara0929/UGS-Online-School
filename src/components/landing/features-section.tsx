'use client'

import { Card, CardContent } from "@/components/ui/card"
import { 
  BookOpen,
  TrendingUp,
  DollarSign,
  Award,
  Users,
  Shield
} from "lucide-react"

interface Feature {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: BookOpen,
    title: "体系的な学習プログラム",
    description: "段階的にスキルアップできる充実したコンテンツ"
  },
  {
    icon: TrendingUp,
    title: "実践的な成長フロー",
    description: "「お金の知識×稼げる力」を身につける独自の成長フロー"
  },
  {
    icon: DollarSign,
    title: "報酬管理システム",
    description: "リアルタイムで報酬状況を確認し、目標達成をサポート"
  },
  {
    icon: Award,
    title: "昇格システム",
    description: "明確な昇格条件で、FPエイド・マネージャーへの道筋を提示"
  },
  {
    icon: Users,
    title: "チーム管理機能",
    description: "マネージャーとしてチームを育成し、組織を拡大"
  },
  {
    icon: Shield,
    title: "セキュアなプラットフォーム",
    description: "個人情報保護とセキュリティを重視した安全な環境"
  }
]

export function FeaturesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            選ばれる理由
          </h2>
          <p className="text-xl text-slate-600">
            他にはない独自のシステムで、確実にスキルアップを実現
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="text-center hover:shadow-xl transition-shadow duration-300">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

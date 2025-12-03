'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"
import Link from "next/link"

export function PricingSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            料金プラン
          </h2>
          <p className="text-xl text-slate-600">
            シンプルで分かりやすい料金体系
          </p>
        </div>
        <div className="max-w-md mx-auto">
          <Card className="border-2 border-slate-700">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Unicara Growth Salon</CardTitle>
              <CardDescription>全機能利用可能</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold text-slate-900">¥5,500</span>
                <span className="text-slate-600">/月</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span>全教育コンテンツへのアクセス</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span>昇格システム</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span>報酬管理機能</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span>イベント参加</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span>LP面談サポート</span>
                </div>
              </div>
              <Link href="/register" className="block">
                <Button className="w-full" size="lg">
                  今すぐ始める
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

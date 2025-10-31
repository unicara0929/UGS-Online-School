'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Star } from "lucide-react"

interface Testimonial {
  name: string
  role: string
  content: string
  rating: number
}

const testimonials: Testimonial[] = [
  {
    name: "田中 太郎",
    role: "FPエイド",
    content: "体系的な学習プログラムで、金融知識を基礎から実践まで身につけることができました。報酬管理システムも分かりやすく、目標達成へのモチベーションが高まります。",
    rating: 5
  },
  {
    name: "佐藤 花子", 
    role: "マネージャー",
    content: "チーム管理機能が充実していて、メンバーの育成が効率的に進められます。昇格システムも明確で、次のステップが見えやすいです。",
    rating: 5
  },
  {
    name: "鈴木 一郎",
    role: "UGS会員",
    content: "初心者でも分かりやすい教材構成で、無理なく学習を進められています。LP面談での個別サポートも充実していて安心です。",
    rating: 5
  }
]

export function TestimonialsSection() {
  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            お客様の声
          </h2>
          <p className="text-xl text-slate-600">
            実際にご利用いただいている方々からの声
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-slate-600 mb-4">
                  "{testimonial.content}"
                </p>
                <div>
                  <p className="font-semibold text-slate-900">{testimonial.name}</p>
                  <p className="text-sm text-slate-500">{testimonial.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

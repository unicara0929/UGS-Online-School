'use client'

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

export function HeroSection() {
  return (
    <section className="relative">
      <div className="absolute inset-0">
        <div className="w-full h-full bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900" />
        <div className="absolute inset-0 bg-primary-900/60" />
      </div>
      <div className="relative py-24 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-white">
            <p className="uppercase tracking-widest text-sm mb-4 text-primary-100">学び → 実践 → 自立 を一体化</p>
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6">Unicara Growth Salon</h1>
            <p className="text-lg md:text-xl text-primary-100 mb-10 max-w-3xl mx-auto">
              100を超える教育コンテンツで「お金の知識×稼げる力」を身につける
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto">
                  今すぐ始める
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto border-white text-white hover:bg-white hover:text-slate-900">
                  既にアカウントをお持ちの方
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

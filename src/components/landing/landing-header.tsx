'use client'

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useState } from "react"

export function LandingPageHeader() {
  const [markError, setMarkError] = useState(false)
  const [fullError, setFullError] = useState(true) // デフォルトでtrueにして、画像が存在しない場合でもエラーを防ぐ

  return (
    <header className="bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            {markError ? (
              <div className="w-7 h-7 rounded bg-slate-800 text-white text-xs flex items-center justify-center">UG</div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src="/ロゴ1.jpg" 
                alt="UGS mark" 
                width={28} 
                height={28} 
                onError={() => setMarkError(true)}
                className="object-contain"
                style={{ width: '28px', height: '28px' }}
              />
            )}
            <span className="hidden md:block text-sm font-bold text-slate-900">Unicara Growth Salon</span>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Link href="/login">
              <Button variant="outline" size="sm" className="text-xs sm:text-sm px-2 sm:px-4">ログイン</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="text-xs sm:text-sm px-2 sm:px-4">会員登録</Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
'use client'

import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { useState } from "react"

export function LandingPageHeader() {
  const [markError, setMarkError] = useState(false)
  const [fullError, setFullError] = useState(false)

  return (
    <header className="bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            {markError ? (
              <div className="w-7 h-7 rounded bg-slate-800 text-white text-xs flex items-center justify-center">UG</div>
            ) : (
              <Image src="/ロゴ1.jpg" alt="UGS mark" width={28} height={28} priority onError={() => setMarkError(true)} />
            )}
            {fullError ? (
              <span className="hidden md:block text-sm font-bold text-slate-900">Unicara Growth Salon</span>
            ) : (
              <Image src="/ugs-logo-full.png" alt="Unicara Growth Salon" width={200} height={28} className="hidden md:block" onError={() => setFullError(true)} />
            )}
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/login">
              <Button variant="outline">ログイン</Button>
            </Link>
            <Link href="/register">
              <Button>会員登録</Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
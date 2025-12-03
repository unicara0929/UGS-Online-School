'use client'

import Link from "next/link"

export function LandingFooter() {
  return (
    <footer className="bg-slate-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-4">Unicara Growth Salon</h3>
          <p className="text-slate-400 mb-4">
            学び → 実践 → 自立を一体化したFP育成プラットフォーム
          </p>
          <div className="flex justify-center space-x-6">
            <Link href="/lp" className="text-slate-400 hover:text-white">
              ホーム
            </Link>
            <Link href="/login" className="text-slate-400 hover:text-white">
              ログイン
            </Link>
            <Link href="/register" className="text-slate-400 hover:text-white">
              登録
            </Link>
          </div>
          <p className="text-slate-500 text-sm mt-8">
            © 2024 Unicara Growth Salon. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

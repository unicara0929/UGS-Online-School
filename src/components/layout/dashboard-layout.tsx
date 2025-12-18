'use client'

import { Sidebar } from '@/components/navigation/sidebar'

interface DashboardLayoutProps {
  children: React.ReactNode
}

/**
 * ダッシュボード共通レイアウト
 * 全てのダッシュボードページで使用する共通レイアウト
 * サイドバー + メインコンテンツの2カラム構成
 */
export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 md:ml-64 min-w-0 overflow-x-hidden">
        {children}
      </div>
    </div>
  )
}

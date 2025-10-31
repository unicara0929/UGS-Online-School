'use client'

import { Button } from "@/components/ui/button"
import { Bell, LogOut } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import Image from "next/image"
import { useState, useEffect } from "react"

export function DashboardHeader() {
  const { user, logout } = useAuth()
  const [logoError, setLogoError] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null)

  useEffect(() => {
    // プロフィール画像を読み込む
    const loadProfileImage = () => {
      if (user?.id && typeof window !== 'undefined') {
        const savedImage = localStorage.getItem(`profileImage_${user.id}`)
        setProfileImage(savedImage)
      }
    }

    loadProfileImage()

    // プロフィール画像更新イベントをリッスン
    const handleProfileImageUpdate = (event: CustomEvent) => {
      if (event.detail?.userId === user?.id) {
        setProfileImage(event.detail.imageUrl)
      }
    }

    window.addEventListener('profileImageUpdated' as any, handleProfileImageUpdate as EventListener)

    return () => {
      window.removeEventListener('profileImageUpdated' as any, handleProfileImageUpdate as EventListener)
    }
  }, [user?.id])

  return (
    <header className="bg-white shadow-lg border-b border-slate-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            {logoError ? (
              <div className="w-7 h-7 rounded bg-slate-800 flex items-center justify-center">
                <span className="text-white text-xs font-bold">UG</span>
              </div>
            ) : (
              <Image 
                src="/ロゴ1.jpg" 
                alt="Unicara Growth Salon" 
                width={28} 
                height={28} 
                className="object-contain"
                priority
                onError={() => setLogoError(true)} 
              />
            )}
            <span className="text-xl font-bold text-slate-900 tracking-tight">ダッシュボード</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="hover:bg-slate-100">
              <Bell className="h-5 w-5 text-slate-600" />
            </Button>
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center shadow-md overflow-hidden">
                {profileImage ? (
                  <Image
                    src={profileImage}
                    alt={user?.name || 'User'}
                    width={36}
                    height={36}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-sm font-semibold">
                    {user?.name.charAt(0)}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium text-slate-700 hidden sm:block">{user?.name}</span>
              <Button variant="ghost" size="sm" onClick={logout} className="hover:bg-slate-100">
                <LogOut className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">ログアウト</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

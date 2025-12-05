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
    const handleProfileImageUpdate = (event: Event) => {
      const customEvent = event as CustomEvent
      const eventUserId = customEvent.detail?.userId
      
      // userIdが一致する場合に更新（localStorageから最新の値を取得）
      if (eventUserId === user?.id && user?.id && typeof window !== 'undefined') {
        // 少し遅延させてlocalStorageから確実に読み込む
        setTimeout(() => {
          const savedImage = localStorage.getItem(`profileImage_${user.id}`)
          setProfileImage(savedImage) // nullの場合も設定（削除された場合）
        }, 50)
      }
    }

    // storageイベントもリッスン（localStorageの変更を検知）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `profileImage_${user?.id}` && user?.id) {
        const savedImage = localStorage.getItem(`profileImage_${user.id}`)
        setProfileImage(savedImage)
      }
    }

    window.addEventListener('profileImageUpdated', handleProfileImageUpdate)
    window.addEventListener('storage', handleStorageChange)

    // 定期的にチェック（他のタブからの変更にも対応、より効率的な間隔）
    const interval = setInterval(() => {
      loadProfileImage()
    }, 2000)

    return () => {
      window.removeEventListener('profileImageUpdated', handleProfileImageUpdate)
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [user?.id])

  return (
    <header className="bg-white shadow-lg border-b border-slate-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* 左側: モバイルではメニューボタン用のスペースを確保 */}
          <div className="flex items-center space-x-2 sm:space-x-3 ml-10 md:ml-0 min-w-0 flex-1">
            {logoError ? (
              <div className="w-5 h-5 sm:w-7 sm:h-7 rounded bg-slate-800 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[10px] sm:text-xs font-bold">UG</span>
              </div>
            ) : (
              <Image
                src="/ロゴ1.jpg"
                alt="Unicara Growth Salon"
                width={28}
                height={28}
                className="object-contain w-5 h-5 sm:w-7 sm:h-7 flex-shrink-0"
                priority
                onError={() => setLogoError(true)}
              />
            )}
            <span className="text-sm sm:text-xl font-bold text-slate-900 tracking-tight truncate">
              ダッシュボード
            </span>
          </div>

          {/* 右側: ユーザー情報 */}
          <div className="flex items-center space-x-1 sm:space-x-4 flex-shrink-0">
            <Button variant="ghost" size="icon" className="hover:bg-slate-100 h-7 w-7 sm:h-10 sm:w-10">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600" />
            </Button>
            <div className="flex items-center space-x-1 sm:space-x-3">
              <div className="w-7 h-7 sm:w-9 sm:h-9 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center shadow-md overflow-hidden flex-shrink-0">
                {profileImage ? (
                  <Image
                    src={profileImage}
                    alt={user?.name || 'User'}
                    width={36}
                    height={36}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-xs sm:text-sm font-semibold">
                    {user?.name.charAt(0)}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium text-slate-700 hidden sm:block">{user?.name}</span>
              <Button variant="ghost" size="sm" onClick={logout} className="hover:bg-slate-100 h-7 sm:h-8 px-1.5 sm:px-3">
                <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">ログアウト</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

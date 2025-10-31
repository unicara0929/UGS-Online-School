'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'
import { Menu, X } from 'lucide-react'
import { navigation } from '@/lib/navigation'
import Image from 'next/image'

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const { user, hasAnyRole } = useAuth()
  const pathname = usePathname()
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

  const filteredNavigation = navigation.filter(item => 
    hasAnyRole(item.roles)
  )

  return (
    <>
      {/* モバイル用メニューボタン */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* サイドバー */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:inset-0
      `}>
        <div className="flex flex-col h-full">
          {/* ロゴ */}
          <div className="flex items-center justify-center h-20 px-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
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
              <span className="text-sm font-bold text-slate-900 tracking-tight">Unicara Growth Salon</span>
            </div>
          </div>

          {/* ユーザー情報 */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center shadow-md overflow-hidden flex-shrink-0">
                {profileImage ? (
                  <Image
                    src={profileImage}
                    alt={user?.name || 'User'}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-sm font-semibold">
                    {user?.name.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {user?.name}
                </p>
                <Badge variant="secondary" className="text-xs mt-1">
                  {user?.role === "member" ? "UGS会員" : 
                   user?.role === "fp" ? "FPエイド" : 
                   user?.role === "manager" ? "マネージャー" : "運営"}
                </Badge>
              </div>
            </div>
          </div>

          {/* ナビゲーション */}
          <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200
                    ${isActive 
                      ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-md' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }
                  `}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon className={`h-5 w-5 mr-3 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="flex-1">{item.name}</span>
                  {item.badge && (
                    <Badge variant="destructive" className="text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* フッター */}
          <div className="p-4 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              UGSオンラインスクール v1.0
            </p>
          </div>
        </div>
      </div>

      {/* オーバーレイ（モバイル用） */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

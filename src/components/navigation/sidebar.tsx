'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'
import { Menu, X, ChevronDown, ChevronRight } from 'lucide-react'
import { navigation } from '@/lib/navigation'
import Image from 'next/image'

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const { user, hasAnyRole } = useAuth()
  const pathname = usePathname()
  const [logoError, setLogoError] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

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

  // 子項目がアクティブかどうかをチェック
  const isSubItemActive = (item: typeof navigation[0]) => {
    if (!item.subItems) return false
    return item.subItems.some(subItem => {
      if (!subItem.href) return false
      // 完全一致または、そのパスで始まる場合（ただし、/dashboardだけの場合は除外）
      if (subItem.href === '/dashboard') {
        return pathname === '/dashboard'
      }
      return pathname === subItem.href || pathname.startsWith(subItem.href + '/')
    })
  }

  // 親項目がアクティブかどうかをチェック（hrefがある場合）
  const isParentItemActive = (item: typeof navigation[0]) => {
    if (!item.href) return false
    // /dashboardの場合は完全一致のみ
    if (item.href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname === item.href || pathname.startsWith(item.href + '/')
  }

  // 項目が展開されているかどうか
  const isExpanded = (itemName: string) => {
    return expandedItems.has(itemName) || isSubItemActive(navigation.find(n => n.name === itemName)!)
  }

  // 展開状態を切り替え
  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemName)) {
        newSet.delete(itemName)
      } else {
        newSet.add(itemName)
      }
      return newSet
    })
  }

  // パスが変更されたときに、アクティブな親項目を自動展開
  useEffect(() => {
    navigation.forEach(item => {
      if (item.subItems && isSubItemActive(item)) {
        setExpandedItems(prev => new Set(prev).add(item.name))
      }
    })
  }, [pathname])

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
                  {user?.role === "member" ? "UGS Member" : 
                   user?.role === "fp" ? "FP Aid" : 
                   user?.role === "manager" ? "Manager" : "Admin"}
                </Badge>
              </div>
            </div>
          </div>

          {/* ナビゲーション */}
          <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const hasSubItems = item.subItems && item.subItems.length > 0
              const isExpandedItem = isExpanded(item.name)
              // アクティブ状態の判定：/dashboardの場合は完全一致のみ、それ以外はパスで始まる場合
              let isActive = false
              if (item.href) {
                if (item.href === '/dashboard') {
                  isActive = pathname === '/dashboard'
                } else {
                  isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                }
              }
              const hasActiveSubItem = isSubItemActive(item)

              if (hasSubItems) {
                return (
                  <div key={item.name}>
                    {/* 親項目 */}
                    <button
                      onClick={() => toggleExpanded(item.name)}
                      className={`
                        w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200
                        ${hasActiveSubItem
                          ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-md' 
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }
                      `}
                    >
                      <item.icon className={`h-5 w-5 mr-3 ${hasActiveSubItem ? 'text-white' : 'text-slate-500'}`} />
                      <span className="flex-1 text-left">{item.name}</span>
                      {isExpandedItem ? (
                        <ChevronDown className={`h-4 w-4 ${hasActiveSubItem ? 'text-white' : 'text-slate-500'}`} />
                      ) : (
                        <ChevronRight className={`h-4 w-4 ${hasActiveSubItem ? 'text-white' : 'text-slate-500'}`} />
                      )}
                    </button>
                    
                    {/* 子項目 */}
                    {isExpandedItem && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.subItems!.filter(subItem => hasAnyRole(subItem.roles)).map((subItem) => {
                          // 子項目のアクティブ状態判定
                          let isSubActive = false
                          if (subItem.href) {
                            if (subItem.href === '/dashboard') {
                              isSubActive = pathname === '/dashboard'
                            } else {
                              isSubActive = pathname === subItem.href || pathname.startsWith(subItem.href + '/')
                            }
                          }
                          return (
                            <Link
                              key={subItem.name}
                              href={subItem.href || '#'}
                              className={`
                                flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                                ${isSubActive 
                                  ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-md' 
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }
                              `}
                              onClick={() => setIsOpen(false)}
                            >
                              <subItem.icon className={`h-4 w-4 mr-3 ${isSubActive ? 'text-white' : 'text-slate-500'}`} />
                              <span className="flex-1">{subItem.name}</span>
                              {subItem.badge && (
                                <Badge variant="destructive" className="text-xs">
                                  {subItem.badge}
                                </Badge>
                              )}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              }

              // 通常の項目（子項目なし）
              return (
                <Link
                  key={item.name}
                  href={item.href || '#'}
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

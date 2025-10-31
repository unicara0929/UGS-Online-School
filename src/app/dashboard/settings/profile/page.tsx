'use client'

import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { User, ArrowLeft, Upload, Camera, X, Calendar as CalendarIcon, MapPin, UserCircle, FileText } from "lucide-react"
import { useState, useRef } from "react"
import Link from "next/link"
import Image from "next/image"

const JAPANESE_PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
]

const ATTRIBUTES = [
  'FP（ファイナンシャルプランナー）',
  '保険営業',
  '証券営業',
  '銀行員',
  '税理士',
  '公認会計士',
  '不動産営業',
  'その他金融関係',
  '学生',
  'その他'
]

const GENDERS = [
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
  { value: 'other', label: 'その他' },
  { value: 'prefer_not_to_say', label: '回答しない' }
]

function ProfileSettingsPage() {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(() => {
    // 初期化時にlocalStorageから読み込む
    if (typeof window !== 'undefined' && user?.id) {
      return localStorage.getItem(`profileImage_${user.id}`) || null
    }
    return null
  })
  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    address: "",
    bio: "",
    attribute: "",
    gender: "",
    birthDate: "",
    prefecture: ""
  })

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // ファイルサイズチェック（5MB制限）
    if (file.size > 5 * 1024 * 1024) {
      alert('画像サイズは5MB以下にしてください')
      return
    }

    // ファイルタイプチェック
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください')
      return
    }

    setIsUploading(true)
    try {
      // プレビュー用にBase64に変換
      const reader = new FileReader()
      reader.onloadend = () => {
        const imageDataUrl = reader.result as string
        setProfileImage(imageDataUrl)
        
        // localStorageに保存
        if (user?.id) {
          localStorage.setItem(`profileImage_${user.id}`, imageDataUrl)
          // カスタムイベントを発火して他のコンポーネントに通知
          window.dispatchEvent(new CustomEvent('profileImageUpdated', { 
            detail: { userId: user.id, imageUrl: imageDataUrl } 
          }))
        }
        
        setIsUploading(false)
      }
      reader.readAsDataURL(file)

      // 実際の実装では、ここでAPIに画像をアップロード
      // const formData = new FormData()
      // formData.append('image', file)
      // const response = await fetch('/api/user/upload-profile-image', {
      //   method: 'POST',
      //   body: formData
      // })
    } catch (error) {
      console.error('画像アップロードエラー:', error)
      alert('画像のアップロードに失敗しました')
      setIsUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setProfileImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    
    // localStorageから削除
    if (user?.id) {
      localStorage.removeItem(`profileImage_${user.id}`)
      // カスタムイベントを発火
      window.dispatchEvent(new CustomEvent('profileImageUpdated', { 
        detail: { userId: user.id, imageUrl: null } 
      }))
    }
  }

  const handleProfileUpdate = async () => {
    try {
      // プロフィール画像も含めて保存
      if (user?.id && profileImage) {
        localStorage.setItem(`profileImage_${user.id}`, profileImage)
        window.dispatchEvent(new CustomEvent('profileImageUpdated', { 
          detail: { userId: user.id, imageUrl: profileImage } 
        }))
      }

      // 実際の実装では、APIに送信
      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          ...profile,
          profileImageUrl: profileImage
        }),
      })

      if (!response.ok) {
        throw new Error('プロフィールの更新に失敗しました')
      }

      alert('プロフィールを更新しました')
    } catch (error) {
      console.error('プロフィール更新エラー:', error)
      alert('プロフィールの更新に失敗しました')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex">
      {/* サイドバー */}
      <Sidebar />

      {/* メインコンテンツ */}
      <div className="flex-1 md:ml-64">
        {/* ヘッダー */}
        <DashboardHeader />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* ヘッダー */}
            <div className="flex items-center space-x-4">
              <Link href="/dashboard/settings">
                <Button variant="outline" size="icon" className="hover:bg-white shadow-md">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">プロフィール設定</h1>
                <p className="text-slate-600 mt-1">アカウント情報の管理</p>
              </div>
            </div>

            {/* プロフィール画像セクション */}
            <Card className="shadow-xl border-0">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Camera className="h-5 w-5 mr-2 text-blue-600" />
                  プロフィール画像
                </CardTitle>
                <CardDescription>
                  プロフィール画像を設定してください（最大5MB）
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-lg overflow-hidden">
                      {profileImage ? (
                        <Image
                          src={profileImage}
                          alt="プロフィール画像"
                          width={128}
                          height={128}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserCircle className="h-16 w-16 text-white" />
                      )}
                    </div>
                    {profileImage && (
                      <button
                        onClick={handleRemoveImage}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="profile-image-upload"
                    />
                    <label htmlFor="profile-image-upload">
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto cursor-pointer"
                        disabled={isUploading}
                        asChild
                      >
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          {isUploading ? 'アップロード中...' : profileImage ? '画像を変更' : '画像をアップロード'}
                        </span>
                      </Button>
                    </label>
                    <p className="text-xs text-slate-500">
                      JPG、PNG、GIF形式に対応（最大5MB）
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 基本情報 */}
            <Card className="shadow-xl border-0">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                  基本情報
                </CardTitle>
                <CardDescription>
                  アカウントの基本情報を管理
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    名前
                  </label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:shadow-md"
                    placeholder="お名前を入力"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-500 mt-1">メールアドレスは変更できません</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    電話番号
                  </label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({...profile, phone: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:shadow-md"
                    placeholder="090-1234-5678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    住所
                  </label>
                  <textarea
                    value={profile.address}
                    onChange={(e) => setProfile({...profile, address: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:shadow-md"
                    rows={3}
                    placeholder="住所を入力してください"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 詳細情報 */}
            <Card className="shadow-xl border-0">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-600" />
                  詳細情報
                </CardTitle>
                <CardDescription>
                  プロフィールの詳細情報を設定
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    自己紹介
                  </label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({...profile, bio: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:shadow-md"
                    rows={5}
                    placeholder="自己紹介を入力してください（任意）"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {profile.bio.length}文字
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    属性
                  </label>
                  <select
                    value={profile.attribute}
                    onChange={(e) => setProfile({...profile, attribute: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:shadow-md bg-white"
                  >
                    <option value="">選択してください</option>
                    {ATTRIBUTES.map((attr) => (
                      <option key={attr} value={attr}>
                        {attr}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    性別
                  </label>
                  <select
                    value={profile.gender}
                    onChange={(e) => setProfile({...profile, gender: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:shadow-md bg-white"
                  >
                    <option value="">選択してください</option>
                    {GENDERS.map((gender) => (
                      <option key={gender.value} value={gender.value}>
                        {gender.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    生年月日
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="date"
                      value={profile.birthDate}
                      onChange={(e) => setProfile({...profile, birthDate: e.target.value})}
                      className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:shadow-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    活動地域
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <select
                      value={profile.prefecture}
                      onChange={(e) => setProfile({...profile, prefecture: e.target.value})}
                      className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:shadow-md bg-white"
                    >
                      <option value="">都道府県を選択してください</option>
                      {JAPANESE_PREFECTURES.map((pref) => (
                        <option key={pref} value={pref}>
                          {pref}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 更新ボタン */}
            <div className="flex justify-end space-x-3">
              <Link href="/dashboard/settings">
                <Button variant="outline" className="min-w-[120px]">
                  キャンセル
                </Button>
              </Link>
              <Button
                onClick={handleProfileUpdate}
                className="min-w-[120px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
              >
                プロフィールを更新
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function ProfileSettingsPageComponent() {
  return (
    <ProtectedRoute>
      <ProfileSettingsPage />
    </ProtectedRoute>
  )
}

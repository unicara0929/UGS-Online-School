'use client'

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { PageHeader } from "@/components/dashboard/page-header"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar, Clock, MapPin, Users, Video, Edit, Trash2, Loader2, Image as ImageIcon, X } from "lucide-react"

function AdminEventsPageContent() {
  const { user } = useAuth()
  const router = useRouter()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [events, setEvents] = useState<AdminEventItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [newEvent, setNewEvent] = useState<CreateEventForm>({
    title: "",
    description: "",
    date: "",
    time: "",
    type: "optional", // 後方互換性のため残す
    targetRoles: [],
    attendanceType: "optional",
    venueType: "online",
    location: "",
    maxParticipants: 50,
    status: "upcoming",
    thumbnailUrl: null,
    isPaid: false,
    price: null,
  })

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false)

  const fetchEvents = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/events", {
        credentials: 'include'
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "イベント情報の取得に失敗しました")
      }

      const formattedEvents: AdminEventItem[] = data.events.map((event: any) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        type: event.type, // 後方互換性のため残す
        targetRoles: event.targetRoles || [],
        attendanceType: event.attendanceType || 'optional',
        venueType: event.venueType || 'online',
        location: event.location,
        maxParticipants: event.maxParticipants,
        status: event.status,
        thumbnailUrl: event.thumbnailUrl || null,
        currentParticipants: event.currentParticipants,
        registrations: event.registrations,
      }))

      setEvents(formattedEvents)
    } catch (err) {
      console.error("Failed to fetch admin events:", err)
      setError(err instanceof Error ? err.message : "イベント情報の取得に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // ファイルサイズチェック（5MB）
    if (file.size > 5 * 1024 * 1024) {
      alert('ファイルサイズは5MB以下にしてください')
      return
    }

    // ファイル形式チェック
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('画像ファイル（JPEG、PNG、WebP）のみアップロード可能です')
      return
    }

    setThumbnailFile(file)

    // プレビュー表示
    const reader = new FileReader()
    reader.onloadend = () => {
      setThumbnailPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleThumbnailUpload = async (): Promise<string | null> => {
    if (!thumbnailFile) return null

    setIsUploadingThumbnail(true)
    try {
      const formData = new FormData()
      formData.append('file', thumbnailFile)

      const response = await fetch('/api/admin/events/upload-thumbnail', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'サムネイルのアップロードに失敗しました')
      }

      return data.imageUrl
    } catch (err) {
      console.error('Failed to upload thumbnail:', err)
      alert(err instanceof Error ? err.message : 'サムネイルのアップロードに失敗しました')
      return null
    } finally {
      setIsUploadingThumbnail(false)
    }
  }

  const handleRemoveThumbnail = () => {
    setThumbnailFile(null)
    setThumbnailPreview(null)
    setNewEvent({ ...newEvent, thumbnailUrl: null })
  }

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date) {
      alert("イベント名と日付は必須です")
      return
    }

    setIsSubmitting(true)
    try {
      // サムネイルがある場合は先にアップロード
      let thumbnailUrl = newEvent.thumbnailUrl
      if (thumbnailFile) {
        thumbnailUrl = await handleThumbnailUpload()
        if (!thumbnailUrl) {
          // アップロード失敗
          setIsSubmitting(false)
          return
        }
      }

      const response = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          ...newEvent,
          thumbnailUrl,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "イベントの作成に失敗しました")
      }

      setEvents(prev => [...prev, data.event])
      setNewEvent({
        title: "",
        description: "",
        date: "",
        time: "",
        type: "optional", // 後方互換性のため残す
        targetRoles: [],
        attendanceType: "optional",
        venueType: "online",
        location: "",
        maxParticipants: 50,
        status: "upcoming",
        thumbnailUrl: null,
        isPaid: false,
        price: null,
      })
      setThumbnailFile(null)
      setThumbnailPreview(null)
      setShowCreateForm(false)
    } catch (err) {
      console.error("Failed to create event:", err)
      alert(err instanceof Error ? err.message : "イベントの作成に失敗しました")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("このイベントを削除しますか？")) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/events/${id}`, {
        method: "DELETE",
        credentials: 'include'
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "イベントの削除に失敗しました")
      }

      setEvents(prev => prev.filter(event => event.id !== id))
    } catch (err) {
      console.error("Failed to delete event:", err)
      alert(err instanceof Error ? err.message : "イベントの削除に失敗しました")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "yyyy年M月d日(E)", { locale: ja })
    } catch {
      return dateString
    }
  }

  const totalParticipants = useMemo(
    () => events.reduce((sum, event) => sum + event.currentParticipants, 0),
    [events]
  )

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'required': return 'destructive'
      case 'optional': return 'secondary'
      case 'manager-only': return 'default'
      default: return 'secondary'
    }
  }

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'required': return '必須'
      case 'optional': return '任意'
      case 'manager-only': return 'Mgr限定'
      default: return type
    }
  }

  const getTargetRoleLabel = (targetRole: string) => {
    switch (targetRole) {
      case 'all': return '全員'
      case 'member': return 'UGS会員'
      case 'fp': return 'FPエイド'
      case 'manager': return 'マネージャー'
      default: return targetRole
    }
  }

  const getAttendanceTypeLabel = (attendanceType: string) => {
    switch (attendanceType) {
      case 'required': return '必須'
      case 'optional': return '任意'
      default: return attendanceType
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* サイドバー */}
      <Sidebar />

      {/* メインコンテンツ */}
      <div className="flex-1 md:ml-64">
        <PageHeader title="イベント管理" />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">イベント管理</h2>
                <p className="text-slate-600">イベントの作成・編集・削除</p>
                <p className="text-xs text-slate-400 mt-1">
                  参加者合計: {totalParticipants}名
                </p>
              </div>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                新規イベント作成
              </Button>
            </div>

            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-4">
                  <p className="text-sm text-red-600">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* 新規イベント作成フォーム */}
            {showCreateForm && (
              <Card>
                <CardHeader>
                  <CardTitle>新規イベント作成</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* サムネイル画像 */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        サムネイル画像
                      </label>
                      <p className="text-xs text-slate-500 mb-2">
                        推奨サイズ: 16:9（例: 1280x720px）｜ 最大5MB ｜ JPEG、PNG、WebP
                      </p>
                      {thumbnailPreview ? (
                        <div className="relative inline-block">
                          <img
                            src={thumbnailPreview}
                            alt="サムネイルプレビュー"
                            className="w-full max-w-md h-auto rounded-lg border border-slate-300"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveThumbnail}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full max-w-md h-48 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <ImageIcon className="h-10 w-10 text-slate-400 mb-3" />
                            <p className="mb-2 text-sm text-slate-500">
                              <span className="font-semibold">クリックしてアップロード</span>
                            </p>
                            <p className="text-xs text-slate-500">JPEG、PNG、WebP（最大5MB）</p>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/jpeg,image/png,image/jpg,image/webp"
                            onChange={handleThumbnailSelect}
                          />
                        </label>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        イベント名
                      </label>
                      <input
                        type="text"
                        value={newEvent.title}
                        onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        placeholder="イベント名を入力"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        日付
                      </label>
                      <input
                        type="date"
                        value={newEvent.date}
                        onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        時間
                      </label>
                      <input
                        type="text"
                        value={newEvent.time}
                        onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        placeholder="例: 19:00-21:00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        対象ロール（複数選択可）
                      </label>
                      <div className="space-y-2">
                        {[
                          { value: 'member' as const, label: 'UGS会員' },
                          { value: 'fp' as const, label: 'FPエイド' },
                          { value: 'manager' as const, label: 'マネージャー' },
                          { value: 'all' as const, label: '全員' }
                        ].map(role => (
                          <label key={role.value} className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newEvent.targetRoles.includes(role.value)}
                              onChange={(e) => {
                                const roles = e.target.checked
                                  ? [...newEvent.targetRoles, role.value]
                                  : newEvent.targetRoles.filter(r => r !== role.value)
                                setNewEvent({...newEvent, targetRoles: roles})
                              }}
                              className="w-4 h-4 text-slate-600 bg-slate-100 border-slate-300 rounded focus:ring-slate-500 focus:ring-2"
                            />
                            <span className="ml-2 text-sm text-slate-700">{role.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        参加設定
                      </label>
                      <select
                        value={newEvent.attendanceType}
                        onChange={(e) => setNewEvent({...newEvent, attendanceType: e.target.value as CreateEventForm['attendanceType']})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                      >
                        <option value="optional">任意</option>
                        <option value="required">必須</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        最大参加者数
                      </label>
                      <input
                        type="number"
                        value={newEvent.maxParticipants ?? ""}
                        onChange={(e) => {
                          const value = e.target.value
                          setNewEvent({
                            ...newEvent,
                            maxParticipants: value === "" ? null : parseInt(value),
                          })
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        イベントタイプ
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="isPaid"
                            checked={!newEvent.isPaid}
                            onChange={() => setNewEvent({...newEvent, isPaid: false, price: null})}
                            className="w-4 h-4 text-slate-600 bg-slate-100 border-slate-300 focus:ring-slate-500 focus:ring-2"
                          />
                          <span className="ml-2 text-sm text-slate-700">無料</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="isPaid"
                            checked={newEvent.isPaid}
                            onChange={() => setNewEvent({...newEvent, isPaid: true})}
                            className="w-4 h-4 text-slate-600 bg-slate-100 border-slate-300 focus:ring-slate-500 focus:ring-2"
                          />
                          <span className="ml-2 text-sm text-slate-700">有料</span>
                        </label>
                      </div>
                    </div>
                    {newEvent.isPaid && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          価格（円）
                        </label>
                        <input
                          type="number"
                          value={newEvent.price ?? ""}
                          onChange={(e) => {
                            const value = e.target.value
                            setNewEvent({
                              ...newEvent,
                              price: value === "" ? null : parseInt(value),
                            })
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                          placeholder="例: 3000"
                          min="0"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        開催形式
                      </label>
                      <div className="space-y-2">
                        {[
                          { value: 'online' as const, label: 'オンライン' },
                          { value: 'offline' as const, label: 'オフライン' },
                          { value: 'hybrid' as const, label: 'ハイブリッド（オンライン＋オフライン）' }
                        ].map(venue => (
                          <label key={venue.value} className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name="venueType"
                              checked={newEvent.venueType === venue.value}
                              onChange={() => setNewEvent({...newEvent, venueType: venue.value})}
                              className="w-4 h-4 text-slate-600 bg-slate-100 border-slate-300 focus:ring-slate-500 focus:ring-2"
                            />
                            <span className="ml-2 text-sm text-slate-700">{venue.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        説明
                      </label>
                      <textarea
                        value={newEvent.description}
                        onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        rows={3}
                        placeholder="イベントの説明を入力"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        場所
                      </label>
                      <input
                        type="text"
                        value={newEvent.location}
                        onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        placeholder="オンライン（Zoom）または会場名"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        ステータス
                      </label>
                      <select
                        value={newEvent.status}
                        onChange={(e) => setNewEvent({...newEvent, status: e.target.value as CreateEventForm['status']})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                      >
                        <option value="upcoming">予定</option>
                        <option value="completed">完了</option>
                        <option value="cancelled">中止</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={handleCreateEvent} disabled={isSubmitting}>
                      {isSubmitting ? (
                        <span className="flex items-center">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          作成中...
                        </span>
                      ) : (
                        "イベント作成"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false)
                        setNewEvent({
                          title: "",
                          description: "",
                          date: "",
                          time: "",
                          type: "optional",
                          targetRoles: [],
                          attendanceType: "optional",
                          venueType: "online",
                          location: "",
                          maxParticipants: 50,
                          status: "upcoming",
                          thumbnailUrl: null,
                          isPaid: false,
                          price: null,
                        })
                        setThumbnailFile(null)
                        setThumbnailPreview(null)
                      }}
                    >
                      キャンセル
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* イベント一覧 */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center text-slate-500">
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  読み込み中です
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {events.map(event => (
                  <Card key={event.id} className="hover:shadow-xl transition-all duration-300">
                    {/* サムネイル画像 */}
                    {event.thumbnailUrl && (
                      <div className="w-full h-48 overflow-hidden rounded-t-lg">
                        <img
                          src={event.thumbnailUrl}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {event.targetRoles.map(role => (
                            <Badge key={role} variant="outline">
                              {getTargetRoleLabel(role)}
                            </Badge>
                          ))}
                          <Badge variant={event.attendanceType === 'required' ? 'destructive' : 'secondary'}>
                            {getAttendanceTypeLabel(event.attendanceType)}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteEvent(event.id)}
                            disabled={isSubmitting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                      <CardDescription>{event.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center text-sm text-slate-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          {formatDate(event.date)}
                        </div>
                        <div className="flex items-center text-sm text-slate-600">
                          <Clock className="h-4 w-4 mr-2" />
                          {event.time || "時間未定"}
                        </div>
                        <div className="flex items-center text-sm text-slate-600">
                          {event.venueType === 'online' ? (
                            <Video className="h-4 w-4 mr-2" />
                          ) : event.venueType === 'offline' ? (
                            <MapPin className="h-4 w-4 mr-2" />
                          ) : (
                            <>
                              <Video className="h-4 w-4 mr-1" />
                              <MapPin className="h-4 w-4 mr-2" />
                            </>
                          )}
                          {event.location || (event.venueType === 'online' ? "オンライン" : event.venueType === 'hybrid' ? "ハイブリッド" : "未設定")}
                        </div>
                        <div className="flex items-center text-sm text-slate-600">
                          <Users className="h-4 w-4 mr-2" />
                          {event.currentParticipants}/{event.maxParticipants ?? "∞"}名
                        </div>
                        <div className="text-xs text-slate-500">
                          ステータス: {event.status === "upcoming" ? "予定" : event.status === "completed" ? "完了" : "中止"}
                        </div>
                      </div>

                      {event.registrations.length > 0 ? (
                        <div className="mt-4">
                          <p className="text-sm font-semibold text-slate-700 mb-1">参加者一覧</p>
                          <ul className="space-y-1 max-h-32 overflow-y-auto">
                            {event.registrations.map((registration) => (
                              <li key={registration.id} className="text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">
                                <span className="font-medium">{registration.userName || "名前未設定"}</span>
                                <span className="ml-2 text-slate-500">{registration.userEmail || "メール未設定"}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 mt-4">
                          参加者はまだいません
                        </p>
                      )}

                      {/* 参加者管理ボタン */}
                      <div className="mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => router.push(`/dashboard/admin/events/${event.id}`)}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          参加者を管理
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function AdminEventsPage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <AdminEventsPageContent />
    </ProtectedRoute>
  )
}

type AdminEventItem = {
  id: string
  title: string
  description: string
  date: string
  time: string
  type: 'required' | 'optional' | 'manager-only' // 後方互換性のため残す
  targetRoles: ('member' | 'fp' | 'manager' | 'all')[]
  attendanceType: 'required' | 'optional'
  venueType: 'online' | 'offline' | 'hybrid'
  location: string
  maxParticipants: number | null
  status: 'upcoming' | 'completed' | 'cancelled'
  thumbnailUrl: string | null
  currentParticipants: number
  registrations: Array<{
    id: string
    userId: string
    userName: string
    userEmail: string
    registeredAt: string
  }>
}

type CreateEventForm = {
  title: string
  description: string
  date: string
  time: string
  type: 'required' | 'optional' | 'manager-only' // 後方互換性のため残す
  targetRoles: ('member' | 'fp' | 'manager' | 'all')[] // 複数選択可能
  attendanceType: 'required' | 'optional'
  venueType: 'online' | 'offline' | 'hybrid' // オンライン / オフライン / ハイブリッド
  location: string
  maxParticipants: number | null
  status: 'upcoming' | 'completed' | 'cancelled'
  thumbnailUrl: string | null // サムネイル画像URL
  isPaid: boolean // 有料イベントかどうか
  price: number | null // 価格（円）
}

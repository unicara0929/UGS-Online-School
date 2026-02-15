'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowLeft,
  Upload,
  X,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2
} from 'lucide-react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

// 相談ジャンルのマッピング
const TYPE_MAP: Record<string, { id: string; name: string }> = {
  'life-plan': { id: 'LIFE_PLAN', name: 'ライフプラン' },
  'housing': { id: 'HOUSING', name: '住宅' },
  'career': { id: 'CAREER', name: '転職' },
  'rental': { id: 'RENTAL', name: '賃貸' },
  'order-suit': { id: 'ORDER_SUIT', name: 'オーダースーツ作成' },
  'solar-battery': { id: 'SOLAR_BATTERY', name: '太陽光・蓄電池' },
  'other': { id: 'OTHER', name: 'その他' },
}

interface UserInfo {
  name: string
  email: string
  phone: string
}

export default function ConsultationFormPage({ params }: { params: Promise<{ type: string }> }) {
  const { type: typeSlug } = use(params)
  const router = useRouter()

  const typeInfo = TYPE_MAP[typeSlug]

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [content, setContent] = useState('')
  const [preferredContact, setPreferredContact] = useState('EMAIL')
  const [lineId, setLineId] = useState('')
  const [preferredDates, setPreferredDates] = useState<string[]>(['', '', '', '', ''])
  const [attachment, setAttachment] = useState<{ url: string; name: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // ユーザー情報を取得
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const res = await fetch('/api/user/profile', {
          credentials: 'include'
        })
        if (res.ok) {
          const data = await res.json()
          setUserInfo({
            name: data.user.name,
            email: data.user.email,
            phone: data.user.phone || '',
          })
          setPhoneNumber(data.user.phone || '')
        }
      } catch (err) {
        console.error('ユーザー情報取得エラー:', err)
      }
    }
    fetchUserInfo()
  }, [])

  // 無効なジャンルの場合
  if (!typeInfo) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Alert variant="destructive">
            <AlertDescription>無効な相談ジャンルです</AlertDescription>
          </Alert>
          <Link href="/dashboard/consultation" className="mt-4 inline-block">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
              戻る
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  /**
   * 明日の日付を取得（YYYY-MM-DD形式）
   */
  const getTomorrowDate = (): string => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const year = tomorrow.getFullYear()
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0')
    const day = String(tomorrow.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  /**
   * 30分刻みの時間オプションを生成（09:00〜21:00）
   */
  const generateTimeOptions = (): string[] => {
    const options: string[] = []
    for (let hour = 9; hour <= 21; hour++) {
      options.push(`${String(hour).padStart(2, '0')}:00`)
      if (hour < 21) {
        options.push(`${String(hour).padStart(2, '0')}:30`)
      }
    }
    return options
  }

  // 希望日時を更新
  const updatePreferredDate = (index: number, value: string) => {
    const newDates = [...preferredDates]
    newDates[index] = value
    setPreferredDates(newDates)
  }

  // ファイルアップロード
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // ファイルサイズチェック
    if (file.size > 10 * 1024 * 1024) {
      setError('ファイルサイズは10MB以下にしてください')
      return
    }

    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/consultations/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'アップロードに失敗しました')
      }

      const data = await res.json()
      setAttachment({
        url: data.filePath,
        name: data.fileName,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  // 添付ファイルを削除
  const removeAttachment = () => {
    setAttachment(null)
  }

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // バリデーション
    if (!phoneNumber) {
      setError('電話番号を入力してください')
      return
    }
    // 携帯電話番号バリデーション
    const phoneRegex = /^(070|080|090)\d{8}$/
    if (!phoneRegex.test(phoneNumber)) {
      setError('ハイフンなしの11桁で入力してください（例：09012345678）')
      return
    }
    if (!content) {
      setError('相談内容を入力してください')
      return
    }

    // LINEを選択した場合はLINE IDが必須
    if (preferredContact === 'LINE' && !lineId.trim()) {
      setError('LINE IDを入力してください')
      return
    }

    const validDates = preferredDates.filter(d => d)
    if (validDates.length === 0) {
      setError('希望日時を1つ以上選択してください')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: typeInfo.id,
          phoneNumber,
          content,
          preferredContact,
          lineId: preferredContact === 'LINE' ? lineId.trim() : null,
          preferredDates: validDates,
          attachmentUrl: attachment?.url,
          attachmentName: attachment?.name,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '申請に失敗しました')
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // 成功画面
  if (success) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" aria-hidden="true" />
              <h2 className="text-2xl font-bold mb-2">申請が完了しました</h2>
              <p className="text-muted-foreground mb-6">
                担当者から折り返しご連絡いたします。<br />
                しばらくお待ちください。
              </p>
              <div className="space-x-4">
                <Link href="/dashboard/consultation">
                  <Button variant="outline">
                    別の相談をする
                  </Button>
                </Link>
                <Link href="/dashboard/consultation/history">
                  <Button>
                    相談履歴を見る
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link href="/dashboard/consultation" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
        ジャンル選択に戻る
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{typeInfo.name}相談</CardTitle>
          <CardDescription>
            以下のフォームに必要事項をご入力ください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 氏名（自動入力・編集不可） */}
            <div className="space-y-2">
              <Label htmlFor="name">氏名</Label>
              <Input
                id="name"
                value={userInfo?.name || '読み込み中...'}
                disabled
                className="bg-muted"
              />
            </div>

            {/* メールアドレス（自動入力・編集不可） */}
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                value={userInfo?.email || '読み込み中...'}
                disabled
                className="bg-muted"
              />
            </div>

            {/* 電話番号（編集可） */}
            <div className="space-y-2">
              <Label htmlFor="phone">電話番号 <span className="text-red-500">*</span></Label>
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 11)
                  setPhoneNumber(value)
                  if (value && !/^(070|080|090)\d{8}$/.test(value)) {
                    setPhoneError('ハイフンなしの11桁で入力してください（例：09012345678）')
                  } else {
                    setPhoneError('')
                  }
                }}
                placeholder="09012345678"
                maxLength={11}
                required
              />
              {phoneError && (
                <p className="text-sm text-red-500">{phoneError}</p>
              )}
              <p className="text-xs text-slate-500">携帯番号のみ（070/080/090）ハイフンなし11桁</p>
            </div>

            {/* 相談ジャンル（自動反映） */}
            <div className="space-y-2">
              <Label>相談ジャンル</Label>
              <Input
                value={typeInfo.name}
                disabled
                className="bg-muted"
              />
            </div>

            {/* 相談内容 */}
            <div className="space-y-2">
              <Label htmlFor="content">相談内容 <span className="text-red-500">*</span></Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="ご相談内容を詳しくご記入ください"
                rows={5}
                required
              />
            </div>

            {/* 希望連絡方法 */}
            <div className="space-y-2">
              <Label>希望連絡方法 <span className="text-red-500">*</span></Label>
              <RadioGroup
                value={preferredContact}
                onValueChange={(value) => {
                  setPreferredContact(value)
                  if (value !== 'LINE') {
                    setLineId('')
                  }
                }}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="EMAIL" id="contact-email" />
                  <Label htmlFor="contact-email" className="cursor-pointer">メール</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PHONE" id="contact-phone" />
                  <Label htmlFor="contact-phone" className="cursor-pointer">電話</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="LINE" id="contact-line" />
                  <Label htmlFor="contact-line" className="cursor-pointer">LINE</Label>
                </div>
              </RadioGroup>
            </div>

            {/* LINE ID（LINEを選択した場合のみ表示） */}
            {preferredContact === 'LINE' && (
              <div className="space-y-2">
                <Label htmlFor="lineId">LINE ID <span className="text-red-500">*</span></Label>
                <Input
                  id="lineId"
                  value={lineId}
                  onChange={(e) => setLineId(e.target.value)}
                  placeholder="例: your_line_id"
                  required
                />
              </div>
            )}

            {/* 希望日時 */}
            <div className="space-y-2">
              <Label>希望日時 <span className="text-red-500">*</span></Label>
              <p className="text-sm text-muted-foreground mb-2">
                ご都合の良い日時を選択してください（1つ以上入力必須、最大5つ）
              </p>
              <div className="space-y-3">
                {preferredDates.map((date, index) => {
                  // datetime-local形式から日付と時間を分離
                  const dateValue = date ? date.split('T')[0] : ''
                  const timeValue = date ? date.split('T')[1] || '' : ''

                  return (
                    <div key={index} className="flex items-start sm:items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground w-16 flex-shrink-0 pt-2 sm:pt-0">
                        候補{index + 1}
                      </span>
                      <div className="flex-1 flex flex-col sm:flex-row gap-2">
                        {/* 日付選択 */}
                        <Input
                          type="date"
                          value={dateValue}
                          min={getTomorrowDate()}
                          onChange={(e) => {
                            const newDate = e.target.value
                            const currentTime = timeValue || '10:00'
                            updatePreferredDate(index, `${newDate}T${currentTime}`)
                          }}
                          className="flex-1"
                        />
                        {/* 時間選択（30分刻み） */}
                        <select
                          value={timeValue}
                          onChange={(e) => {
                            const newTime = e.target.value
                            const currentDate = dateValue || getTomorrowDate()
                            updatePreferredDate(index, `${currentDate}T${newTime}`)
                          }}
                          className="w-full sm:w-28 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                        >
                          <option value="">時間</option>
                          {generateTimeOptions().map((time) => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                ※時間は30分刻み（10:00、10:30、11:00...）で選択できます
              </p>
            </div>

            {/* 添付ファイル */}
            <div className="space-y-2">
              <Label>添付ファイル（任意）</Label>
              <p className="text-sm text-muted-foreground mb-2">
                画像またはPDFファイル（10MB以下）
              </p>
              {attachment ? (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <span className="flex-1 text-sm truncate">{attachment.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeAttachment}
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                    id="file-upload"
                  />
                  <Label
                    htmlFor="file-upload"
                    className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                        アップロード中...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" aria-hidden="true" />
                        ファイルを選択
                      </>
                    )}
                  </Label>
                </div>
              )}
            </div>

            {/* エラー表示 */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* 送信ボタン */}
            <Button
              type="submit"
              className="w-full"
              disabled={submitting || !userInfo}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  送信中...
                </>
              ) : (
                '相談を申請する'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  )
}

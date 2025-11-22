'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CreditCard, ChevronRight, ChevronLeft, Check, AlertCircle } from 'lucide-react'

interface Design {
  id: string
  name: string
  description: string | null
  previewUrl: string | null
}

interface FormData {
  designId: string
  displayName: string
  displayNameKana: string
  roleTitle: string
  company: string
  phoneNumber: string
  email: string
  websiteUrl: string
  postalCode: string
  prefecture: string
  city: string
  addressLine1: string
  addressLine2: string
  quantity: number
  notes: string
}

const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
]

const QUANTITY_OPTIONS = [50, 100, 200, 300, 500]

function BusinessCardOrderContent() {
  const router = useRouter()
  const [designs, setDesigns] = useState<Design[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'form' | 'confirm' | 'complete'>('form')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)

  const [formData, setFormData] = useState<FormData>({
    designId: '',
    displayName: '',
    displayNameKana: '',
    roleTitle: '',
    company: '',
    phoneNumber: '',
    email: '',
    websiteUrl: '',
    postalCode: '',
    prefecture: '',
    city: '',
    addressLine1: '',
    addressLine2: '',
    quantity: 100,
    notes: '',
  })

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const ROLE_TITLE_OPTIONS: Record<string, string> = {
    FP: 'FPエイド',
    MANAGER: 'マネージャー',
    ADMIN: '管理者',
  }

  // ユーザープロフィール情報を取得して初期値をセット
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch('/api/user/profile', { credentials: 'include' })
        const data = await response.json()
        if (data.success && data.user) {
          const userRole = data.user.role?.toUpperCase() || ''
          setFormData((prev) => ({
            ...prev,
            displayName: data.user.name || '',
            email: data.user.email || '',
            phoneNumber: data.user.phone || '',
            prefecture: data.user.prefecture || '',
            roleTitle: ROLE_TITLE_OPTIONS[userRole] || '',
            company: data.user.attribute || '', // 属性フィールドを所属として使用
          }))
        }
      } catch (err) {
        console.error('Failed to fetch user profile:', err)
      }
    }
    fetchUserProfile()
  }, [])

  // デザイン一覧を取得
  const fetchDesigns = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/business-card/designs', { credentials: 'include' })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'デザイン一覧の取得に失敗しました')
      }
      setDesigns(data.designs)
      if (data.designs.length > 0 && !formData.designId) {
        setFormData((prev) => ({ ...prev, designId: data.designs[0].id }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'デザイン一覧の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [formData.designId])

  useEffect(() => {
    fetchDesigns()
  }, [fetchDesigns])

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // エラーをクリア
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const validate = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.designId) errors.designId = 'デザインを選択してください'
    if (!formData.displayName.trim()) errors.displayName = '表示名を入力してください'
    if (!formData.displayNameKana.trim()) {
      errors.displayNameKana = 'フリガナを入力してください'
    } else if (!/^[\u30A0-\u30FF\u3000\s]+$/.test(formData.displayNameKana)) {
      errors.displayNameKana = 'フリガナはカタカナで入力してください'
    }
    if (!formData.phoneNumber.trim()) {
      errors.phoneNumber = '電話番号を入力してください'
    } else if (!/^[\d-]+$/.test(formData.phoneNumber)) {
      errors.phoneNumber = '電話番号の形式が正しくありません'
    }
    if (!formData.email.trim()) {
      errors.email = 'メールアドレスを入力してください'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'メールアドレスの形式が正しくありません'
    }
    if (formData.websiteUrl.trim() && !/^https?:\/\/.+/.test(formData.websiteUrl)) {
      errors.websiteUrl = 'URLの形式が正しくありません（例: https://example.com）'
    }
    if (!formData.postalCode.trim()) {
      errors.postalCode = '郵便番号を入力してください'
    } else if (!/^\d{3}-?\d{4}$/.test(formData.postalCode)) {
      errors.postalCode = '郵便番号の形式が正しくありません（例: 123-4567）'
    }
    if (!formData.prefecture) errors.prefecture = '都道府県を選択してください'
    if (!formData.city.trim()) errors.city = '市区町村を入力してください'
    if (!formData.addressLine1.trim()) errors.addressLine1 = '番地を入力してください'

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleConfirm = () => {
    if (validate()) {
      setStep('confirm')
      window.scrollTo(0, 0)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/business-card/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || '注文の送信に失敗しました')
      }
      setOrderId(data.orderId)
      setStep('complete')
      window.scrollTo(0, 0)
    } catch (err) {
      alert(err instanceof Error ? err.message : '注文の送信に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedDesign = designs.find((d) => d.id === formData.designId)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 md:ml-64">
          <PageHeader title="名刺注文" />
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 md:ml-64">
          <PageHeader title="名刺注文" />
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="py-4">
                <p className="text-sm text-red-600">{error}</p>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <PageHeader title="名刺注文" />
        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-3xl mx-auto">
            {/* ステップインジケーター */}
            <div className="mb-8">
              <div className="flex items-center justify-center gap-4">
                <div className={`flex items-center gap-2 ${step === 'form' ? 'text-slate-900' : 'text-slate-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === 'form' ? 'bg-slate-900 text-white' : step === 'confirm' || step === 'complete' ? 'bg-green-500 text-white' : 'bg-slate-200'
                  }`}>
                    {step === 'confirm' || step === 'complete' ? <Check className="h-4 w-4" /> : '1'}
                  </div>
                  <span className="text-sm font-medium">入力</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
                <div className={`flex items-center gap-2 ${step === 'confirm' ? 'text-slate-900' : 'text-slate-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === 'confirm' ? 'bg-slate-900 text-white' : step === 'complete' ? 'bg-green-500 text-white' : 'bg-slate-200'
                  }`}>
                    {step === 'complete' ? <Check className="h-4 w-4" /> : '2'}
                  </div>
                  <span className="text-sm font-medium">確認</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
                <div className={`flex items-center gap-2 ${step === 'complete' ? 'text-slate-900' : 'text-slate-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === 'complete' ? 'bg-green-500 text-white' : 'bg-slate-200'
                  }`}>
                    {step === 'complete' ? <Check className="h-4 w-4" /> : '3'}
                  </div>
                  <span className="text-sm font-medium">完了</span>
                </div>
              </div>
            </div>

            {/* 入力フォーム */}
            {step === 'form' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      名刺デザイン選択
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {designs.length === 0 ? (
                      <p className="text-sm text-slate-500">利用可能なデザインがありません</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {designs.map((design) => (
                          <div
                            key={design.id}
                            onClick={() => handleInputChange('designId', design.id)}
                            className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
                              formData.designId === design.id
                                ? 'border-slate-900 bg-slate-50'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {design.previewUrl && (
                              <img
                                src={design.previewUrl}
                                alt={design.name}
                                className="w-full h-32 object-cover rounded mb-3"
                              />
                            )}
                            <p className="font-medium">{design.name}</p>
                            {design.description && (
                              <p className="text-sm text-slate-500 mt-1">{design.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {validationErrors.designId && (
                      <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {validationErrors.designId}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>名刺に印字する情報</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        表示名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.displayName}
                        onChange={(e) => handleInputChange('displayName', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                          validationErrors.displayName ? 'border-red-300' : 'border-slate-300'
                        }`}
                        placeholder="名刺に印字する氏名"
                      />
                      {validationErrors.displayName && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.displayName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        氏名フリガナ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.displayNameKana}
                        onChange={(e) => handleInputChange('displayNameKana', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                          validationErrors.displayNameKana ? 'border-red-300' : 'border-slate-300'
                        }`}
                        placeholder="カタカナで入力"
                      />
                      {validationErrors.displayNameKana && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.displayNameKana}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        ロール表記
                      </label>
                      <input
                        type="text"
                        value={formData.roleTitle}
                        onChange={(e) => handleInputChange('roleTitle', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        placeholder="例: FPエイド、ファイナンシャルプランナー"
                      />
                      <p className="text-xs text-slate-500 mt-1">名刺に表示する肩書きを自由に設定できます</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        所属（会社名・屋号など）
                      </label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => handleInputChange('company', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        placeholder="例: 株式会社〇〇"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        電話番号 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                          validationErrors.phoneNumber ? 'border-red-300' : 'border-slate-300'
                        }`}
                        placeholder="090-1234-5678"
                      />
                      {validationErrors.phoneNumber && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.phoneNumber}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        メールアドレス <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                          validationErrors.email ? 'border-red-300' : 'border-slate-300'
                        }`}
                        placeholder="example@email.com"
                      />
                      {validationErrors.email && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        ウェブサイトURL
                      </label>
                      <input
                        type="url"
                        value={formData.websiteUrl}
                        onChange={(e) => handleInputChange('websiteUrl', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                          validationErrors.websiteUrl ? 'border-red-300' : 'border-slate-300'
                        }`}
                        placeholder="https://example.com"
                      />
                      {validationErrors.websiteUrl && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.websiteUrl}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>郵送先住所</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        郵便番号 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.postalCode}
                        onChange={(e) => handleInputChange('postalCode', e.target.value)}
                        className={`w-full max-w-xs px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                          validationErrors.postalCode ? 'border-red-300' : 'border-slate-300'
                        }`}
                        placeholder="123-4567"
                      />
                      {validationErrors.postalCode && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.postalCode}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        都道府県 <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.prefecture}
                        onChange={(e) => handleInputChange('prefecture', e.target.value)}
                        className={`w-full max-w-xs px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                          validationErrors.prefecture ? 'border-red-300' : 'border-slate-300'
                        }`}
                      >
                        <option value="">選択してください</option>
                        {PREFECTURES.map((pref) => (
                          <option key={pref} value={pref}>{pref}</option>
                        ))}
                      </select>
                      {validationErrors.prefecture && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.prefecture}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        市区町村 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                          validationErrors.city ? 'border-red-300' : 'border-slate-300'
                        }`}
                        placeholder="名古屋市中区"
                      />
                      {validationErrors.city && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.city}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        番地 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.addressLine1}
                        onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                          validationErrors.addressLine1 ? 'border-red-300' : 'border-slate-300'
                        }`}
                        placeholder="栄1-2-3"
                      />
                      {validationErrors.addressLine1 && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.addressLine1}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        建物名・部屋番号
                      </label>
                      <input
                        type="text"
                        value={formData.addressLine2}
                        onChange={(e) => handleInputChange('addressLine2', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        placeholder="○○ビル 101号室"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>注文オプション</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        部数 <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.quantity}
                        onChange={(e) => handleInputChange('quantity', Number(e.target.value))}
                        className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                      >
                        {QUANTITY_OPTIONS.map((qty) => (
                          <option key={qty} value={qty}>{qty}枚</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        備考
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        rows={3}
                        placeholder="その他ご要望があればご記入ください"
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button onClick={handleConfirm} className="flex items-center gap-2">
                    確認画面へ
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* 確認画面 */}
            {step === 'confirm' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>注文内容の確認</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 mb-2">名刺デザイン</h3>
                      <p className="font-medium">{selectedDesign?.name}</p>
                    </div>

                    <div className="border-t pt-4">
                      <h3 className="text-sm font-medium text-slate-500 mb-2">名刺に印字する情報</h3>
                      <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm text-slate-500">表示名</dt>
                          <dd className="font-medium">{formData.displayName}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-slate-500">フリガナ</dt>
                          <dd className="font-medium">{formData.displayNameKana}</dd>
                        </div>
                        {formData.roleTitle && (
                          <div>
                            <dt className="text-sm text-slate-500">ロール表記</dt>
                            <dd className="font-medium">{formData.roleTitle}</dd>
                          </div>
                        )}
                        {formData.company && (
                          <div>
                            <dt className="text-sm text-slate-500">所属</dt>
                            <dd className="font-medium">{formData.company}</dd>
                          </div>
                        )}
                        <div>
                          <dt className="text-sm text-slate-500">電話番号</dt>
                          <dd className="font-medium">{formData.phoneNumber}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-slate-500">メールアドレス</dt>
                          <dd className="font-medium">{formData.email}</dd>
                        </div>
                        {formData.websiteUrl && (
                          <div className="md:col-span-2">
                            <dt className="text-sm text-slate-500">ウェブサイトURL</dt>
                            <dd className="font-medium">{formData.websiteUrl}</dd>
                          </div>
                        )}
                      </dl>
                    </div>

                    <div className="border-t pt-4">
                      <h3 className="text-sm font-medium text-slate-500 mb-2">郵送先住所</h3>
                      <p className="font-medium">
                        〒{formData.postalCode}<br />
                        {formData.prefecture}{formData.city}{formData.addressLine1}
                        {formData.addressLine2 && <><br />{formData.addressLine2}</>}
                      </p>
                    </div>

                    <div className="border-t pt-4">
                      <h3 className="text-sm font-medium text-slate-500 mb-2">注文オプション</h3>
                      <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm text-slate-500">部数</dt>
                          <dd className="font-medium">{formData.quantity}枚</dd>
                        </div>
                        {formData.notes && (
                          <div className="md:col-span-2">
                            <dt className="text-sm text-slate-500">備考</dt>
                            <dd className="font-medium whitespace-pre-wrap">{formData.notes}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep('form')} className="flex items-center gap-2">
                    <ChevronLeft className="h-4 w-4" />
                    入力画面に戻る
                  </Button>
                  <Button onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-2">
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    注文を確定する
                  </Button>
                </div>
              </div>
            )}

            {/* 完了画面 */}
            {step === 'complete' && (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">注文を受け付けました</h2>
                  <p className="text-slate-600 mb-6">
                    名刺注文の申請が完了しました。<br />
                    確認メールをお送りしましたのでご確認ください。
                  </p>
                  {orderId && (
                    <p className="text-sm text-slate-500 mb-6">
                      注文番号: {orderId}
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button variant="outline" onClick={() => router.push('/dashboard/business-card/history')}>
                      注文履歴を見る
                    </Button>
                    <Button onClick={() => router.push('/dashboard')}>
                      ダッシュボードに戻る
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function BusinessCardOrderPage() {
  return (
    <ProtectedRoute requiredRoles={['fp', 'manager', 'admin']}>
      <BusinessCardOrderContent />
    </ProtectedRoute>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CreditCard, ChevronRight, ChevronLeft, Check, AlertCircle, MapPin, Truck, User, Info } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

interface Design {
  id: string
  name: string
  description: string | null
  previewUrl: string | null
  previewUrlBack: string | null
}

type DeliveryMethod = 'PICKUP' | 'SHIPPING'

interface FormData {
  designId: string
  displayName: string
  displayNameKana: string
  position: string
  qualifications: string
  phoneNumber: string
  email: string
  // 名刺記載用住所
  cardPostalCode: string
  cardPrefecture: string
  cardCity: string
  cardAddressLine1: string
  cardAddressLine2: string
  deliveryMethod: DeliveryMethod
  // 郵送先住所の選択
  shippingAddressSameAsCard: boolean
  // 郵送先住所（別の場合）
  postalCode: string
  prefecture: string
  city: string
  addressLine1: string
  addressLine2: string
  quantity: number
  notes: string
}

// 受取方法ごとの料金設定
const DELIVERY_PRICES: Record<DeliveryMethod, number> = {
  PICKUP: 2400,   // UGS本社での手渡し受け取り
  SHIPPING: 2950, // レターパック郵送
}

const DELIVERY_LABELS: Record<DeliveryMethod, string> = {
  PICKUP: 'UGS本社（愛知県名古屋市）で手渡し受け取り',
  SHIPPING: 'レターパック郵送',
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

function BusinessCardOrderContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
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
    position: '',
    qualifications: '',
    phoneNumber: '',
    email: '',
    // 名刺記載用住所
    cardPostalCode: '',
    cardPrefecture: '',
    cardCity: '',
    cardAddressLine1: '',
    cardAddressLine2: '',
    deliveryMethod: 'SHIPPING', // デフォルトは郵送
    shippingAddressSameAsCard: true, // デフォルトは名刺記載住所と同じ
    // 郵送先住所
    postalCode: '',
    prefecture: '',
    city: '',
    addressLine1: '',
    addressLine2: '',
    quantity: 100,
    notes: '',
  })

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // 決済完了後の処理
  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    const paymentStatus = searchParams.get('payment')

    if (sessionId) {
      // 決済完了の確認
      verifyPayment(sessionId)
    } else if (paymentStatus === 'canceled') {
      // 決済キャンセル
      setError('決済がキャンセルされました。再度お試しください。')
    }
  }, [searchParams])

  const verifyPayment = async (sessionId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/business-card/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId }),
      })
      const data = await response.json()

      if (data.success) {
        setOrderId(data.orderId)
        setStep('complete')
      } else {
        setError(data.error || '決済の確認に失敗しました')
      }
    } catch (err) {
      setError('決済の確認中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  // ユーザープロフィール情報を取得して初期値をセット
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch('/api/user/profile', { credentials: 'include' })
        const data = await response.json()
        if (data.success && data.user) {
          setFormData((prev) => ({
            ...prev,
            displayName: data.user.name || '',
            email: data.user.email || '',
            phoneNumber: data.user.phone || '',
            prefecture: data.user.prefecture || '',
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
    // 決済後のリダイレクトでない場合のみデザインを取得
    if (!searchParams.get('session_id')) {
      fetchDesigns()
    }
  }, [fetchDesigns, searchParams])

  const handleInputChange = (field: keyof FormData, value: string | number | boolean) => {
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
    if (!formData.position) {
      errors.position = '役職を選択してください'
    }
    if (!formData.phoneNumber.trim()) {
      errors.phoneNumber = '電話番号を入力してください'
    } else if (!/^(070|080|090)\d{8}$/.test(formData.phoneNumber)) {
      errors.phoneNumber = 'ハイフンなしの11桁で入力してください（例：09012345678）'
    }
    if (!formData.email.trim()) {
      errors.email = 'メールアドレスを入力してください'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'メールアドレスの形式が正しくありません'
    }

    // 名刺記載住所のバリデーション
    if (!formData.cardPostalCode.trim()) {
      errors.cardPostalCode = '郵便番号を入力してください'
    } else if (!/^\d{3}-?\d{4}$/.test(formData.cardPostalCode)) {
      errors.cardPostalCode = '郵便番号の形式が正しくありません（例: 123-4567）'
    }
    if (!formData.cardPrefecture) errors.cardPrefecture = '都道府県を選択してください'
    if (!formData.cardCity.trim()) errors.cardCity = '市区町村を入力してください'
    if (!formData.cardAddressLine1.trim()) errors.cardAddressLine1 = '番地を入力してください'

    // 郵送の場合で、別の住所を指定する場合のみ郵送先住所を必須チェック
    if (formData.deliveryMethod === 'SHIPPING' && !formData.shippingAddressSameAsCard) {
      if (!formData.postalCode.trim()) {
        errors.postalCode = '郵便番号を入力してください'
      } else if (!/^\d{3}-?\d{4}$/.test(formData.postalCode)) {
        errors.postalCode = '郵便番号の形式が正しくありません（例: 123-4567）'
      }
      if (!formData.prefecture) errors.prefecture = '都道府県を選択してください'
      if (!formData.city.trim()) errors.city = '市区町村を入力してください'
      if (!formData.addressLine1.trim()) errors.addressLine1 = '番地を入力してください'
    }

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
      // 注文を作成してStripe Checkoutにリダイレクト
      const response = await fetch('/api/business-card/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '決済処理の開始に失敗しました')
      }

      // Stripe Checkoutページにリダイレクト
      window.location.href = data.checkoutUrl
    } catch (err) {
      alert(err instanceof Error ? err.message : '決済処理の開始に失敗しました')
      setIsSubmitting(false)
    }
  }

  const selectedDesign = designs.find((d) => d.id === formData.designId)
  const currentPrice = DELIVERY_PRICES[formData.deliveryMethod]

  // 決済後のリダイレクトでロード中
  if (searchParams.get('session_id') && isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 md:ml-64">
          <PageHeader title="名刺注文" />
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400 mb-4" />
              <p className="text-slate-600">決済を確認中...</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (isLoading && !searchParams.get('session_id')) {
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

  if (error && step !== 'complete') {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 md:ml-64">
          <PageHeader title="名刺注文" />
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="py-4">
                <p className="text-sm text-red-600">{error}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setError(null)
                    router.push('/dashboard/business-card/order')
                  }}
                >
                  もう一度試す
                </Button>
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
                  <span className="text-sm font-medium">確認・決済</span>
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
                      <div className="text-center py-8">
                        <CreditCard className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600 font-medium mb-2">利用可能なデザインがありません</p>
                        <p className="text-sm text-slate-500">
                          現在、選択可能な名刺デザインが登録されていません。<br />
                          管理者にお問い合わせください。
                        </p>
                      </div>
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
                            {/* 表面・裏面の画像を横並びで表示 */}
                            <div className="flex gap-2 mb-3">
                              {design.previewUrl && (
                                <div className="flex-1">
                                  <a
                                    href={design.previewUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="block hover:opacity-80 transition-opacity"
                                  >
                                    <img
                                      src={design.previewUrl}
                                      alt={`${design.name} 表面`}
                                      className="w-full aspect-[91/55] object-contain rounded border border-slate-200 bg-slate-50"
                                    />
                                  </a>
                                  <p className="text-xs text-slate-400 text-center mt-1">表面（クリックで拡大）</p>
                                </div>
                              )}
                              {design.previewUrlBack && (
                                <div className="flex-1">
                                  <a
                                    href={design.previewUrlBack}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="block hover:opacity-80 transition-opacity"
                                  >
                                    <img
                                      src={design.previewUrlBack}
                                      alt={`${design.name} 裏面`}
                                      className="w-full aspect-[91/55] object-contain rounded border border-slate-200 bg-slate-50"
                                    />
                                  </a>
                                  <p className="text-xs text-slate-400 text-center mt-1">裏面（クリックで拡大）</p>
                                </div>
                              )}
                              {!design.previewUrl && !design.previewUrlBack && (
                                <div className="w-full h-24 bg-slate-100 rounded flex items-center justify-center">
                                  <CreditCard className="h-8 w-8 text-slate-300" />
                                </div>
                              )}
                            </div>
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

                {/* 受取方法選択 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      受取方法
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <label
                        className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          formData.deliveryMethod === 'PICKUP'
                            ? 'border-slate-900 bg-slate-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="deliveryMethod"
                          value="PICKUP"
                          checked={formData.deliveryMethod === 'PICKUP'}
                          onChange={(e) => handleInputChange('deliveryMethod', e.target.value as DeliveryMethod)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-slate-600" />
                            <span className="font-medium">{DELIVERY_LABELS.PICKUP}</span>
                          </div>
                          <p className="text-sm text-slate-500 mt-1">
                            UGS本社にて直接お受け取りいただけます。郵送先の入力は不要です。
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-slate-900">
                            ¥{DELIVERY_PRICES.PICKUP.toLocaleString()}
                          </span>
                          <p className="text-xs text-slate-500">税込</p>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          formData.deliveryMethod === 'SHIPPING'
                            ? 'border-slate-900 bg-slate-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="deliveryMethod"
                          value="SHIPPING"
                          checked={formData.deliveryMethod === 'SHIPPING'}
                          onChange={(e) => handleInputChange('deliveryMethod', e.target.value as DeliveryMethod)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-slate-600" />
                            <span className="font-medium">{DELIVERY_LABELS.SHIPPING}</span>
                          </div>
                          <p className="text-sm text-slate-500 mt-1">
                            ご指定の住所にレターパックでお届けします。
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-slate-900">
                            ¥{DELIVERY_PRICES.SHIPPING.toLocaleString()}
                          </span>
                          <p className="text-xs text-slate-500">税込</p>
                        </div>
                      </label>
                    </div>
                  </CardContent>
                </Card>

                {/* 注文者情報（読み取り専用） */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      注文者情報
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          会員番号
                        </label>
                        <input
                          type="text"
                          value={user?.memberId || ''}
                          disabled
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          お名前
                        </label>
                        <input
                          type="text"
                          value={user?.name || ''}
                          disabled
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          メールアドレス
                        </label>
                        <input
                          type="text"
                          value={user?.email || ''}
                          disabled
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-600"
                        />
                      </div>
                    </div>
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
                        役職 <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.position}
                        onChange={(e) => handleInputChange('position', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                          validationErrors.position ? 'border-red-300' : 'border-slate-300'
                        }`}
                      >
                        <option value="">選択してください</option>
                        <option value="FPエイド">FPエイド</option>
                        <option value="FPエイドマネージャー">FPエイドマネージャー</option>
                      </select>
                      {validationErrors.position && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.position}</p>
                      )}
                    </div>

                    <div>
                      <label className="flex items-center gap-1 text-sm font-medium text-slate-700 mb-1">
                        保有資格（名刺記載用）
                        <div className="relative group">
                          <Info className="h-4 w-4 text-slate-500 cursor-help" />
                          <div className="absolute left-0 top-6 z-50 hidden group-hover:block w-64 p-3 text-xs text-white bg-slate-800 rounded-lg shadow-lg">
                            不動産、保険、金融など、事業に関連する資格のみご記載ください。
                          </div>
                        </div>
                      </label>
                      <input
                        type="text"
                        value={formData.qualifications}
                        onChange={(e) => handleInputChange('qualifications', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        placeholder="例: FP2級、宅地建物取引士"
                      />
                      <p className="text-xs text-slate-500 mt-1">複数ある場合はカンマ区切りで入力</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        電話番号 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 11)
                          handleInputChange('phoneNumber', value)
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                          validationErrors.phoneNumber ? 'border-red-300' : 'border-slate-300'
                        }`}
                        placeholder="09012345678"
                        maxLength={11}
                      />
                      {validationErrors.phoneNumber && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.phoneNumber}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">携帯番号のみ（070/080/090）ハイフンなし11桁</p>
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

                  </CardContent>
                </Card>

                {/* 名刺記載住所 */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      名刺記載住所
                      <span className="text-red-500 text-sm ml-2">（必須）</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        郵便番号 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.cardPostalCode}
                        onChange={(e) => handleInputChange('cardPostalCode', e.target.value)}
                        className={`w-full max-w-xs px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                          validationErrors.cardPostalCode ? 'border-red-300' : 'border-slate-300'
                        }`}
                        placeholder="123-4567"
                      />
                      {validationErrors.cardPostalCode && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.cardPostalCode}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        都道府県 <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.cardPrefecture}
                        onChange={(e) => handleInputChange('cardPrefecture', e.target.value)}
                        className={`w-full max-w-xs px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                          validationErrors.cardPrefecture ? 'border-red-300' : 'border-slate-300'
                        }`}
                      >
                        <option value="">選択してください</option>
                        {PREFECTURES.map((pref) => (
                          <option key={pref} value={pref}>{pref}</option>
                        ))}
                      </select>
                      {validationErrors.cardPrefecture && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.cardPrefecture}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        市区町村 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.cardCity}
                        onChange={(e) => handleInputChange('cardCity', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                          validationErrors.cardCity ? 'border-red-300' : 'border-slate-300'
                        }`}
                        placeholder="名古屋市中区"
                      />
                      {validationErrors.cardCity && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.cardCity}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        番地 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.cardAddressLine1}
                        onChange={(e) => handleInputChange('cardAddressLine1', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                          validationErrors.cardAddressLine1 ? 'border-red-300' : 'border-slate-300'
                        }`}
                        placeholder="栄1-2-3"
                      />
                      {validationErrors.cardAddressLine1 && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.cardAddressLine1}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        建物名・部屋番号
                      </label>
                      <input
                        type="text"
                        value={formData.cardAddressLine2}
                        onChange={(e) => handleInputChange('cardAddressLine2', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        placeholder="○○ビル 101号室"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 郵送先住所（郵送の場合のみ表示） */}
                {formData.deliveryMethod === 'SHIPPING' && (
                <Card>
                  <CardHeader>
                    <CardTitle>郵送先住所</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 名刺記載住所と同じかどうかの選択 */}
                    <div className="space-y-3">
                      <label
                        className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          formData.shippingAddressSameAsCard
                            ? 'border-slate-900 bg-slate-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="shippingAddressChoice"
                          checked={formData.shippingAddressSameAsCard}
                          onChange={() => handleInputChange('shippingAddressSameAsCard', true)}
                        />
                        <span className="font-medium">名刺記載住所と同じ</span>
                      </label>

                      <label
                        className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          !formData.shippingAddressSameAsCard
                            ? 'border-slate-900 bg-slate-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="shippingAddressChoice"
                          checked={!formData.shippingAddressSameAsCard}
                          onChange={() => handleInputChange('shippingAddressSameAsCard', false)}
                        />
                        <span className="font-medium">別の住所を指定</span>
                      </label>
                    </div>

                    {/* 別の住所を指定する場合のみ入力フォームを表示 */}
                    {!formData.shippingAddressSameAsCard && (
                      <div className="space-y-4 pt-4 border-t">
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
                      </div>
                    )}
                  </CardContent>
                </Card>
                )}

                {/* 料金表示 */}
                <Card className="bg-slate-900 text-white">
                  <CardContent className="py-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-slate-300 text-sm">お支払い金額（税込）</p>
                        <p className="text-sm text-slate-400 mt-1">
                          {DELIVERY_LABELS[formData.deliveryMethod]}
                        </p>
                      </div>
                      <p className="text-3xl font-bold">¥{currentPrice.toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button
                    onClick={handleConfirm}
                    disabled={designs.length === 0}
                    className="flex items-center gap-2"
                  >
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
                      <h3 className="text-sm font-medium text-slate-500 mb-2">受取方法</h3>
                      <p className="font-medium">{DELIVERY_LABELS[formData.deliveryMethod]}</p>
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
                        <div>
                          <dt className="text-sm text-slate-500">役職</dt>
                          <dd className="font-medium">{formData.position}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-slate-500">保有資格</dt>
                          <dd className="font-medium">{formData.qualifications || '未入力'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-slate-500">電話番号</dt>
                          <dd className="font-medium">{formData.phoneNumber}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-slate-500">メールアドレス</dt>
                          <dd className="font-medium">{formData.email}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="border-t pt-4">
                      <h3 className="text-sm font-medium text-slate-500 mb-2">名刺記載住所</h3>
                      <p className="font-medium">
                        〒{formData.cardPostalCode}<br />
                        {formData.cardPrefecture}{formData.cardCity}{formData.cardAddressLine1}
                        {formData.cardAddressLine2 && <><br />{formData.cardAddressLine2}</>}
                      </p>
                    </div>

                    {formData.deliveryMethod === 'SHIPPING' && (
                      <div className="border-t pt-4">
                        <h3 className="text-sm font-medium text-slate-500 mb-2">郵送先住所</h3>
                        {formData.shippingAddressSameAsCard ? (
                          <p className="font-medium text-slate-600">名刺記載住所と同じ</p>
                        ) : (
                          <p className="font-medium">
                            〒{formData.postalCode}<br />
                            {formData.prefecture}{formData.city}{formData.addressLine1}
                            {formData.addressLine2 && <><br />{formData.addressLine2}</>}
                          </p>
                        )}
                      </div>
                    )}

                    {formData.deliveryMethod === 'PICKUP' && (
                      <div className="border-t pt-4">
                        <h3 className="text-sm font-medium text-slate-500 mb-2">受取場所</h3>
                        <p className="font-medium">UGS本社（愛知県名古屋市）</p>
                        <p className="text-sm text-slate-500 mt-1">
                          ※ 名刺の準備が完了次第、受取可能日時をご連絡いたします。
                        </p>
                      </div>
                    )}

                    <div className="border-t pt-4">
                      <h3 className="text-sm font-medium text-slate-500 mb-2">お支払い金額</h3>
                      <p className="text-2xl font-bold text-slate-900">¥{currentPrice.toLocaleString()}</p>
                      <p className="text-sm text-slate-500">（税込）</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    「決済に進む」ボタンをクリックすると、Stripeの決済画面に移動します。
                    決済完了後、自動的にこのページに戻ります。
                  </p>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep('form')} className="flex items-center gap-2">
                    <ChevronLeft className="h-4 w-4" />
                    入力画面に戻る
                  </Button>
                  <Button onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-2">
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4" />
                    )}
                    決済に進む（¥{currentPrice.toLocaleString()}）
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
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">注文が完了しました</h2>
                  <p className="text-slate-600 mb-6">
                    名刺注文の決済が完了しました。<br />
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

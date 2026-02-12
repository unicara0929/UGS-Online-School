'use client'

import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { ArrowLeft, Building2, Eye, EyeOff, CreditCard, AlertCircle } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  convertYuchoToStandard,
  validateYuchoSymbol,
  validateYuchoNumber
} from "@/lib/utils/yucho-converter"

const ACCOUNT_TYPES = [
  { value: 'NORMAL', label: '普通預金' },
  { value: 'CHECKING', label: '当座預金' },
  { value: 'SAVINGS', label: '貯蓄預金' }
]

// よく使われる銀行一覧
const COMMON_BANKS = [
  { value: 'GMOあおぞらネット銀行', label: 'GMOあおぞらネット銀行' },
  { value: '三菱UFJ銀行', label: '三菱UFJ銀行' },
  { value: 'みずほ銀行', label: 'みずほ銀行' },
  { value: '三井住友銀行', label: '三井住友銀行' },
  { value: 'ゆうちょ銀行', label: 'ゆうちょ銀行' },
  { value: 'りそな銀行', label: 'りそな銀行' },
  { value: '埼玉りそな銀行', label: '埼玉りそな銀行' },
  { value: '楽天銀行', label: '楽天銀行' },
  { value: '住信SBIネット銀行', label: '住信SBIネット銀行' },
  { value: 'PayPay銀行', label: 'PayPay銀行' },
]

interface BankAccountData {
  id?: string
  bankName: string
  branchName?: string
  branchNumber?: string
  accountType: 'NORMAL' | 'CHECKING' | 'SAVINGS'
  accountNumber: string
  accountHolderName: string
  isYuchoBank: boolean
  yuchoSymbol?: string
  yuchoNumber?: string
}

function BankAccountSettingsPage() {
  const { user, canAccessFPContent } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showAccountNumber, setShowAccountNumber] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [formData, setFormData] = useState<BankAccountData>({
    bankName: '',
    branchName: '',
    branchNumber: '',
    accountType: 'NORMAL',
    accountNumber: '',
    accountHolderName: '',
    isYuchoBank: false,
    yuchoSymbol: '',
    yuchoNumber: ''
  })
  const [isOtherBank, setIsOtherBank] = useState(false)
  const [otherBankName, setOtherBankName] = useState('')

  // 役割チェック - FP または Manager のみアクセス可能
  useEffect(() => {
    if (!canAccessFPContent()) {
      router.push('/dashboard/settings')
    }
  }, [canAccessFPContent, router])

  // 既存の口座情報を取得
  useEffect(() => {
    const loadBankAccount = async () => {
      if (!user?.id) {
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch('/api/user/bank-account', {
          credentials: 'include'
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.bankAccount) {
            const loadedBankName = data.bankAccount.bankName || ''
            const isCommonBank = COMMON_BANKS.some(bank => bank.value === loadedBankName)

            setFormData({
              id: data.bankAccount.id,
              bankName: loadedBankName,
              branchName: data.bankAccount.branchName || '',
              branchNumber: data.bankAccount.branchNumber || '',
              accountType: data.bankAccount.accountType || 'NORMAL',
              accountNumber: data.bankAccount.accountNumber || '',
              accountHolderName: data.bankAccount.accountHolderName || '',
              isYuchoBank: data.bankAccount.isYuchoBank || false,
              yuchoSymbol: data.bankAccount.yuchoSymbol || '',
              yuchoNumber: data.bankAccount.yuchoNumber || ''
            })

            // 既存の銀行名がリストにない場合は「その他」を選択
            if (loadedBankName && !isCommonBank) {
              setIsOtherBank(true)
              setOtherBankName(loadedBankName)
            }
          }
        }
      } catch (error) {
        console.error('口座情報の取得エラー:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadBankAccount()
  }, [user?.id])

  // ゆうちょ銀行の変換プレビュー
  const yuchoConversion = formData.isYuchoBank && formData.yuchoSymbol && formData.yuchoNumber
    ? convertYuchoToStandard(formData.yuchoSymbol, formData.yuchoNumber)
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    // バリデーション
    if (!formData.bankName.trim()) {
      setErrorMessage('金融機関名を入力してください')
      return
    }

    if (!formData.accountHolderName.trim()) {
      setErrorMessage('口座名義（カタカナ）を入力してください')
      return
    }

    // カタカナチェック
    const katakanaRegex = /^[ァ-ヶー\s]+$/
    if (!katakanaRegex.test(formData.accountHolderName)) {
      setErrorMessage('口座名義は全角カタカナで入力してください')
      return
    }

    if (formData.isYuchoBank) {
      // ゆうちょ銀行のバリデーション
      const symbolError = validateYuchoSymbol(formData.yuchoSymbol || '')
      if (symbolError) {
        setErrorMessage(symbolError)
        return
      }

      const numberError = validateYuchoNumber(formData.yuchoNumber || '')
      if (numberError) {
        setErrorMessage(numberError)
        return
      }

      // 変換チェック
      const conversion = convertYuchoToStandard(formData.yuchoSymbol || '', formData.yuchoNumber || '')
      if (conversion.error) {
        setErrorMessage(conversion.error)
        return
      }
    } else {
      // 通常の銀行のバリデーション
      if (!formData.branchName?.trim()) {
        setErrorMessage('支店名を入力してください')
        return
      }

      if (!formData.branchNumber?.trim()) {
        setErrorMessage('支店番号を入力してください')
        return
      }

      // 支店番号は3桁
      if (!/^\d{3}$/.test(formData.branchNumber)) {
        setErrorMessage('支店番号は3桁の数字で入力してください')
        return
      }

      if (!formData.accountNumber.trim()) {
        setErrorMessage('口座番号を入力してください')
        return
      }

      // 口座番号は7桁
      if (!/^\d{7}$/.test(formData.accountNumber)) {
        setErrorMessage('口座番号は7桁の数字で入力してください')
        return
      }
    }

    setIsSaving(true)

    try {
      const response = await fetch('/api/user/bank-account', {
        method: formData.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '口座情報の保存に失敗しました')
      }

      if (data.success) {
        setSuccessMessage(formData.id ? '口座情報を更新しました' : '口座情報を登録しました')

        // IDを更新（新規登録の場合）
        if (!formData.id && data.bankAccount?.id) {
          setFormData(prev => ({ ...prev, id: data.bankAccount.id }))
        }

        // 3秒後にメッセージをクリア
        setTimeout(() => {
          setSuccessMessage(null)
        }, 3000)
      }
    } catch (error: any) {
      console.error('口座情報保存エラー:', error)
      setErrorMessage(error.message || '口座情報の保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  // アクセス権限がない場合は何も表示しない
  if (!canAccessFPContent()) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex">
      {/* サイドバー */}
      <Sidebar />

      {/* メインコンテンツ */}
      <div className="flex-1 min-w-0 md:ml-64">
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
                <h1 className="text-3xl font-bold text-slate-900">報酬受け取り口座</h1>
                <p className="text-slate-600 mt-1">報酬の振込先口座を登録・管理</p>
              </div>
            </div>

            {/* エラーメッセージ */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* 成功メッセージ */}
            {successMessage && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
                <CreditCard className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">{successMessage}</p>
                </div>
              </div>
            )}

            {/* 口座情報フォーム */}
            <form onSubmit={handleSubmit}>
              <Card className="shadow-xl border-0">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building2 className="h-5 w-5 mr-2 text-blue-600" />
                    口座情報
                  </CardTitle>
                  <CardDescription>
                    報酬の振込先として使用する口座情報を入力してください
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* 金融機関名 */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      金融機関名 *
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {COMMON_BANKS.map((bank) => (
                        <label
                          key={bank.value}
                          className={`flex items-center p-3 border-2 rounded-xl cursor-pointer transition-all ${
                            !isOtherBank && formData.bankName === bank.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="bankName"
                            value={bank.value}
                            checked={!isOtherBank && formData.bankName === bank.value}
                            onChange={(e) => {
                              const selectedBank = e.target.value
                              const isYucho = selectedBank === 'ゆうちょ銀行'
                              setFormData({
                                ...formData,
                                bankName: selectedBank,
                                isYuchoBank: isYucho,
                                // ゆうちょ銀行切り替え時にフィールドをクリア
                                branchName: isYucho ? '' : formData.branchName,
                                branchNumber: isYucho ? '' : formData.branchNumber,
                                yuchoSymbol: isYucho ? formData.yuchoSymbol : '',
                                yuchoNumber: isYucho ? formData.yuchoNumber : ''
                              })
                              setIsOtherBank(false)
                              setOtherBankName('')
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm font-medium text-slate-700">{bank.label}</span>
                        </label>
                      ))}
                      {/* その他の銀行 */}
                      <label
                        className={`flex items-center p-3 border-2 rounded-xl cursor-pointer transition-all ${
                          isOtherBank
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="bankName"
                          value="other"
                          checked={isOtherBank}
                          onChange={() => {
                            setIsOtherBank(true)
                            setFormData({
                              ...formData,
                              bankName: otherBankName,
                              isYuchoBank: false,
                              yuchoSymbol: '',
                              yuchoNumber: ''
                            })
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium text-slate-700">その他</span>
                      </label>
                    </div>

                    {/* その他の銀行名入力 */}
                    {isOtherBank && (
                      <div className="mt-3">
                        <input
                          type="text"
                          value={otherBankName}
                          onChange={(e) => {
                            setOtherBankName(e.target.value)
                            setFormData({...formData, bankName: e.target.value})
                          }}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:shadow-md"
                          placeholder="銀行名を入力してください"
                          required
                        />
                      </div>
                    )}
                  </div>

                  {/* ゆうちょ銀行の説明 */}
                  {formData.isYuchoBank && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="font-medium text-slate-900">ゆうちょ銀行</div>
                      <div className="text-sm text-slate-600 mt-1">
                        ゆうちょ銀行は「記号」と「番号」で入力してください。振込用の支店番号・口座番号に自動変換されます。
                      </div>
                    </div>
                  )}

                  {/* ゆうちょ銀行の場合 */}
                  {formData.isYuchoBank ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 記号 */}
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            記号（5桁）*
                            <span className="text-xs font-normal text-slate-500 ml-2">※半角数字</span>
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formData.yuchoSymbol}
                            onChange={(e) => {
                              // 全角数字を半角に変換し、数字のみ入力可能
                              const value = e.target.value
                                .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
                                .replace(/[^0-9]/g, '')
                              if (value.length <= 5) {
                                setFormData({...formData, yuchoSymbol: value})
                              }
                            }}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:shadow-md font-mono"
                            placeholder="12345"
                            maxLength={5}
                            required
                          />
                        </div>

                        {/* 番号 */}
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            番号（最大8桁）*
                            <span className="text-xs font-normal text-slate-500 ml-2">※半角数字</span>
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formData.yuchoNumber}
                            onChange={(e) => {
                              // 全角数字を半角に変換し、数字のみ入力可能
                              const value = e.target.value
                                .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
                                .replace(/[^0-9]/g, '')
                              if (value.length <= 8) {
                                setFormData({...formData, yuchoNumber: value})
                              }
                            }}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:shadow-md font-mono"
                            placeholder="12345678"
                            maxLength={8}
                            required
                          />
                        </div>
                      </div>

                      {/* 変換結果プレビュー */}
                      {yuchoConversion && !yuchoConversion.error && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <p className="text-sm font-medium text-green-900 mb-2">
                            変換後（振込用）
                          </p>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-slate-600">支店番号:</span>
                              <span className="ml-2 font-mono font-bold text-slate-900">
                                {yuchoConversion.branchNumber}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-600">口座番号:</span>
                              <span className="ml-2 font-mono font-bold text-slate-900">
                                {yuchoConversion.accountNumber}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* 通常の銀行の場合 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 支店名 */}
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            支店名 *
                          </label>
                          <input
                            type="text"
                            value={formData.branchName}
                            onChange={(e) => setFormData({...formData, branchName: e.target.value})}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:shadow-md"
                            placeholder="例: 新宿支店"
                            required
                          />
                        </div>

                        {/* 支店番号 */}
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            支店番号（3桁）*
                            <span className="text-xs font-normal text-slate-500 ml-2">※半角数字</span>
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formData.branchNumber}
                            onChange={(e) => {
                              // 全角数字を半角に変換し、数字のみ入力可能
                              const value = e.target.value
                                .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
                                .replace(/[^0-9]/g, '')
                              if (value.length <= 3) {
                                setFormData({...formData, branchNumber: value})
                              }
                            }}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:shadow-md font-mono"
                            placeholder="001"
                            maxLength={3}
                            required
                          />
                        </div>
                      </div>

                      {/* 口座番号 */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          口座番号（7桁）*
                          <span className="text-xs font-normal text-slate-500 ml-2">※半角数字</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showAccountNumber ? "text" : "password"}
                            inputMode="numeric"
                            value={formData.accountNumber}
                            onChange={(e) => {
                              // 全角数字を半角に変換し、数字のみ入力可能
                              const value = e.target.value
                                .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
                                .replace(/[^0-9]/g, '')
                              if (value.length <= 7) {
                                setFormData({...formData, accountNumber: value})
                              }
                            }}
                            className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:shadow-md font-mono"
                            placeholder="1234567"
                            maxLength={7}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowAccountNumber(!showAccountNumber)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showAccountNumber ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* 口座種別 */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      口座種別 *
                    </label>
                    <select
                      value={formData.accountType}
                      onChange={(e) => setFormData({...formData, accountType: e.target.value as 'NORMAL' | 'CHECKING' | 'SAVINGS'})}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:shadow-md bg-white"
                      required
                    >
                      {ACCOUNT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 口座名義 */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      口座名義（カタカナ）*
                    </label>
                    <input
                      type="text"
                      value={formData.accountHolderName}
                      onChange={(e) => {
                        // カタカナとスペースのみ入力可能
                        const value = e.target.value.replace(/[^ァ-ヶー\s]/g, '')
                        setFormData({...formData, accountHolderName: value})
                      }}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:shadow-md"
                      placeholder="例: ヤマダ タロウ"
                      required
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      全角カタカナで入力してください（姓と名の間にスペースを入れてください）
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* 保存ボタン */}
              <div className="flex justify-end space-x-3 mt-6">
                <Link href="/dashboard/settings">
                  <Button variant="outline" className="min-w-[120px]" type="button">
                    キャンセル
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="min-w-[120px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
                >
                  {isSaving ? '保存中...' : formData.id ? '更新する' : '登録する'}
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function BankAccountSettingsPageComponent() {
  return (
    <ProtectedRoute>
      <BankAccountSettingsPage />
    </ProtectedRoute>
  )
}

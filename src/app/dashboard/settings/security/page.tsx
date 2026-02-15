'use client'

import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/navigation/sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Shield, ArrowLeft, Eye, EyeOff, Lock, AlertCircle, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

function SecuritySettingsPage() {
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // バリデーション
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('すべてのフィールドを入力してください')
      return
    }

    if (formData.newPassword.length < 8) {
      setError('新しいパスワードは8文字以上で入力してください')
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('新しいパスワードと確認用パスワードが一致しません')
      return
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('現在のパスワードと同じパスワードは設定できません')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'パスワードの変更に失敗しました')
      }

      setSuccess('パスワードを変更しました')
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })

      // 3秒後にフォームを閉じる
      setTimeout(() => {
        setShowPasswordForm(false)
        setSuccess(null)
      }, 3000)
    } catch (error: any) {
      console.error('Password change error:', error)
      setError(error.message || 'パスワードの変更に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* サイドバー */}
      <Sidebar />

      {/* メインコンテンツ */}
      <div className="flex-1 min-w-0 md:ml-64">
        {/* ヘッダー */}
        <DashboardHeader />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard/settings">
                <Button variant="outline" size="icon">
                  <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">セキュリティ設定</h1>
                <p className="text-slate-600 mt-1">アカウントのセキュリティ管理</p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" aria-hidden="true" />
                  セキュリティ設定
                </CardTitle>
                <CardDescription>
                  アカウントのセキュリティ管理
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* パスワード変更 */}
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">パスワード変更</h4>
                      <p className="text-sm text-slate-600">アカウントのパスワードを変更</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowPasswordForm(!showPasswordForm)
                        setError(null)
                        setSuccess(null)
                      }}
                    >
                      {showPasswordForm ? 'キャンセル' : '変更'}
                    </Button>
                  </div>

                  {/* パスワード変更フォーム */}
                  {showPasswordForm && (
                    <form onSubmit={handlePasswordChange} className="mt-4 p-4 bg-slate-50 rounded-lg space-y-4">
                      {/* エラーメッセージ */}
                      {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
                          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                          <p className="text-sm text-red-800">{error}</p>
                        </div>
                      )}

                      {/* 成功メッセージ */}
                      {success && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start space-x-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                          <p className="text-sm text-green-800">{success}</p>
                        </div>
                      )}

                      {/* 現在のパスワード */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          現在のパスワード *
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden="true" />
                          <input
                            type={showCurrentPassword ? "text" : "password"}
                            value={formData.currentPassword}
                            onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                            className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-[box-shadow,border-color] shadow-sm hover:shadow-md"
                            placeholder="現在のパスワードを入力"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="h-5 w-5" aria-hidden="true" />
                            ) : (
                              <Eye className="h-5 w-5" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* 新しいパスワード */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          新しいパスワード *
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden="true" />
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={formData.newPassword}
                            onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                            className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-[box-shadow,border-color] shadow-sm hover:shadow-md"
                            placeholder="新しいパスワードを入力（8文字以上）"
                            minLength={8}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-5 w-5" aria-hidden="true" />
                            ) : (
                              <Eye className="h-5 w-5" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          8文字以上で入力してください
                        </p>
                      </div>

                      {/* 新しいパスワード（確認） */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          新しいパスワード（確認）*
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden="true" />
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                            className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-[box-shadow,border-color] shadow-sm hover:shadow-md"
                            placeholder="新しいパスワードを再入力"
                            minLength={8}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-5 w-5" aria-hidden="true" />
                            ) : (
                              <Eye className="h-5 w-5" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* 送信ボタン */}
                      <div className="flex justify-end pt-2">
                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className="min-w-[120px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        >
                          {isSubmitting ? '変更中...' : 'パスワードを変更'}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>

                {/* 2段階認証 */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <div>
                    <h4 className="font-medium">2段階認証</h4>
                    <p className="text-sm text-slate-600">セキュリティを強化</p>
                  </div>
                  <Badge variant="outline">準備中</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function SecuritySettingsPageComponent() {
  return (
    <ProtectedRoute>
      <SecuritySettingsPage />
    </ProtectedRoute>
  )
}


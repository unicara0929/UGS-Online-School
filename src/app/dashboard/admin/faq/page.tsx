'use client'

import { useEffect, useState, useCallback } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Plus, Edit, Trash2, Loader2, FolderPlus, Eye, EyeOff, ChevronDown, ChevronUp, Save, X
} from 'lucide-react'

interface FAQCategory {
  id: string
  name: string
  description: string | null
  order: number
  isActive: boolean
  _count?: { faqs: number }
}

interface FAQ {
  id: string
  categoryId: string
  question: string
  answer: string
  order: number
  isPublished: boolean
  category: FAQCategory
  updatedAt: string
}

type TabType = 'faqs' | 'categories'

function AdminFAQPageContent() {
  const [activeTab, setActiveTab] = useState<TabType>('faqs')
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [categories, setCategories] = useState<FAQCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // FAQ編集用
  const [showFAQForm, setShowFAQForm] = useState(false)
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null)
  const [faqForm, setFaqForm] = useState({
    categoryId: '',
    question: '',
    answer: '',
    order: 0,
    isPublished: true,
  })
  const [isSubmittingFAQ, setIsSubmittingFAQ] = useState(false)

  // カテゴリ編集用
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<FAQCategory | null>(null)
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    order: 0,
    isActive: true,
  })
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false)

  // カテゴリ取得
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/faq/categories', { credentials: 'include' })
      const data = await response.json()
      if (data.success) {
        setCategories(data.categories)
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    }
  }, [])

  // FAQ取得
  const fetchFAQs = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/faq', { credentials: 'include' })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'FAQの取得に失敗しました')
      }
      setFaqs(data.faqs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'FAQの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
    fetchFAQs()
  }, [fetchCategories, fetchFAQs])

  // FAQ作成・更新
  const handleSubmitFAQ = async () => {
    if (!faqForm.categoryId || !faqForm.question || !faqForm.answer) {
      alert('カテゴリ、質問、回答は必須です')
      return
    }

    setIsSubmittingFAQ(true)
    try {
      const url = editingFAQ ? `/api/admin/faq/${editingFAQ.id}` : '/api/admin/faq'
      const method = editingFAQ ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(faqForm),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'FAQの保存に失敗しました')
      }

      await fetchFAQs()
      resetFAQForm()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'FAQの保存に失敗しました')
    } finally {
      setIsSubmittingFAQ(false)
    }
  }

  // FAQ削除
  const handleDeleteFAQ = async (faq: FAQ) => {
    if (!confirm(`「${faq.question}」を削除しますか？`)) return

    try {
      const response = await fetch(`/api/admin/faq/${faq.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'FAQの削除に失敗しました')
      }
      await fetchFAQs()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'FAQの削除に失敗しました')
    }
  }

  // FAQ公開/非公開切り替え
  const handleToggleFAQPublished = async (faq: FAQ) => {
    try {
      const response = await fetch(`/api/admin/faq/${faq.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isPublished: !faq.isPublished }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error)
      }
      await fetchFAQs()
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新に失敗しました')
    }
  }

  // カテゴリ作成・更新
  const handleSubmitCategory = async () => {
    if (!categoryForm.name) {
      alert('カテゴリ名は必須です')
      return
    }

    setIsSubmittingCategory(true)
    try {
      const url = editingCategory ? `/api/admin/faq/categories/${editingCategory.id}` : '/api/admin/faq/categories'
      const method = editingCategory ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(categoryForm),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'カテゴリの保存に失敗しました')
      }

      await fetchCategories()
      resetCategoryForm()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'カテゴリの保存に失敗しました')
    } finally {
      setIsSubmittingCategory(false)
    }
  }

  // カテゴリ削除
  const handleDeleteCategory = async (category: FAQCategory) => {
    if (!confirm(`「${category.name}」カテゴリを削除しますか？\n※ このカテゴリ内のFAQがある場合は削除できません`)) return

    try {
      const response = await fetch(`/api/admin/faq/categories/${category.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'カテゴリの削除に失敗しました')
      }
      await fetchCategories()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'カテゴリの削除に失敗しました')
    }
  }

  // フォームリセット
  const resetFAQForm = () => {
    setShowFAQForm(false)
    setEditingFAQ(null)
    setFaqForm({ categoryId: '', question: '', answer: '', order: 0, isPublished: true })
  }

  const resetCategoryForm = () => {
    setShowCategoryForm(false)
    setEditingCategory(null)
    setCategoryForm({ name: '', description: '', order: 0, isActive: true })
  }

  // FAQ編集開始
  const startEditFAQ = (faq: FAQ) => {
    setEditingFAQ(faq)
    setFaqForm({
      categoryId: faq.categoryId,
      question: faq.question,
      answer: faq.answer,
      order: faq.order,
      isPublished: faq.isPublished,
    })
    setShowFAQForm(true)
  }

  // カテゴリ編集開始
  const startEditCategory = (category: FAQCategory) => {
    setEditingCategory(category)
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      order: category.order,
      isActive: category.isActive,
    })
    setShowCategoryForm(true)
  }

  const inputClassName = 'w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500'

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 min-w-0 md:ml-64">
        <PageHeader title="FAQ管理" />
        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">FAQ管理</h2>
                <p className="text-slate-600">よくある質問の追加・編集・削除</p>
              </div>
            </div>

            {/* タブ */}
            <div className="flex gap-2 border-b border-slate-200">
              <button
                onClick={() => setActiveTab('faqs')}
                className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px cursor-pointer ${
                  activeTab === 'faqs'
                    ? 'border-slate-800 text-slate-800'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                FAQ一覧
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px cursor-pointer ${
                  activeTab === 'categories'
                    ? 'border-slate-800 text-slate-800'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                カテゴリ管理
              </button>
            </div>

            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-4">
                  <p role="alert" className="text-sm text-red-600">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* FAQ一覧タブ */}
            {activeTab === 'faqs' && (
              <>
                {/* FAQ作成・編集フォーム */}
                {showFAQForm && (
                  <Card>
                    <CardHeader>
                      <CardTitle>{editingFAQ ? 'FAQ編集' : '新規FAQ作成'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">カテゴリ *</label>
                          <select
                            value={faqForm.categoryId}
                            onChange={(e) => setFaqForm({ ...faqForm, categoryId: e.target.value })}
                            className={inputClassName}
                          >
                            <option value="">選択してください</option>
                            {categories.filter(c => c.isActive).map((cat) => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">表示順</label>
                          <input
                            type="number"
                            value={faqForm.order}
                            onChange={(e) => setFaqForm({ ...faqForm, order: parseInt(e.target.value) || 0 })}
                            className={inputClassName}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">質問 *</label>
                        <input
                          type="text"
                          value={faqForm.question}
                          onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                          className={inputClassName}
                          placeholder="例: パスワードを忘れた場合はどうすればよいですか？"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">回答 *</label>
                        <textarea
                          value={faqForm.answer}
                          onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                          className={inputClassName}
                          rows={5}
                          placeholder="回答を入力してください"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isPublished"
                          checked={faqForm.isPublished}
                          onChange={(e) => setFaqForm({ ...faqForm, isPublished: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <label htmlFor="isPublished" className="text-sm text-slate-700">公開する</label>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSubmitFAQ} disabled={isSubmittingFAQ}>
                          {isSubmittingFAQ ? <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" /> : <Save className="h-4 w-4 mr-2" aria-hidden="true" />}
                          {editingFAQ ? '更新' : '作成'}
                        </Button>
                        <Button variant="outline" onClick={resetFAQForm}>
                          <X className="h-4 w-4 mr-2" aria-hidden="true" />キャンセル
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* FAQ一覧 */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>FAQ一覧</CardTitle>
                      <Button onClick={() => { resetFAQForm(); setShowFAQForm(true); }}>
                        <Plus className="h-4 w-4 mr-2" aria-hidden="true" />新規FAQ作成
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-hidden="true" />
                      </div>
                    ) : faqs.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-8">FAQがまだありません</p>
                    ) : (
                      <div className="divide-y divide-slate-200">
                        {faqs.map((faq) => (
                          <div key={faq.id} className="py-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline">{faq.category.name}</Badge>
                                  <Badge variant={faq.isPublished ? 'default' : 'secondary'}>
                                    {faq.isPublished ? '公開' : '非公開'}
                                  </Badge>
                                  <span className="text-xs text-slate-400">順序: {faq.order}</span>
                                </div>
                                <p className="font-medium text-slate-800">Q. {faq.question}</p>
                                <p className="text-sm text-slate-600 mt-1 line-clamp-2">{faq.answer}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost" onClick={() => handleToggleFAQPublished(faq)}>
                                  {faq.isPublished ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => startEditFAQ(faq)}>
                                  <Edit className="h-4 w-4" aria-hidden="true" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteFAQ(faq)}>
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* カテゴリ管理タブ */}
            {activeTab === 'categories' && (
              <>
                {/* カテゴリ作成・編集フォーム */}
                {showCategoryForm && (
                  <Card>
                    <CardHeader>
                      <CardTitle>{editingCategory ? 'カテゴリ編集' : '新規カテゴリ作成'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">カテゴリ名 *</label>
                          <input
                            type="text"
                            value={categoryForm.name}
                            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                            className={inputClassName}
                            placeholder="例: アカウントについて"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">表示順</label>
                          <input
                            type="number"
                            value={categoryForm.order}
                            onChange={(e) => setCategoryForm({ ...categoryForm, order: parseInt(e.target.value) || 0 })}
                            className={inputClassName}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">説明（任意）</label>
                        <input
                          type="text"
                          value={categoryForm.description}
                          onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                          className={inputClassName}
                          placeholder="カテゴリの説明"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isActive"
                          checked={categoryForm.isActive}
                          onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <label htmlFor="isActive" className="text-sm text-slate-700">有効にする</label>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSubmitCategory} disabled={isSubmittingCategory}>
                          {isSubmittingCategory ? <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" /> : <Save className="h-4 w-4 mr-2" aria-hidden="true" />}
                          {editingCategory ? '更新' : '作成'}
                        </Button>
                        <Button variant="outline" onClick={resetCategoryForm}>
                          <X className="h-4 w-4 mr-2" aria-hidden="true" />キャンセル
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* カテゴリ一覧 */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>カテゴリ一覧</CardTitle>
                      <Button onClick={() => { resetCategoryForm(); setShowCategoryForm(true); }}>
                        <FolderPlus className="h-4 w-4 mr-2" aria-hidden="true" />新規カテゴリ作成
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {categories.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-8">カテゴリがまだありません</p>
                    ) : (
                      <div className="divide-y divide-slate-200">
                        {categories.map((category) => (
                          <div key={category.id} className="py-4 flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-slate-800">{category.name}</p>
                                <Badge variant={category.isActive ? 'default' : 'secondary'}>
                                  {category.isActive ? '有効' : '無効'}
                                </Badge>
                                <span className="text-xs text-slate-400">順序: {category.order}</span>
                                <span className="text-xs text-slate-400">FAQ数: {category._count?.faqs || 0}</span>
                              </div>
                              {category.description && (
                                <p className="text-sm text-slate-500 mt-1">{category.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="ghost" onClick={() => startEditCategory(category)}>
                                <Edit className="h-4 w-4" aria-hidden="true" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteCategory(category)}>
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function AdminFAQPage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <AdminFAQPageContent />
    </ProtectedRoute>
  )
}

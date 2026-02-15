'use client'

import { useEffect, useState, useCallback } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, ChevronDown, ChevronUp, Loader2, HelpCircle, Send } from 'lucide-react'
import Link from 'next/link'

interface FAQ {
  id: string
  question: string
  answer: string
  updatedAt: string
}

interface FAQCategory {
  id: string
  name: string
  description: string | null
  faqs: FAQ[]
}

function FAQPageContent() {
  const [categories, setCategories] = useState<FAQCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFAQs, setExpandedFAQs] = useState<Set<string>>(new Set())
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // 検索のデバウンス処理
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchFAQs = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (debouncedSearch) {
        params.set('search', debouncedSearch)
      }

      const response = await fetch(`/api/faq?${params.toString()}`, {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'FAQの取得に失敗しました')
      }

      setCategories(data.categories)
    } catch (err) {
      console.error('Failed to fetch FAQs:', err)
      setError(err instanceof Error ? err.message : 'FAQの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [debouncedSearch])

  useEffect(() => {
    fetchFAQs()
  }, [fetchFAQs])

  const toggleFAQ = (faqId: string) => {
    setExpandedFAQs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(faqId)) {
        newSet.delete(faqId)
      } else {
        newSet.add(faqId)
      }
      return newSet
    })
  }

  const totalFAQs = categories.reduce((sum, cat) => sum + cat.faqs.length, 0)

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 min-w-0 md:ml-64">
        <PageHeader title="よくある質問" />

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* ヘッダー */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900">よくある質問（FAQ）</h2>
              <p className="text-slate-600 mt-1">
                お困りのことがあれば、まずはこちらをご確認ください
              </p>
            </div>

            {/* 検索ボックス */}
            <Card>
              <CardContent className="py-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="キーワードで検索…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 text-lg"
                  />
                </div>
                {debouncedSearch && (
                  <p className="text-sm text-slate-500 mt-2">
                    「{debouncedSearch}」の検索結果: {totalFAQs}件
                  </p>
                )}
              </CardContent>
            </Card>

            {/* エラー表示 */}
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-4">
                  <p className="text-sm text-red-600">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* FAQ一覧 */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center text-slate-500">
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" aria-hidden="true" />
                  読み込み中...
                </div>
              </div>
            ) : categories.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <HelpCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" aria-hidden="true" />
                  <p className="text-slate-500">
                    {debouncedSearch
                      ? '検索結果が見つかりませんでした'
                      : 'FAQがまだ登録されていません'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {categories.map((category) => (
                  <Card key={category.id}>
                    <CardHeader>
                      <CardTitle className="text-lg text-slate-800">
                        {category.name}
                      </CardTitle>
                      {category.description && (
                        <p className="text-sm text-slate-500">{category.description}</p>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="divide-y divide-slate-200">
                        {category.faqs.map((faq) => (
                          <div key={faq.id} className="py-3">
                            <button
                              onClick={() => toggleFAQ(faq.id)}
                              className="w-full flex items-center justify-between text-left hover:bg-slate-50 rounded-lg p-2 -m-2 transition-colors"
                            >
                              <span className="font-medium text-slate-700 pr-4">
                                Q. {faq.question}
                              </span>
                              {expandedFAQs.has(faq.id) ? (
                                <ChevronUp className="h-5 w-5 text-slate-400 flex-shrink-0" aria-hidden="true" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-slate-400 flex-shrink-0" aria-hidden="true" />
                              )}
                            </button>
                            {expandedFAQs.has(faq.id) && (
                              <div className="mt-3 pl-4 border-l-2 border-slate-200">
                                <p className="text-slate-600 whitespace-pre-wrap">
                                  {faq.answer}
                                </p>
                                <p className="text-xs text-slate-400 mt-2">
                                  最終更新: {new Date(faq.updatedAt).toLocaleDateString('ja-JP')}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* お問い合わせへの導線 */}
            <Card className="bg-slate-800 text-white">
              <CardContent className="py-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">お探しの回答が見つかりませんか？</h3>
                    <p className="text-slate-300 text-sm mt-1">
                      お気軽にお問い合わせください。担当者が対応いたします。
                    </p>
                  </div>
                  <Link href="/dashboard/support/contact">
                    <Button variant="secondary" className="whitespace-nowrap">
                      <Send className="h-4 w-4 mr-2" aria-hidden="true" />
                      お問い合わせ
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function FAQPage() {
  return (
    <ProtectedRoute requiredRoles={['member', 'fp', 'manager', 'admin']}>
      <FAQPageContent />
    </ProtectedRoute>
  )
}

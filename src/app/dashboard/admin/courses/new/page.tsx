'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save } from 'lucide-react'

export default function NewCoursePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'BASIC' as 'BASIC' | 'ADVANCED' | 'PRACTICAL',
    level: 'BEGINNER' as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
    isLocked: false,
    isPublished: true,
    order: 0
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      alert('コースタイトルを入力してください')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'コースの作成に失敗しました')
      }

      const data = await response.json()
      alert('コースを作成しました')
      router.push(`/dashboard/admin/courses/${data.course.id}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto p-6 space-y-6 max-w-4xl">
        {/* 戻るボタン */}
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/admin/courses')}
          className="bg-white hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          コース一覧に戻る
        </Button>

        {/* フォーム */}
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b">
            <CardTitle className="text-2xl">新規コース作成</CardTitle>
            <CardDescription>新しい教育コンテンツのコースを作成します</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* タイトル */}
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-slate-700 mb-2">
                  コースタイトル <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 所得を増やすための基礎知識"
                  required
                />
              </div>

              {/* 説明 */}
              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-slate-700 mb-2">
                  説明
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="コースの概要や学習内容を入力してください"
                />
              </div>

              {/* カテゴリとレベル */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="category" className="block text-sm font-semibold text-slate-700 mb-2">
                    カテゴリ <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="BASIC">基礎編</option>
                    <option value="PRACTICAL">実践編</option>
                    <option value="ADVANCED">応用編</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="level" className="block text-sm font-semibold text-slate-700 mb-2">
                    レベル <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="level"
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="BEGINNER">初級</option>
                    <option value="INTERMEDIATE">中級</option>
                    <option value="ADVANCED">上級</option>
                  </select>
                </div>
              </div>

              {/* 並び順 */}
              <div>
                <label htmlFor="order" className="block text-sm font-semibold text-slate-700 mb-2">
                  並び順
                </label>
                <input
                  id="order"
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  min="0"
                />
                <p className="text-sm text-slate-500 mt-1">数値が小さいほど上位に表示されます</p>
              </div>

              {/* オプション */}
              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center space-x-3">
                  <input
                    id="isLocked"
                    type="checkbox"
                    checked={formData.isLocked}
                    onChange={(e) => setFormData({ ...formData, isLocked: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="isLocked" className="text-sm font-medium text-slate-700">
                    FPエイド以上のユーザーのみ閲覧可能にする
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    id="isPublished"
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="isPublished" className="text-sm font-medium text-slate-700">
                    公開する
                  </label>
                </div>
              </div>

              {/* ボタン */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/admin/courses')}
                  disabled={loading}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? '作成中...' : 'コースを作成'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

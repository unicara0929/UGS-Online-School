'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Video } from 'lucide-react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

interface SearchResult {
  lessonId: string
  courseId: string
  lessonTitle: string
  courseTitle: string
  thumbnailUrl: string | null
  duration: number
}

// 動画にヒットしやすいおすすめワード
const SUGGESTED_KEYWORDS = [
  'NISA',
  'iDeCo',
  '保険',
  'ライフプラン',
  '確定申告',
  'セールス',
  'ロープレ',
  'マインドセット',
  '副業',
  'DISC',
  'ヒアリング',
  'マネジメント',
  '不動産',
  'ふるさと納税',
  '投資信託',
]

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function VideoSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // 外側クリックで閉じる
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // debounce付き検索
  const search = useCallback(async (searchQuery: string) => {
    // 前のリクエストをキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    if (!searchQuery.trim()) {
      setResults([])
      setHasSearched(false)
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/dashboard/video-search?q=${encodeURIComponent(searchQuery.trim())}`,
        { credentials: 'include', signal: controller.signal }
      )
      const data = await response.json()
      if (data.success) {
        setResults(data.results)
        setHasSearched(true)
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Search error:', error)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      search(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, search])

  const handleKeywordClick = (keyword: string) => {
    setQuery(keyword)
    setIsOpen(true)
    inputRef.current?.focus()
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setHasSearched(false)
    inputRef.current?.focus()
  }

  return (
    <section ref={containerRef} className="relative">
      {/* 検索バー */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="動画を検索..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-10 h-11 text-sm sm:text-base rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* おすすめ検索ワード */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2.5">
        {SUGGESTED_KEYWORDS.map((keyword) => (
          <button
            key={keyword}
            onClick={() => handleKeywordClick(keyword)}
            className="text-[10px] sm:text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
          >
            {keyword}
          </button>
        ))}
      </div>

      {/* 検索結果ドロップダウン */}
      {isOpen && query.trim() && (
        <div className="absolute z-50 top-12 left-0 right-0 bg-white rounded-xl shadow-lg border border-slate-200 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-24 h-14 bg-slate-200 rounded flex-shrink-0" />
                  <div className="flex-1 space-y-1.5 py-1">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result) => (
                <Link
                  key={result.lessonId}
                  href={`/dashboard/learn/${result.courseId}?lesson=${result.lessonId}`}
                  onClick={() => setIsOpen(false)}
                  className="flex gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors"
                >
                  {/* サムネイル */}
                  <div className="relative w-24 h-14 flex-shrink-0 rounded overflow-hidden bg-slate-800">
                    {result.thumbnailUrl ? (
                      <img
                        src={result.thumbnailUrl}
                        alt={result.lessonTitle}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="h-5 w-5 text-slate-400" aria-hidden="true" />
                      </div>
                    )}
                    <div className="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-[9px] px-1 py-0.5 rounded">
                      {formatDuration(result.duration)}
                    </div>
                  </div>
                  {/* テキスト */}
                  <div className="flex-1 min-w-0 py-0.5">
                    <p className="text-sm font-medium text-slate-900 line-clamp-1">{result.lessonTitle}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{result.courseTitle}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : hasSearched ? (
            <div className="p-6 text-center text-sm text-slate-500">
              「{query}」に一致する動画が見つかりませんでした
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}

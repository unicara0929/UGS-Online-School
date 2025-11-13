'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center p-8 max-w-md">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">エラーが発生しました</h1>
        <p className="text-slate-600 mb-6">
          アプリケーションでエラーが発生しました。ページをリロードしてください。
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={reset} variant="default">
            再試行
          </Button>
          <Button onClick={() => window.location.href = '/'} variant="outline">
            ホームに戻る
          </Button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-slate-500 mb-2">エラー詳細</summary>
            <pre className="mt-2 p-4 bg-slate-100 rounded text-xs overflow-auto">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}


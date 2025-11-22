'use client'

import { Image as ImageIcon, X } from 'lucide-react'
import { THUMBNAIL_CONFIG } from '@/constants/event'

interface ThumbnailUploaderProps {
  preview: string | null
  onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: () => void
}

export function ThumbnailUploader({ preview, onSelect, onRemove }: ThumbnailUploaderProps) {
  return (
    <div className="md:col-span-2">
      <label className="block text-sm font-medium text-slate-700 mb-1">
        サムネイル画像
      </label>
      <p className="text-xs text-slate-500 mb-2">
        推奨サイズ: {THUMBNAIL_CONFIG.recommendedSize} ｜ 最大5MB ｜ JPEG、PNG、WebP
      </p>

      {preview ? (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="サムネイルプレビュー"
            className="w-full max-w-md h-auto rounded-lg border border-slate-300"
          />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full max-w-md h-48 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <ImageIcon className="h-10 w-10 text-slate-400 mb-3" />
            <p className="mb-2 text-sm text-slate-500">
              <span className="font-semibold">クリックしてアップロード</span>
            </p>
            <p className="text-xs text-slate-500">JPEG、PNG、WebP（最大5MB）</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept={THUMBNAIL_CONFIG.allowedTypes.join(',')}
            onChange={onSelect}
          />
        </label>
      )}
    </div>
  )
}

'use client'

import Link from 'next/link'
import { Video } from 'lucide-react'

interface VideoCardProps {
  thumbnailUrl: string | null
  title: string
  subtitle: string
  href: string
  overlay?: React.ReactNode
  footer?: React.ReactNode
}

export function VideoCard({ thumbnailUrl, title, subtitle, href, overlay, footer }: VideoCardProps) {
  return (
    <Link
      href={href}
      className="flex-shrink-0 w-[200px] sm:w-[240px] snap-start group"
    >
      <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-800">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
            <Video className="h-8 w-8 text-slate-400" aria-hidden="true" />
          </div>
        )}
        {overlay}
      </div>
      <div className="mt-2">
        <h4 className="text-xs sm:text-sm font-medium text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {title}
        </h4>
        <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 line-clamp-1">{subtitle}</p>
        {footer}
      </div>
    </Link>
  )
}

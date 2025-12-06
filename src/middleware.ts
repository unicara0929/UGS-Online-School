import { NextRequest, NextResponse } from 'next/server'

// シンプルなインメモリRate Limiter
// 本番環境ではRedis/Upstashベースのソリューションを推奨
const rateLimitMap = new Map<string, { count: number; lastReset: number }>()

// Rate Limit設定
const RATE_LIMIT_WINDOW = 60 * 1000 // 1分
const MAX_REQUESTS_PER_WINDOW = 100 // 1分あたり100リクエスト

// 認証関連のエンドポイント（より厳しい制限）
const AUTH_ENDPOINTS = [
  '/api/auth/reset-password',
  '/api/pending-users',
  '/api/verify-email',
]
const AUTH_MAX_REQUESTS = 10 // 1分あたり10リクエスト

function getRateLimitKey(ip: string, pathname: string): string {
  // 認証エンドポイントは別のキーで管理
  const isAuthEndpoint = AUTH_ENDPOINTS.some(ep => pathname.startsWith(ep))
  return isAuthEndpoint ? `auth:${ip}` : `general:${ip}`
}

function getMaxRequests(pathname: string): number {
  const isAuthEndpoint = AUTH_ENDPOINTS.some(ep => pathname.startsWith(ep))
  return isAuthEndpoint ? AUTH_MAX_REQUESTS : MAX_REQUESTS_PER_WINDOW
}

function isRateLimited(key: string, maxRequests: number): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now - entry.lastReset > RATE_LIMIT_WINDOW) {
    // 新しいウィンドウを開始
    rateLimitMap.set(key, { count: 1, lastReset: now })
    return false
  }

  if (entry.count >= maxRequests) {
    return true
  }

  entry.count++
  return false
}

// 古いエントリーをクリーンアップ（メモリリーク防止）
function cleanupOldEntries() {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now - entry.lastReset > RATE_LIMIT_WINDOW * 2) {
      rateLimitMap.delete(key)
    }
  }
}

// 定期的にクリーンアップ
setInterval(cleanupOldEntries, RATE_LIMIT_WINDOW)

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // APIルートのみRate Limitを適用
  if (!pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // 静的アセットや内部APIはスキップ
  if (pathname.startsWith('/api/_next') || pathname.includes('favicon')) {
    return NextResponse.next()
  }

  // IPアドレスを取得
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') ||
             'unknown'

  const key = getRateLimitKey(ip, pathname)
  const maxRequests = getMaxRequests(pathname)

  if (isRateLimited(key, maxRequests)) {
    console.warn(`Rate limit exceeded for ${key}`)
    return NextResponse.json(
      {
        error: 'Too many requests. Please try again later.',
        message: 'リクエストが多すぎます。しばらくしてから再度お試しください。'
      },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
        }
      }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}

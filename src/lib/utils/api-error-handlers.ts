/**
 * APIルート用の共通エラーハンドリング関数
 * エラーレスポンスの統一と可読性の向上
 */

import { NextResponse } from 'next/server'

/**
 * エラーレスポンスを作成
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  details?: string
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      ...(details && { details }),
    },
    { status }
  )
}

/**
 * バリデーションエラーレスポンスを作成
 */
export function createValidationErrorResponse(
  message: string = 'リクエストの検証に失敗しました'
): NextResponse {
  return createErrorResponse(message, 400)
}

/**
 * 認証エラーレスポンスを作成
 */
export function createAuthErrorResponse(
  message: string = '認証が必要です'
): NextResponse {
  return createErrorResponse(message, 401)
}

/**
 * 権限エラーレスポンスを作成
 */
export function createForbiddenErrorResponse(
  message: string = 'この操作を実行する権限がありません'
): NextResponse {
  return createErrorResponse(message, 403)
}

/**
 * 見つからないエラーレスポンスを作成
 */
export function createNotFoundErrorResponse(
  message: string = 'リソースが見つかりません'
): NextResponse {
  return createErrorResponse(message, 404)
}

/**
 * 競合エラーレスポンスを作成
 */
export function createConflictErrorResponse(
  message: string = 'リソースが既に存在します'
): NextResponse {
  return createErrorResponse(message, 409)
}

/**
 * サーバーエラーレスポンスを作成
 */
export function createServerErrorResponse(
  error: unknown,
  message: string = 'サーバーエラーが発生しました'
): NextResponse {
  const errorMessage = error instanceof Error ? error.message : String(error)
  console.error('Server error:', error)
  
  return NextResponse.json(
    {
      error: message,
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    },
    { status: 500 }
  )
}

/**
 * Prismaエラーを処理
 */
export function handlePrismaError(error: any): NextResponse {
  // ユニーク制約違反
  if (error.code === 'P2002') {
    const target = error.meta?.target
    if (Array.isArray(target) && target.includes('email')) {
      return createConflictErrorResponse('このメールアドレスは既に登録されています')
    }
    return createConflictErrorResponse('このリソースは既に存在します')
  }

  // レコードが見つからない
  if (error.code === 'P2025') {
    return createNotFoundErrorResponse('リソースが見つかりません')
  }

  // その他のPrismaエラー
  return createServerErrorResponse(error, 'データベースエラーが発生しました')
}


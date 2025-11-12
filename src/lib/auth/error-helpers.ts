/**
 * 認証関連のエラーヘルパー関数
 * エラーの種類を判定するためのユーティリティ関数
 */

/**
 * データベース接続エラーまたはタイムアウトエラーかどうかを判定
 */
export function isConnectionOrTimeoutError(error: unknown): boolean {
  if (!error) return false
  
  const errorObj = error as any
  const errorMessage = String(errorObj.message || '')
  
  return (
    errorObj.constructor?.name === 'PrismaClientInitializationError' ||
    errorObj.name === 'TimeoutError' ||
    errorObj.name === 'AbortError' ||
    errorMessage.includes("Can't reach database server") ||
    errorMessage.includes('database server') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('Timeout') ||
    errorMessage.includes('signal timed out')
  )
}

/**
 * 404エラー（ユーザーが見つからない）かどうかを判定
 */
export function isNotFoundError(error: unknown): boolean {
  if (!error) return false
  
  const errorObj = error as any
  const errorMessage = String(errorObj.message || errorObj || '')
  const errorString = String(errorObj)
  
  return (
    errorMessage.includes('404') ||
    errorMessage.includes('見つかりません') ||
    errorMessage.includes('not found') ||
    errorString.includes('404') ||
    (errorObj instanceof Error && (
      errorObj.message.includes('404') || 
      errorObj.message.includes('見つかりません')
    ))
  )
}

/**
 * 409エラー（既に存在する）かどうかを判定
 */
export function isConflictError(error: unknown): boolean {
  if (!error) return false
  
  const errorObj = error as any
  const errorMessage = String(errorObj.message || '')
  
  return (
    errorMessage.includes('409') ||
    errorMessage.includes('既に登録') ||
    errorObj.code === 'P2002' // Prisma unique constraint error
  )
}


/**
 * クライアント側のAPI呼び出しヘルパー関数
 * タイムアウト処理やエラーハンドリングを統一
 */

/**
 * タイムアウト付きfetch
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = 10000
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * APIレスポンスを処理し、エラーハンドリングを統一
 */
export async function handleApiResponse<T>(
  response: Response
): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `API request failed (${response.status})`)
  }

  return await response.json()
}

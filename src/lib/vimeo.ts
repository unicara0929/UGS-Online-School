/**
 * Vimeo関連のユーティリティ関数
 */

/**
 * Vimeo URLからVideo IDを抽出する
 * @param urlOrId VimeoのURLまたはVideo ID
 * @returns Video ID（数値文字列）またはnull
 */
export function extractVimeoVideoId(urlOrId: string): string | null {
  if (!urlOrId) return null

  // 既に数値のみの場合はそのまま返す
  if (/^\d+$/.test(urlOrId)) {
    return urlOrId
  }

  // Vimeo URLからVideo IDを抽出
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ]

  for (const pattern of patterns) {
    const match = urlOrId.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

/**
 * Vimeo URLからプライベートリンク用ハッシュを抽出する
 * @param url VimeoのURL
 * @returns ハッシュ文字列またはnull
 *
 * 対応形式:
 * - vimeo.com/123456789/abc123def (パス形式)
 * - vimeo.com/123456789?h=abc123def (クエリパラメータ形式)
 * - player.vimeo.com/video/123456789?h=abc123def (プレーヤーURL形式)
 */
export function extractVimeoHash(url: string): string | null {
  if (!url) return null

  // 数値のみの場合はハッシュなし
  if (/^\d+$/.test(url)) {
    return null
  }

  // パス形式: vimeo.com/123456789/abc123def
  const pathHashMatch = url.match(/vimeo\.com\/\d+\/([a-zA-Z0-9]+)/)
  if (pathHashMatch && pathHashMatch[1]) {
    return pathHashMatch[1]
  }

  // クエリパラメータ形式: ?h=abc123def
  const queryHashMatch = url.match(/[?&]h=([a-zA-Z0-9]+)/)
  if (queryHashMatch && queryHashMatch[1]) {
    return queryHashMatch[1]
  }

  return null
}

/**
 * Vimeo oEmbed APIのレスポンス型
 */
interface VimeoOEmbedResponse {
  type: string
  version: string
  provider_name: string
  provider_url: string
  title: string
  author_name: string
  author_url: string
  is_plus: string
  account_type: string
  html: string
  width: number
  height: number
  duration: number // 動画の長さ（秒）
  description: string
  thumbnail_url: string
  thumbnail_width: number
  thumbnail_height: number
  thumbnail_url_with_play_button: string
  upload_date: string
  video_id: number
  uri: string
}

/**
 * Vimeo APIのレスポンス型
 */
interface VimeoAPIResponse {
  uri: string
  name: string
  description: string | null
  duration: number
  pictures: {
    sizes: Array<{
      width: number
      height: number
      link: string
    }>
  }
}

/**
 * Vimeo APIから動画情報を取得する（認証付き）
 * 非公開動画にも対応
 * @param videoId Vimeo Video ID
 * @returns 動画情報（タイトル、長さなど）またはnull
 */
export async function fetchVimeoVideoInfo(videoId: string): Promise<{
  duration: number
  title: string
  description: string
  thumbnailUrl: string
} | null> {
  const accessToken = process.env.VIMEO_ACCESS_TOKEN

  // アクセストークンがある場合はVimeo APIを使用
  if (accessToken) {
    try {
      const url = `https://api.vimeo.com/videos/${videoId}`

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.vimeo.*+json;version=3.4',
        },
        cache: 'no-store' // 常に最新の情報を取得
      })

      if (!response.ok) {
        console.error(`[VIMEO API] Failed to fetch video info: ${response.status}`)
        // APIが失敗した場合はoEmbedにフォールバック
        return fetchVimeoVideoInfoViaOEmbed(videoId)
      }

      const data: VimeoAPIResponse = await response.json()

      // サムネイルURLを取得（最大サイズ）
      const thumbnailUrl = data.pictures?.sizes?.length > 0
        ? data.pictures.sizes[data.pictures.sizes.length - 1].link
        : ''

      return {
        duration: data.duration, // 秒単位
        title: data.name,
        description: data.description || '',
        thumbnailUrl,
      }
    } catch (error) {
      console.error('[VIMEO API] Error fetching video info:', error)
      // エラーの場合はoEmbedにフォールバック
      return fetchVimeoVideoInfoViaOEmbed(videoId)
    }
  }

  // アクセストークンがない場合はoEmbedを使用
  return fetchVimeoVideoInfoViaOEmbed(videoId)
}

/**
 * Vimeo oEmbed APIから動画情報を取得する（公開動画のみ）
 * @param videoId Vimeo Video ID
 * @returns 動画情報またはnull
 */
async function fetchVimeoVideoInfoViaOEmbed(videoId: string): Promise<{
  duration: number
  title: string
  description: string
  thumbnailUrl: string
} | null> {
  try {
    const url = `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 } // 1時間キャッシュ
    })

    if (!response.ok) {
      console.error(`[VIMEO oEmbed] Failed to fetch video info: ${response.status}`)
      return null
    }

    const data: VimeoOEmbedResponse = await response.json()

    return {
      duration: data.duration,
      title: data.title,
      description: data.description || '',
      thumbnailUrl: data.thumbnail_url,
    }
  } catch (error) {
    console.error('[VIMEO oEmbed] Error fetching video info:', error)
    return null
  }
}

/**
 * Vimeo URLを正規化する（プレーヤーURL形式に変換）
 * プライベートリンクのハッシュも保持します
 * @param urlOrId VimeoのURLまたはVideo ID
 * @returns 正規化されたプレーヤーURL（ハッシュ付きの場合は ?h=xxx 形式）
 */
export function normalizeVimeoUrl(urlOrId: string): string | null {
  const videoId = extractVimeoVideoId(urlOrId)
  if (!videoId) return null

  const hash = extractVimeoHash(urlOrId)
  if (hash) {
    return `https://player.vimeo.com/video/${videoId}?h=${hash}`
  }

  return `https://player.vimeo.com/video/${videoId}`
}

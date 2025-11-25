/**
 * ファイルバリデーションユーティリティ
 */

export const IMAGE_VALIDATION = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'],
  errorMessages: {
    size: 'ファイルサイズは10MB以下にしてください',
    type: '画像ファイル（JPEG、PNG、WebP、GIF）のみアップロード可能です',
  },
} as const

export interface FileValidationResult {
  valid: boolean
  error?: string
}

/**
 * 画像ファイルのバリデーション
 */
export function validateImageFile(file: File): FileValidationResult {
  if (file.size > IMAGE_VALIDATION.maxSize) {
    return { valid: false, error: IMAGE_VALIDATION.errorMessages.size }
  }

  if (!IMAGE_VALIDATION.allowedTypes.includes(file.type as any)) {
    return { valid: false, error: IMAGE_VALIDATION.errorMessages.type }
  }

  return { valid: true }
}

/**
 * ファイルサイズを人間が読みやすい形式に変換
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

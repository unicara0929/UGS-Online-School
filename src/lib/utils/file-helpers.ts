/**
 * ファイル関連のユーティリティ関数
 * ファイルバリデーションなどで使用
 */

/**
 * ファイルバリデーション結果
 */
export interface FileValidationResult {
  valid: boolean
  error?: string
}

/**
 * ファイルをバリデーション
 */
export function validateFile(file: File): FileValidationResult {
  // ファイルサイズチェック（10MB以下）
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'ファイルサイズは10MB以下にしてください',
    }
  }

  // ファイルタイプチェック
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'JPEG、PNG、PDFファイルのみアップロード可能です',
    }
  }

  return { valid: true }
}

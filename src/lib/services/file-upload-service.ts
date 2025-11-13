/**
 * ファイルアップロード関連のサービス関数
 * ファイルアップロード処理のロジックを分離して可読性を向上
 */

import { authenticatedFetch } from '@/lib/utils/api-client'
import { validateFile } from '@/lib/utils/file-helpers'

/**
 * ファイルアップロード結果
 */
export interface FileUploadResult {
  success: boolean
  fileUrl?: string
  error?: string
}

/**
 * ID証明書をアップロード
 */
export async function uploadIdDocument(
  file: File,
  userId: string
): Promise<FileUploadResult> {
  // ファイルバリデーション
  const validation = validateFile(file)
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'ファイルのバリデーションに失敗しました',
    }
  }

  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('userId', userId)

    const response = await authenticatedFetch('/api/user/upload-id-document', {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()

    if (!response.ok) {
      if (data.errorCode === 'BUCKET_NOT_FOUND') {
        return {
          success: false,
          error: 'ストレージバケットが設定されていません。管理者にお問い合わせください。',
        }
      }
      return {
        success: false,
        error: data.error || 'アップロードに失敗しました',
      }
    }

    return {
      success: true,
      fileUrl: data.fileUrl,
    }
  } catch (error: any) {
    console.error('Upload error:', error)
    return {
      success: false,
      error: error.message || 'アップロードに失敗しました',
    }
  }
}

/**
 * 既存のアプリケーションからID証明書URLを取得
 */
export async function fetchExistingIdDocumentUrl(
  userId: string,
  idDocumentUrl: string
): Promise<string | null> {
  try {
    const urlResponse = await authenticatedFetch(
      `/api/user/get-id-document-url?userId=${userId}&filePath=${encodeURIComponent(idDocumentUrl)}`
    )
    
    if (urlResponse.ok) {
      const urlData = await urlResponse.json()
      return urlData.fileUrl || null
    }
    
    return null
  } catch (error) {
    console.error('Error fetching existing ID document URL:', error)
    return null
  }
}


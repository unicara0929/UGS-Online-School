/**
 * 紹介コード生成サービス
 */

import { prisma } from '@/lib/prisma'

/**
 * ユニークな紹介コードを生成
 * @param maxAttempts 最大試行回数（デフォルト: 10）
 * @returns ユニークな紹介コード
 */
export async function generateUniqueReferralCode(maxAttempts: number = 10): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 0, O, I, 1を除外
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // 8文字のランダム文字列を生成
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    // ユニーク性を確認
    const existing = await prisma.user.findUnique({
      where: { referralCode: code }
    })

    if (!existing) {
      return code
    }
  }

  // 最大試行回数に達した場合は、タイムスタンプを含むコードを生成
  const timestamp = Date.now().toString(36).toUpperCase()
  return `REF${timestamp.substring(timestamp.length - 5)}`
}


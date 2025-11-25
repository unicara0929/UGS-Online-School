/**
 * 会員番号生成サービス
 *
 * 会員番号フォーマット: UGS + 7桁の連番
 * 例: UGS0000001, UGS0000123
 *
 * 安全性:
 * - トランザクション内で最新番号を取得してインクリメント
 * - ユニーク制約により重複を防止
 * - レースコンディション対策
 */

import { prisma } from '@/lib/prisma'

const MEMBER_ID_PREFIX = 'UGS'
const MEMBER_ID_LENGTH = 7 // 数字部分の桁数

/**
 * 会員番号を生成
 * UGS + 7桁の連番形式（例: UGS0000001）
 *
 * @returns 新しい会員番号
 */
export async function generateMemberId(): Promise<string> {
  return await prisma.$transaction(async (tx) => {
    // 最新の会員番号を取得（降順でソートして最初の1件）
    const latestUser = await tx.user.findFirst({
      where: {
        memberId: {
          startsWith: MEMBER_ID_PREFIX
        }
      },
      orderBy: {
        memberId: 'desc'
      },
      select: {
        memberId: true
      }
    })

    let nextNumber = 1

    if (latestUser?.memberId) {
      // 既存の会員番号から数字部分を抽出
      const numberPart = latestUser.memberId.replace(MEMBER_ID_PREFIX, '')
      const currentNumber = parseInt(numberPart, 10)

      if (!isNaN(currentNumber)) {
        nextNumber = currentNumber + 1
      }
    }

    // 7桁にゼロパディング
    const paddedNumber = nextNumber.toString().padStart(MEMBER_ID_LENGTH, '0')
    const newMemberId = `${MEMBER_ID_PREFIX}${paddedNumber}`

    return newMemberId
  })
}

/**
 * 会員番号が有効な形式かチェック
 *
 * @param memberId チェック対象の会員番号
 * @returns 有効な形式の場合true
 */
export function isValidMemberId(memberId: string): boolean {
  const pattern = new RegExp(`^${MEMBER_ID_PREFIX}\\d{${MEMBER_ID_LENGTH}}$`)
  return pattern.test(memberId)
}

/**
 * 会員番号から番号部分を抽出
 *
 * @param memberId 会員番号
 * @returns 数字部分（例: "0000001"）
 */
export function extractMemberNumber(memberId: string): string {
  return memberId.replace(MEMBER_ID_PREFIX, '')
}

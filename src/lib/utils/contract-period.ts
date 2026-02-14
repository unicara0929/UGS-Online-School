/**
 * 最低契約期間（6ヶ月）に関する共通ユーティリティ
 */

// 最低契約期間（月数）
const MINIMUM_CONTRACT_MONTHS = 6

/**
 * 契約解除可能日を計算（登録日 + 6ヶ月）
 * @param createdAt ユーザー登録日
 * @returns 契約解除可能日
 */
export function calculateContractEndDate(createdAt: Date): Date {
  const endDate = new Date(createdAt)
  endDate.setMonth(endDate.getMonth() + MINIMUM_CONTRACT_MONTHS)
  return endDate
}

/**
 * 最低契約期間を経過しているかチェック
 * @param createdAt ユーザー登録日
 * @returns 6ヶ月経過している場合true
 */
export function hasPassedMinimumContractPeriod(createdAt: Date): boolean {
  const now = new Date()
  const endDate = calculateContractEndDate(createdAt)
  return now >= endDate
}

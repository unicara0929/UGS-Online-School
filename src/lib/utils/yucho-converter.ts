/**
 * ゆうちょ銀行の記号・番号を支店番号・口座番号に変換するユーティリティ
 *
 * 参考: ゆうちょ銀行の公式変換ルール
 * https://www.jp-bank.japanpost.jp/kojin/sokin/furikomi/kouza/kj_sk_fm_kz_1.html
 */

export interface YuchoConversionResult {
  branchNumber: string // 3桁の支店番号
  accountNumber: string // 7桁の口座番号
  error?: string
}

/**
 * ゆうちょ銀行の記号・番号を支店番号・口座番号に変換
 *
 * @param symbol 記号（5桁）
 * @param number 番号（最大8桁）
 * @returns 変換結果（支店番号3桁 + 口座番号7桁）
 */
export function convertYuchoToStandard(
  symbol: string,
  number: string
): YuchoConversionResult {
  // 入力値の検証
  if (!symbol || !number) {
    return {
      branchNumber: '',
      accountNumber: '',
      error: '記号と番号の両方を入力してください'
    }
  }

  // 記号のバリデーション（5桁の数字）
  const symbolNum = symbol.replace(/[^0-9]/g, '')
  if (symbolNum.length !== 5) {
    return {
      branchNumber: '',
      accountNumber: '',
      error: '記号は5桁の数字で入力してください'
    }
  }

  // 番号のバリデーション（1〜8桁の数字）
  const numberNum = number.replace(/[^0-9]/g, '')
  if (numberNum.length < 1 || numberNum.length > 8) {
    return {
      branchNumber: '',
      accountNumber: '',
      error: '番号は1〜8桁の数字で入力してください'
    }
  }

  // 支店番号の計算
  // 記号の2桁目を使用し、8を付加
  const branchCode = symbolNum.charAt(1)
  const branchNumber = `${branchCode}88`

  // 口座番号の計算
  // 番号の末尾1桁を除いた数字を7桁に整形
  let accountNum = numberNum.slice(0, -1)

  // 7桁に満たない場合は先頭に0を付加
  accountNum = accountNum.padStart(7, '0')

  // 7桁を超える場合はエラー
  if (accountNum.length > 7) {
    return {
      branchNumber: '',
      accountNumber: '',
      error: '番号の形式が正しくありません'
    }
  }

  return {
    branchNumber,
    accountNumber: accountNum
  }
}

/**
 * 記号のバリデーション
 */
export function validateYuchoSymbol(symbol: string): string | null {
  if (!symbol) {
    return '記号を入力してください'
  }

  const symbolNum = symbol.replace(/[^0-9]/g, '')

  if (symbolNum.length !== 5) {
    return '記号は5桁の数字で入力してください（例: 12345）'
  }

  // 記号の範囲チェック（10000〜19999の範囲）
  const symbolInt = parseInt(symbolNum, 10)
  if (symbolInt < 10000 || symbolInt > 19999) {
    return '記号は10000〜19999の範囲で入力してください'
  }

  return null // エラーなし
}

/**
 * 番号のバリデーション
 */
export function validateYuchoNumber(number: string): string | null {
  if (!number) {
    return '番号を入力してください'
  }

  const numberNum = number.replace(/[^0-9]/g, '')

  if (numberNum.length < 1 || numberNum.length > 8) {
    return '番号は1〜8桁の数字で入力してください（例: 12345678）'
  }

  return null // エラーなし
}

/**
 * 変換結果の表示用フォーマット
 */
export function formatConversionResult(result: YuchoConversionResult): string {
  if (result.error) {
    return `エラー: ${result.error}`
  }
  return `支店番号: ${result.branchNumber} / 口座番号: ${result.accountNumber}`
}

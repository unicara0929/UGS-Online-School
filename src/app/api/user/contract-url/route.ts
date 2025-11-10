import { NextRequest, NextResponse } from 'next/server'

/**
 * 業務委託契約書のURLを取得
 * GET /api/user/contract-url
 */
export async function GET(request: NextRequest) {
  try {
    // 環境変数から契約書URLを取得
    // 後でデータベースや設定APIから取得するように変更可能
    const contractUrl = process.env.NEXT_PUBLIC_GMO_SIGN_CONTRACT_URL || null

    return NextResponse.json({
      success: true,
      contractUrl
    })
  } catch (error: any) {
    console.error('Get contract URL error:', error)
    return NextResponse.json(
      { error: '契約書URLの取得に失敗しました' },
      { status: 500 }
    )
  }
}


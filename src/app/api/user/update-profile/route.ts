import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, email, phone, address, bio, attribute, gender, birthDate, prefecture, profileImageUrl } = body || {}

    if (!userId || !name || !email) {
      return NextResponse.json({ error: '必須項目（userId, name, email）が不足しています' }, { status: 400 })
    }

    // ここでは仮実装としてログに記録のみ
    console.log('[PROFILE_UPDATE]', {
      userId,
      name,
      email,
      phone,
      address,
      bio,
      attribute,
      gender,
      birthDate,
      prefecture,
      hasImage: !!profileImageUrl,
      at: new Date().toISOString(),
    })

    // 将来はDB保存やSupabase Storageへのアップロードに差し替え
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('プロフィール更新APIエラー:', error)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

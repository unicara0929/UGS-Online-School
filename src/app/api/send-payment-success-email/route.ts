import { NextResponse } from 'next/server'
import { sendPaymentConfirmationEmail } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const { to, name } = await req.json()

    if (!to || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      )
    }

    // 決済完了メールを送信
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login?email=${encodeURIComponent(to)}`
    
    await sendPaymentConfirmationEmail({
      to: to,
      userName: name,
      amount: 5500, // ¥5,500
      subscriptionId: 'N/A', // セッション情報から取得する場合は後で修正
      loginUrl: loginUrl,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/api-helpers'

/**
 * 請求履歴を取得
 * GET /api/user/subscription/invoices
 * 権限: 認証済みユーザー、自分のデータのみ
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // ユーザーのサブスクリプションを取得
    const subscription = await prisma.subscription.findFirst({
      where: { userId: authUser!.id },
      orderBy: { createdAt: 'desc' }
    })

    if (!subscription || !subscription.stripeCustomerId) {
      return NextResponse.json({
        success: true,
        invoices: []
      })
    }

    // Stripeから請求履歴を取得
    const invoices = await stripe.invoices.list({
      customer: subscription.stripeCustomerId,
      limit: 12, // 直近12件
    })

    const formattedInvoices = invoices.data.map(invoice => ({
      id: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      paidAt: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : null,
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
      invoicePdf: invoice.invoice_pdf,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
      periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
    }))

    return NextResponse.json({
      success: true,
      invoices: formattedInvoices
    })
  } catch (error) {
    console.error('Get invoices error:', error)
    return NextResponse.json(
      { error: '請求履歴の取得に失敗しました' },
      { status: 500 }
    )
  }
}


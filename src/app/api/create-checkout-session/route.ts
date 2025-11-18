import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { email, name, referralCode } = await request.json()
    console.log('Creating checkout session for:', { email, name, referralCode })
    console.log('Environment variables:', {
      hasStripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
      appUrl: process.env.NEXT_PUBLIC_APP_URL
    })

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      )
    }

    // PendingUserから紹介コードを取得（DBの情報を優先）
    let finalReferralCode = referralCode
    try {
      const pendingUser = await prisma.pendingUser.findUnique({
        where: { email },
        select: { referralCode: true }
      })

      if (pendingUser?.referralCode) {
        finalReferralCode = pendingUser.referralCode
        console.log('Using referral code from PendingUser:', finalReferralCode)
      } else if (referralCode) {
        console.log('Using referral code from request (PendingUser not found or no code):', referralCode)
      }
    } catch (error) {
      console.error('Failed to fetch PendingUser referral code:', error)
      // エラーが発生してもリクエストの紹介コードで続行
    }

    // テストモード用の商品と価格を確実に取得/作成
    const targetAmount = 5500 // ¥5,500
    let priceId: string
    
    try {
      // まず、¥5,500の価格を検索（商品に関係なく）
      const allPrices = await stripe.prices.list({
        limit: 100,
        active: true,
      })
      
      // ¥5,500の価格を探す
      const targetPrice = allPrices.data.find(p => 
        p.unit_amount === targetAmount && 
        p.currency === 'jpy' &&
        p.active === true &&
        p.recurring?.interval === 'month'
      )
      
      if (targetPrice) {
        priceId = targetPrice.id
        console.log(`✅ Found existing price (¥${targetAmount}): ${priceId}`)
        console.log(`   Product ID: ${targetPrice.product}`)
      } else {
        // 価格が見つからない場合は、商品と価格を新規作成
        console.log('⚠️ Price not found, creating new product and price...')
        
        const product = await stripe.products.create({
          name: 'UGSオンラインスクール 月額プラン',
          description: '学び → 実践 → 自立を一体化したFP育成プラットフォーム',
        })
        console.log(`✅ Created new product: ${product.id}`)
        
        const price = await stripe.prices.create({
          unit_amount: targetAmount,
          currency: 'jpy',
          recurring: {
            interval: 'month',
            interval_count: 1,
          },
          product: product.id,
        })
        priceId = price.id
        console.log(`✅ Created new price: ${priceId} (¥${targetAmount})`)
      }
    } catch (err: any) {
      console.error('❌ Error getting or creating price:', err.message)
      throw new Error(`Failed to get or create price: ${err.message}`)
    }

    // Checkout Sessionを作成（紹介コードをmetadataに含める）
    console.log('Creating checkout session with price:', priceId)
    const sessionMetadata: Record<string, string> = {
      userName: name,
      userEmail: email,
    }

    // 紹介コードがある場合、metadataに追加（PendingUserの紹介コードを優先）
    if (finalReferralCode) {
      sessionMetadata.referralCode = finalReferralCode
      console.log('Referral code added to session metadata:', finalReferralCode)
    }

    // 初回登録費用のPrice ID（環境変数から取得、なければ登録費用なし）
    const setupFeePriceId = process.env.STRIPE_SETUP_FEE_PRICE_ID

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,  // 月額5,500円
          quantity: 1,
        },
      ],
      mode: 'subscription',
      customer_email: email,
      metadata: sessionMetadata,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`,
      subscription_data: {
        // 初回登録費用を初回invoiceにのみ追加（案B: add_invoice_items使用）
        ...(setupFeePriceId ? {
          add_invoice_items: [
            {
              price: setupFeePriceId,  // 初回登録費用 33,000円
              quantity: 1,
            }
          ],
        } : {}),
        metadata: sessionMetadata,
      },
    })

    if (setupFeePriceId) {
      console.log('✅ Setup fee added:', setupFeePriceId)
      console.log('💰 Total first payment: ¥38,500 (¥33,000 + ¥5,500)')
    } else {
      console.log('⚠️ No setup fee configured (STRIPE_SETUP_FEE_PRICE_ID not set)')
      console.log('💰 Total first payment: ¥5,500')
    }
    console.log('Checkout session created:', session.id)
    console.log('Checkout URL:', session.url)
    
    // セッションの詳細を確認
    const sessionDetails = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['line_items']
    })
    console.log('Session details:', {
      sessionId: sessionDetails.id,
      lineItems: sessionDetails.line_items?.data.map(item => ({
        priceId: item.price?.id,
        productId: item.price?.product,
        amount: item.amount_total,
        description: item.description
      }))
    })

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    })
  } catch (error: any) {
    console.error('❌ Error creating checkout session:', error)
    console.error('Error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      param: error.param,
      stack: error.stack
    })
    
    // より詳細なエラー情報を返す
    const errorMessage = error.message || 'Unknown error'
    const errorCode = error.code || 'UNKNOWN_ERROR'
    
    return NextResponse.json(
      { 
        error: 'Failed to create checkout session',
        details: errorMessage,
        code: errorCode,
        type: error.type
      },
      { status: 500 }
    )
  }
}

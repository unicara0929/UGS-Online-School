const Stripe = require('stripe');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const prisma = new PrismaClient();

const targetEmails = [
  'raihutt131229@icloud.com',
  'kimi.96@icloud.com',
  'soccer091015@icloud.com',
  'soccer091015@gmail.com',
  'hiroki92521@gmail.com',
  'daigorogoro3@gmail.com',
  'apple.bsh1107@gmail.com'
];

async function createSubscriptions() {
  // 最近のcheckout sessionsを取得
  const sessions = await stripe.checkout.sessions.list({
    limit: 100
  });

  console.log('=== Creating Subscriptions from Stripe Sessions ===\n');

  for (const email of targetEmails) {
    console.log('Processing:', email);

    // このメールアドレスのセッションを探す（完了したもののみ）
    const session = sessions.data.find(s =>
      s.status === 'complete' &&
      (s.customer_email === email || s.customer_details?.email === email)
    );

    if (!session) {
      console.log('  ⚠️ No completed checkout session found');
      continue;
    }

    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

    if (!customerId || !subscriptionId) {
      console.log('  ⚠️ Missing customer or subscription ID');
      continue;
    }

    console.log('  Customer ID:', customerId);
    console.log('  Subscription ID:', subscriptionId);

    // Prismaユーザーを取得
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('  ❌ User not found');
      continue;
    }

    // 既存サブスクリプションを確認
    const existingSub = await prisma.subscription.findFirst({
      where: { userId: user.id }
    });

    if (existingSub) {
      console.log('  ⏭️ Subscription already exists');
      continue;
    }

    // サブスクリプションを作成
    await prisma.subscription.create({
      data: {
        userId: user.id,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        status: 'ACTIVE'
      }
    });

    console.log('  ✅ Subscription created');
  }

  console.log('\n=== Done ===');
}

createSubscriptions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

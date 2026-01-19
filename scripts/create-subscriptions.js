const { PrismaClient } = require('@prisma/client');
const Stripe = require('stripe');

require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createSubscriptions() {
  const emails = [
    'raihutt131229@icloud.com',
    'kimi.96@icloud.com',
    'soccer091015@icloud.com',
    'soccer091015@gmail.com',
    'hiroki92521@gmail.com',
    'daigorogoro3@gmail.com',
    'apple.bsh1107@gmail.com'
  ];

  console.log('=== Creating Subscription Records ===\n');

  for (const email of emails) {
    console.log(`Processing: ${email}`);

    // 1. Prismaユーザーを取得
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true }
    });

    if (!user) {
      console.log('  ❌ User not found in Prisma');
      continue;
    }

    // 2. 既存のサブスクリプションを確認
    const existingSub = await prisma.subscription.findFirst({
      where: { userId: user.id }
    });

    if (existingSub) {
      console.log('  ⏭️ Subscription already exists');
      continue;
    }

    // 3. Stripeで顧客を検索
    const customers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    if (customers.data.length === 0) {
      console.log('  ⚠️ No Stripe customer found');
      continue;
    }

    const customer = customers.data[0];
    console.log(`  Found Stripe customer: ${customer.id}`);

    // 4. 顧客のサブスクリプションを取得
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      console.log('  ⚠️ No Stripe subscription found');
      continue;
    }

    const stripeSub = subscriptions.data[0];
    console.log(`  Found Stripe subscription: ${stripeSub.id} (status: ${stripeSub.status})`);

    // 5. Prismaにサブスクリプションを作成
    const newSub = await prisma.subscription.create({
      data: {
        userId: user.id,
        stripeCustomerId: customer.id,
        stripeSubscriptionId: stripeSub.id,
        status: stripeSub.status === 'active' ? 'ACTIVE' : 'INACTIVE'
      }
    });

    console.log(`  ✅ Created subscription: ${newSub.id}`);
  }

  console.log('\n=== Done ===');
}

createSubscriptions()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

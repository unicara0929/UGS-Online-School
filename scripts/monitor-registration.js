/**
 * 登録状況監視スクリプト
 * 使用方法: node scripts/monitor-registration.js <email>
 */
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const email = process.argv[2];
if (!email) {
  console.log('使用方法: node scripts/monitor-registration.js <email>');
  process.exit(1);
}

async function check() {
  console.clear();
  console.log(`\n=== Registration Monitor: ${email} ===`);
  console.log(`Time: ${new Date().toLocaleString('ja-JP')}\n`);

  // 1. PendingUser
  const pendingUser = await prisma.pendingUser.findUnique({
    where: { email }
  });
  console.log('1. PendingUser:');
  if (pendingUser) {
    console.log(`   ✅ EXISTS - ${pendingUser.name}`);
    console.log(`   - emailVerified: ${pendingUser.emailVerified}`);
    console.log(`   - plainPassword: ${pendingUser.plainPassword ? 'SET' : 'CLEARED'}`);
  } else {
    console.log('   ❌ NOT FOUND (正常終了の場合は削除済み)');
  }

  // 2. Supabase User
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
  const supabaseUser = users.find(u => u.email === email);
  console.log('\n2. Supabase User:');
  if (supabaseUser) {
    console.log(`   ✅ EXISTS - ID: ${supabaseUser.id}`);
    console.log(`   - email_confirmed: ${supabaseUser.email_confirmed_at ? 'YES' : 'NO'}`);
  } else {
    console.log('   ⏳ NOT YET (決済完了後に作成)');
  }

  // 3. Prisma User
  const user = await prisma.user.findUnique({
    where: { email }
  });
  console.log('\n3. Prisma User:');
  if (user) {
    console.log(`   ✅ EXISTS - ID: ${user.id}`);
    console.log(`   - memberId: ${user.memberId}`);
    console.log(`   - membershipStatus: ${user.membershipStatus}`);
  } else {
    console.log('   ⏳ NOT YET (決済完了後に作成)');
  }

  // 4. Subscription
  if (user) {
    const subscription = await prisma.subscription.findFirst({
      where: { userId: user.id }
    });
    console.log('\n4. Subscription:');
    if (subscription) {
      console.log(`   ✅ EXISTS - Status: ${subscription.status}`);
      console.log(`   - Stripe Customer: ${subscription.stripeCustomerId}`);
      console.log(`   - Stripe Subscription: ${subscription.stripeSubscriptionId}`);
    } else {
      console.log('   ⏳ NOT YET');
    }
  }

  // 5. Stripe
  console.log('\n5. Stripe:');
  const customers = await stripe.customers.list({ email, limit: 1 });
  if (customers.data.length > 0) {
    const customer = customers.data[0];
    console.log(`   ✅ Customer: ${customer.id}`);
    const subs = await stripe.subscriptions.list({ customer: customer.id, limit: 1 });
    if (subs.data.length > 0) {
      console.log(`   ✅ Subscription: ${subs.data[0].id} (${subs.data[0].status})`);
    }
  } else {
    console.log('   ⏳ NOT YET (決済完了後に作成)');
  }

  // 診断
  console.log('\n=== 診断 ===');
  if (!pendingUser && user && user.membershipStatus === 'ACTIVE') {
    console.log('✅ 登録完了！ユーザーは正常にログインできます。');
    return true;
  } else if (pendingUser && supabaseUser && !user) {
    console.log('⚠️ 問題あり: Supabaseにはいるが、Prismaにユーザーがいない');
    console.log('   → webhookでPrismaユーザー作成が失敗した可能性');
    return false;
  } else if (pendingUser && pendingUser.emailVerified && !supabaseUser) {
    console.log('⏳ 決済待ち: メール認証完了、Stripe決済を待機中');
    return false;
  } else if (pendingUser && !pendingUser.emailVerified) {
    console.log('⏳ メール認証待ち');
    return false;
  }
  return false;
}

async function monitor() {
  console.log('Monitoring... (Ctrl+C to stop)\n');

  let completed = false;
  while (!completed) {
    completed = await check();
    if (!completed) {
      await new Promise(r => setTimeout(r, 5000)); // 5秒ごとに更新
    }
  }

  await prisma.$disconnect();
}

monitor().catch(err => {
  console.error('Error:', err);
  prisma.$disconnect();
});

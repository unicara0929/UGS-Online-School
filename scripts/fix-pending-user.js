const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

const prisma = new PrismaClient();
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function fixPendingUser(email) {
  console.log(`\n=== Fixing user: ${email} ===\n`);

  // 1. PendingUserを取得
  const pendingUser = await prisma.pendingUser.findUnique({
    where: { email }
  });

  if (!pendingUser) {
    console.log('ERROR: PendingUser not found');
    return;
  }
  console.log('PendingUser found:', pendingUser.name);

  // 2. Supabaseユーザーを確認
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.log('ERROR listing Supabase users:', listError);
    return;
  }

  const supabaseUser = users.find(u => u.email === email);
  console.log('Supabase user:', supabaseUser ? `Found (ID: ${supabaseUser.id})` : 'Not found');

  // 3. Prismaユーザーを確認
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    console.log('User already exists in Prisma:', existingUser.id);
    return;
  }

  if (!supabaseUser) {
    console.log('ERROR: No Supabase user found. Cannot create Prisma user without Supabase user.');
    console.log('The user needs to go through Stripe checkout again to create Supabase account.');
    return;
  }

  // 4. 会員番号を生成（重複を避けるためループで確認）
  let memberId;
  let attempts = 0;
  while (attempts < 10) {
    const latestUser = await prisma.user.findFirst({
      where: { memberId: { startsWith: 'UGS' } },
      orderBy: { memberId: 'desc' },
      select: { memberId: true }
    });

    let nextNumber = 1;
    if (latestUser?.memberId) {
      const numberPart = latestUser.memberId.replace('UGS', '');
      const currentNumber = parseInt(numberPart, 10);
      if (!isNaN(currentNumber)) {
        nextNumber = currentNumber + 1 + attempts;
      }
    }
    memberId = `UGS${nextNumber.toString().padStart(7, '0')}`;

    // 重複チェック
    const existing = await prisma.user.findUnique({
      where: { memberId },
      select: { id: true }
    });

    if (!existing) break;
    attempts++;
    console.log(`MemberId ${memberId} already exists, trying next...`);
  }
  console.log('Generated memberId:', memberId);

  // 5. 紹介コードを生成
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let referralCode = '';
  for (let i = 0; i < 8; i++) {
    referralCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  console.log('Generated referralCode:', referralCode);

  // 6. Prismaユーザーを作成
  const newUser = await prisma.user.create({
    data: {
      id: supabaseUser.id,
      email: email,
      name: pendingUser.name,
      role: 'MEMBER',
      memberId: memberId,
      referralCode: referralCode,
      membershipStatus: 'ACTIVE',
      membershipStatusChangedAt: new Date(),
      membershipStatusReason: '手動修正：決済完了後のユーザー作成失敗を修正'
    }
  });
  console.log('Created Prisma user:', newUser.id);

  // 7. Subscriptionを確認・作成（Stripeから情報を取得する必要があるかも）
  // まずは基本的なsubscriptionを作成
  const existingSubscription = await prisma.subscription.findFirst({
    where: { userId: newUser.id }
  });

  if (!existingSubscription) {
    console.log('Note: Subscription record needs to be created with Stripe data');
    console.log('Please check Stripe dashboard for customer/subscription IDs');
  }

  // 8. PendingUserを削除
  await prisma.pendingUser.delete({
    where: { id: pendingUser.id }
  });
  console.log('Deleted PendingUser');

  console.log('\n=== User fix completed ===');
  console.log('User can now login with their email and password');
}

// 環境変数を読み込む
require('dotenv').config({ path: '.env.local' });

const email = process.argv[2] || 'raihutt131229@icloud.com';
fixPendingUser(email)
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

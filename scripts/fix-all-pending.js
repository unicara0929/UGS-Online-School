const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ユニークな会員番号を生成
async function generateUniqueMemberId() {
  for (let attempts = 0; attempts < 20; attempts++) {
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
    const memberId = `UGS${nextNumber.toString().padStart(7, '0')}`;

    const existing = await prisma.user.findUnique({
      where: { memberId },
      select: { id: true }
    });

    if (!existing) return memberId;
  }
  throw new Error('Could not generate unique memberId');
}

// ユニークな紹介コードを生成
async function generateUniqueReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempts = 0; attempts < 20; attempts++) {
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const existing = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true }
    });

    if (!existing) return code;
  }
  throw new Error('Could not generate unique referralCode');
}

async function fixAllPending() {
  console.log('=== Fixing all PendingUsers with Supabase but no Prisma user ===\n');

  // 1. Supabaseユーザー一覧を取得
  const { data: { users: supabaseUsers }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error('Error listing Supabase users:', error);
    return;
  }

  // 2. 修正が必要なPendingUserを取得
  const pendingUsers = await prisma.pendingUser.findMany({
    where: { emailVerified: true }
  });

  let fixed = 0;
  let skipped = 0;

  for (const pending of pendingUsers) {
    const supabaseUser = supabaseUsers.find(u => u.email === pending.email);
    const prismaUser = await prisma.user.findUnique({
      where: { email: pending.email }
    });

    // Supabaseにいるがprismaにいない場合のみ修正
    if (supabaseUser && !prismaUser) {
      console.log(`Fixing: ${pending.email} (${pending.name})`);

      try {
        const memberId = await generateUniqueMemberId();
        const referralCode = await generateUniqueReferralCode();

        // Prismaユーザーを作成
        const newUser = await prisma.user.create({
          data: {
            id: supabaseUser.id,
            email: pending.email,
            name: pending.name,
            role: 'MEMBER',
            memberId: memberId,
            referralCode: referralCode,
            membershipStatus: 'ACTIVE',
            membershipStatusChangedAt: new Date(),
            membershipStatusReason: '手動修正：決済完了後のユーザー作成失敗を修正'
          }
        });

        // PendingUserを削除
        await prisma.pendingUser.delete({
          where: { id: pending.id }
        });

        console.log(`  ✅ Created user with ID: ${newUser.id}, MemberId: ${memberId}`);
        fixed++;
      } catch (err) {
        console.log(`  ❌ Error: ${err.message}`);
        skipped++;
      }
    } else if (prismaUser) {
      // 既にPrismaユーザーがいる場合はPendingUserを削除
      console.log(`Cleaning up: ${pending.email} (already has Prisma user)`);
      await prisma.pendingUser.delete({
        where: { id: pending.id }
      });
      skipped++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Skipped/Cleaned: ${skipped}`);
}

fixAllPending()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkAllPending() {
  console.log('=== Checking all PendingUsers with emailVerified=true ===\n');

  // 1. メール認証済みのPendingUserを取得
  const pendingUsers = await prisma.pendingUser.findMany({
    where: { emailVerified: true },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Found ${pendingUsers.length} verified PendingUsers\n`);

  // 2. Supabaseユーザー一覧を取得
  const { data: { users: supabaseUsers }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error('Error listing Supabase users:', error);
    return;
  }

  // 3. 各PendingUserをチェック
  const issues = [];

  for (const pending of pendingUsers) {
    const prismaUser = await prisma.user.findUnique({
      where: { email: pending.email }
    });

    const supabaseUser = supabaseUsers.find(u => u.email === pending.email);

    const status = {
      email: pending.email,
      name: pending.name,
      createdAt: pending.createdAt.toISOString().split('T')[0],
      hasPrismaUser: !!prismaUser,
      hasSupabaseUser: !!supabaseUser,
      supabaseId: supabaseUser?.id || null,
      plainPasswordCleared: pending.plainPassword === null,
      issue: null
    };

    if (supabaseUser && !prismaUser) {
      status.issue = 'NEEDS_FIX: Has Supabase but no Prisma user';
      issues.push(status);
    } else if (!supabaseUser && !prismaUser) {
      status.issue = 'WAITING: No Supabase user yet (may not have paid)';
    } else if (prismaUser) {
      status.issue = 'OK: User exists (should not be in PendingUser)';
      issues.push(status);
    }

    console.log(`${pending.email}`);
    console.log(`  Name: ${pending.name}`);
    console.log(`  Created: ${status.createdAt}`);
    console.log(`  Supabase: ${status.hasSupabaseUser ? 'Yes' : 'No'}`);
    console.log(`  Prisma: ${status.hasPrismaUser ? 'Yes' : 'No'}`);
    console.log(`  PlainPW cleared: ${status.plainPasswordCleared ? 'Yes' : 'No'}`);
    console.log(`  Status: ${status.issue || 'OK'}`);
    console.log('');
  }

  console.log('\n=== Summary ===');
  console.log(`Total verified PendingUsers: ${pendingUsers.length}`);
  console.log(`Users needing fix: ${issues.filter(i => i.issue?.includes('NEEDS_FIX')).length}`);

  console.log('\n=== Users that need fixing ===');
  issues.filter(i => i.issue?.includes('NEEDS_FIX')).forEach(i => {
    console.log(`  - ${i.email} (${i.name}) - Supabase ID: ${i.supabaseId}`);
  });
}

checkAllPending()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'raihutt131229@icloud.com';

  console.log('=== Checking PendingUser ===');
  const pendingUser = await prisma.pendingUser.findUnique({
    where: { email }
  });
  console.log('PendingUser:', pendingUser ? JSON.stringify(pendingUser, null, 2) : 'Not found');

  console.log('\n=== Checking User ===');
  const user = await prisma.user.findUnique({
    where: { email }
  });
  console.log('User:', user ? JSON.stringify(user, null, 2) : 'Not found');

  console.log('\n=== Checking Subscription ===');
  if (user) {
    const subscription = await prisma.subscription.findFirst({
      where: { userId: user.id }
    });
    console.log('Subscription:', subscription ? JSON.stringify(subscription, null, 2) : 'Not found');
  }

  console.log('\n=== All PendingUsers (recent 10) ===');
  const allPending = await prisma.pendingUser.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      createdAt: true,
      referralCode: true
    }
  });
  console.log('Recent PendingUsers:');
  allPending.forEach(p => {
    console.log(`  - ${p.email} | ${p.name} | verified: ${p.emailVerified} | created: ${p.createdAt.toISOString()}`);
  });

  console.log('\n=== Users with PENDING membershipStatus ===');
  const pendingMembers = await prisma.user.findMany({
    where: { membershipStatus: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      email: true,
      name: true,
      membershipStatus: true,
      createdAt: true
    }
  });
  console.log('Users with PENDING status:');
  pendingMembers.forEach(u => {
    console.log(`  - ${u.email} | ${u.name} | status: ${u.membershipStatus} | created: ${u.createdAt.toISOString()}`);
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

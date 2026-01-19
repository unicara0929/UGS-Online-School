const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

// Stripeから取得したデータ
const subscriptionData = [
  { email: 'raihutt131229@icloud.com', customerId: 'cus_TnoQhhCi1YjsEH', subscriptionId: 'sub_1SqCnTA4wMsZI7g4L9icvjNW' },
  { email: 'kimi.96@icloud.com', customerId: 'cus_Tn2e2f5rischoR', subscriptionId: 'sub_1SpSZ2A4wMsZI7g4j5b79qKj' },
  { email: 'soccer091015@icloud.com', customerId: 'cus_TnJkQo9F3YZLOM', subscriptionId: 'sub_1Spj75A4wMsZI7g4Gz2iPTz5' },
  { email: 'soccer091015@gmail.com', customerId: 'cus_TmGTjo6PEk5YEa', subscriptionId: 'sub_1SohwDA4wMsZI7g4tcm6Cp36' },
  { email: 'hiroki92521@gmail.com', customerId: 'cus_TltZhJGV7LOEd3', subscriptionId: 'sub_1SoLmOA4wMsZI7g4EsAdCqjb' },
  { email: 'daigorogoro3@gmail.com', customerId: 'cus_TltU1BcB4DoKLK', subscriptionId: 'sub_1SoLhyA4wMsZI7g4pW0iMoSV' },
  { email: 'apple.bsh1107@gmail.com', customerId: 'cus_TmLnJG4dmULaBs', subscriptionId: 'sub_1Son6KA4wMsZI7g4eARa58mH' }
];

async function createSubscriptions() {
  console.log('=== Creating Subscriptions Directly ===\n');

  for (const data of subscriptionData) {
    console.log('Processing:', data.email);

    // Prismaユーザーを取得
    const user = await prisma.user.findUnique({
      where: { email: data.email }
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
        stripeCustomerId: data.customerId,
        stripeSubscriptionId: data.subscriptionId,
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

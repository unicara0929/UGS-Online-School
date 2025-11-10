// API動作確認用のテストスクリプト
import { prisma } from '../src/lib/prisma'
import { appRoleToPrismaRole } from '../src/lib/utils/role-mapper'

async function runTests() {
  console.log('🧪 API動作確認テスト開始\n')

  try {
    // 1. テストユーザーの作成
    console.log('1️⃣ テストユーザーの作成...')
    const testUsers = await createTestUsers()
    console.log(`✅ テストユーザー作成完了: ${testUsers.length}名\n`)

    // 2. 紹介システムのテスト
    console.log('2️⃣ 紹介システムのテスト...')
    await testReferralSystem(testUsers)
    console.log('✅ 紹介システムテスト完了\n')

    // 3. 契約実績管理のテスト
    console.log('3️⃣ 契約実績管理のテスト...')
    await testContractSystem(testUsers)
    console.log('✅ 契約実績管理テスト完了\n')

    // 4. 報酬計算のテスト
    console.log('4️⃣ 報酬計算のテスト...')
    await testCompensationCalculation(testUsers)
    console.log('✅ 報酬計算テスト完了\n')

    // 5. 昇格フローのテスト
    console.log('5️⃣ 昇格フローのテスト...')
    await testPromotionFlow(testUsers)
    console.log('✅ 昇格フローテスト完了\n')

    // 6. 通知システムのテスト
    console.log('6️⃣ 通知システムのテスト...')
    await testNotificationSystem(testUsers)
    console.log('✅ 通知システムテスト完了\n')

    console.log('✨ すべてのテストが完了しました！')
  } catch (error) {
    console.error('❌ テストエラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

async function createTestUsers() {
  // 既存のテストユーザーを確認
  const existingUsers = await prisma.user.findMany({
    where: {
      email: {
        in: ['test-referrer@example.com', 'test-referred@example.com', 'test-fp@example.com']
      }
    }
  })

  const users = []

  // 紹介者ユーザー（FPエイド）
  if (!existingUsers.find(u => u.email === 'test-referrer@example.com')) {
    const referrer = await prisma.user.create({
      data: {
        email: 'test-referrer@example.com',
        name: 'テスト紹介者',
        role: appRoleToPrismaRole('fp'),
        referralCode: 'TESTREF01'
      }
    })
    users.push(referrer)
    console.log(`  - 紹介者ユーザー作成: ${referrer.email}`)
  } else {
    users.push(existingUsers.find(u => u.email === 'test-referrer@example.com')!)
  }

  // 被紹介者ユーザー（MEMBER）
  if (!existingUsers.find(u => u.email === 'test-referred@example.com')) {
    const referred = await prisma.user.create({
      data: {
        email: 'test-referred@example.com',
        name: 'テスト被紹介者',
        role: appRoleToPrismaRole('member'),
        referralCode: 'TESTREF02'
      }
    })
    users.push(referred)
    console.log(`  - 被紹介者ユーザー作成: ${referred.email}`)
  } else {
    users.push(existingUsers.find(u => u.email === 'test-referred@example.com')!)
  }

  // FPエイドユーザー
  if (!existingUsers.find(u => u.email === 'test-fp@example.com')) {
    const fpUser = await prisma.user.create({
      data: {
        email: 'test-fp@example.com',
        name: 'テストFP',
        role: appRoleToPrismaRole('fp'),
        referralCode: 'TESTFP01'
      }
    })
    users.push(fpUser)
    console.log(`  - FPエイドユーザー作成: ${fpUser.email}`)
  } else {
    users.push(existingUsers.find(u => u.email === 'test-fp@example.com')!)
  }

  return users
}

async function testReferralSystem(users: any[]) {
  const referrer = users.find(u => u.email === 'test-referrer@example.com')
  const referred = users.find(u => u.email === 'test-referred@example.com')

  if (!referrer || !referred) {
    console.log('  ⚠️ テストユーザーが見つかりません')
    return
  }

  // 既存の紹介をチェック
  let referral = await prisma.referral.findUnique({
    where: {
      referrerId_referredId: {
        referrerId: referrer.id,
        referredId: referred.id
      }
    }
  })

  if (!referral) {
    // 紹介を登録
    referral = await prisma.referral.create({
      data: {
        referrerId: referrer.id,
        referredId: referred.id,
        referralType: 'MEMBER',
        status: 'PENDING'
      }
    })
    console.log(`  ✅ 紹介登録: ${referral.id}`)
  } else {
    console.log(`  ✅ 既存の紹介を確認: ${referral.id}`)
  }

  // 紹介を承認（未承認の場合のみ）
  if (referral.status !== 'APPROVED') {
    const approvedReferral = await prisma.referral.update({
      where: { id: referral.id },
      data: {
        status: 'APPROVED',
        rewardAmount: 15000
      }
    })
    console.log(`  ✅ 紹介承認: 報酬額 ${approvedReferral.rewardAmount}円`)
  } else {
    console.log(`  ✅ 紹介は既に承認済み: 報酬額 ${referral.rewardAmount}円`)
  }

  // 紹介一覧を取得
  const referrals = await prisma.referral.findMany({
    where: { referrerId: referrer.id }
  })
  console.log(`  ✅ 紹介一覧取得: ${referrals.length}件`)
}

async function testContractSystem(users: any[]) {
  const fpUser = users.find(u => u.email === 'test-fp@example.com')

  if (!fpUser) {
    console.log('  ⚠️ FPユーザーが見つかりません')
    return
  }

  // 契約を登録
  const contract = await prisma.contract.create({
    data: {
      userId: fpUser.id,
      contractNumber: `CONTRACT-${Date.now()}`,
      contractType: 'INSURANCE',
      status: 'ACTIVE',
      signedAt: new Date(),
      amount: 100000,
      rewardAmount: 5000
    }
  })
  console.log(`  ✅ 契約登録: ${contract.contractNumber}`)

  // 契約一覧を取得
  const contracts = await prisma.contract.findMany({
    where: { userId: fpUser.id }
  })
  console.log(`  ✅ 契約一覧取得: ${contracts.length}件`)
}

async function testCompensationCalculation(users: any[]) {
  const fpUser = users.find(u => u.email === 'test-fp@example.com')

  if (!fpUser) {
    console.log('  ⚠️ FPユーザーが見つかりません')
    return
  }

  // 報酬計算サービスをインポート
  const { calculateMonthlyCompensation, calculateTotalCompensation } = await import('../src/lib/services/compensation-calculator')

  const month = new Date().toISOString().slice(0, 7) // YYYY-MM形式
  const breakdown = await calculateMonthlyCompensation(fpUser.id, month)
  const total = calculateTotalCompensation(breakdown)

  console.log(`  ✅ 報酬計算完了:`)
  console.log(`     - UGS会員紹介報酬: ${breakdown.memberReferral.toLocaleString()}円`)
  console.log(`     - FPエイド紹介報酬: ${breakdown.fpReferral.toLocaleString()}円`)
  console.log(`     - 契約報酬: ${breakdown.contract.toLocaleString()}円`)
  console.log(`     - 合計: ${total.toLocaleString()}円`)
}

async function testPromotionFlow(users: any[]) {
  const fpUser = users.find(u => u.email === 'test-fp@example.com')

  if (!fpUser) {
    console.log('  ⚠️ FPユーザーが見つかりません')
    return
  }

  // 昇格条件チェックサービスをインポート
  const { checkManagerPromotionEligibility } = await import('../src/lib/services/promotion-eligibility')

  const eligibility = await checkManagerPromotionEligibility(fpUser.id)
  console.log(`  ✅ 昇格可能性チェック:`)
  console.log(`     - 昇格可能: ${eligibility.isEligible ? 'はい' : 'いいえ'}`)
  if (eligibility.conditions.compensationAverage) {
    console.log(`     - 報酬実績: ${eligibility.conditions.compensationAverage.current.toLocaleString()}円 / ${eligibility.conditions.compensationAverage.target.toLocaleString()}円`)
  }
  if (eligibility.conditions.memberReferrals) {
    console.log(`     - UGS会員紹介: ${eligibility.conditions.memberReferrals.current}名 / ${eligibility.conditions.memberReferrals.target}名`)
  }
  if (eligibility.conditions.fpReferrals) {
    console.log(`     - FPエイド紹介: ${eligibility.conditions.fpReferrals.current}名 / ${eligibility.conditions.fpReferrals.target}名`)
  }
}

async function testNotificationSystem(users: any[]) {
  const fpUser = users.find(u => u.email === 'test-fp@example.com')

  if (!fpUser) {
    console.log('  ⚠️ FPユーザーが見つかりません')
    return
  }

  // 通知サービスをインポート
  const { createNotification } = await import('../src/lib/services/notification-service')

  // 通知を作成
  await createNotification(
    fpUser.id,
    'COMPENSATION_READY',
    'INFO',
    '報酬が確定しました',
    '2024年1月の報酬が確定しました。金額: ¥125,000',
    '/dashboard/compensation'
  )
  console.log(`  ✅ 通知作成完了`)

  // 通知一覧を取得
  const notifications = await prisma.notification.findMany({
    where: { userId: fpUser.id },
    orderBy: { createdAt: 'desc' },
    take: 5
  })
  console.log(`  ✅ 通知一覧取得: ${notifications.length}件`)

  // 未読数を取得
  const unreadCount = await prisma.notification.count({
    where: {
      userId: fpUser.id,
      isRead: false
    }
  })
  console.log(`  ✅ 未読通知数: ${unreadCount}件`)
}

runTests()


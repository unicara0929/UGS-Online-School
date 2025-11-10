// HTTP APIエンドポイントの動作確認テスト
// 開発サーバーが起動している状態で実行してください

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

interface TestResult {
  name: string
  success: boolean
  error?: string
  data?: any
}

async function testAPI() {
  console.log('🌐 HTTP APIエンドポイント動作確認テスト開始\n')
  console.log(`ベースURL: ${BASE_URL}\n`)

  const results: TestResult[] = []

  try {
    // テストユーザーを取得（既存のテストユーザーを使用）
    const testUsers = await getTestUsers()
    if (testUsers.length === 0) {
      console.log('⚠️ テストユーザーが見つかりません。先に scripts/test-api.ts を実行してください。')
      return
    }

    const referrer = testUsers.find(u => u.email === 'test-referrer@example.com')
    const fpUser = testUsers.find(u => u.email === 'test-fp@example.com')

    if (!referrer || !fpUser) {
      console.log('⚠️ 必要なテストユーザーが見つかりません')
      return
    }

    // 1. 紹介APIのテスト
    console.log('1️⃣ 紹介APIのテスト...')
    results.push(await testReferralAPI(referrer.id, fpUser.id))
    console.log('')

    // 2. 契約APIのテスト
    console.log('2️⃣ 契約APIのテスト...')
    results.push(await testContractAPI(fpUser.id))
    console.log('')

    // 3. 通知APIのテスト
    console.log('3️⃣ 通知APIのテスト...')
    results.push(await testNotificationAPI(fpUser.id))
    console.log('')

    // 4. 昇格APIのテスト
    console.log('4️⃣ 昇格APIのテスト...')
    results.push(await testPromotionAPI(fpUser.id))
    console.log('')

    // 5. 基礎テストAPIのテスト
    console.log('5️⃣ 基礎テストAPIのテスト...')
    const memberUser = testUsers.find(u => u.email === 'test-member@example.com')
    if (memberUser) {
      results.push(await testBasicTestAPI(memberUser.id))
    } else {
      results.push({ name: '基礎テストAPI', success: false, error: 'テストユーザーが見つかりません' })
    }
    console.log('')

    // 6. アンケートAPIのテスト
    console.log('6️⃣ アンケートAPIのテスト...')
    if (memberUser) {
      results.push(await testSurveyAPI(memberUser.id))
    } else {
      results.push({ name: 'アンケートAPI', success: false, error: 'テストユーザーが見つかりません' })
    }
    console.log('')

    // 7. LP面談APIのテスト
    console.log('7️⃣ LP面談APIのテスト...')
    if (memberUser) {
      results.push(await testLPMeetingAPI(memberUser.id))
    } else {
      results.push({ name: 'LP面談API', success: false, error: 'テストユーザーが見つかりません' })
    }
    console.log('')

    // 結果サマリー
    console.log('📊 テスト結果サマリー:')
    console.log('='.repeat(50))
    results.forEach(result => {
      const status = result.success ? '✅' : '❌'
      console.log(`${status} ${result.name}`)
      if (!result.success && result.error) {
        console.log(`   エラー: ${result.error}`)
      }
    })
    console.log('='.repeat(50))

    const successCount = results.filter(r => r.success).length
    const totalCount = results.length
    console.log(`\n成功: ${successCount}/${totalCount}`)

  } catch (error) {
    console.error('❌ テスト実行エラー:', error)
  }
}

async function getTestUsers() {
  try {
    // Prismaから直接テストユーザーを取得
    const { prisma } = await import('../src/lib/prisma')
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: ['test-referrer@example.com', 'test-referred@example.com', 'test-fp@example.com', 'test-member@example.com']
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    })
    return users
  } catch (error) {
    console.error('テストユーザー取得エラー:', error)
    return []
  }
}

async function testReferralAPI(referrerId: string, fpUserId: string): Promise<TestResult> {
  try {
    // 紹介一覧を取得
    const listResponse = await fetch(`${BASE_URL}/api/referrals?userId=${referrerId}`)
    if (!listResponse.ok) {
      return {
        name: '紹介一覧取得',
        success: false,
        error: `HTTP ${listResponse.status}`
      }
    }
    const listData = await listResponse.json()
    console.log(`  ✅ 紹介一覧取得: ${listData.referrals?.length || 0}件`)

    return {
      name: '紹介API',
      success: true,
      data: listData
    }
  } catch (error: any) {
    return {
      name: '紹介API',
      success: false,
      error: error.message
    }
  }
}

async function testContractAPI(userId: string): Promise<TestResult> {
  try {
    // 契約一覧を取得
    const listResponse = await fetch(`${BASE_URL}/api/contracts?userId=${userId}`)
    if (!listResponse.ok) {
      return {
        name: '契約一覧取得',
        success: false,
        error: `HTTP ${listResponse.status}`
      }
    }
    const listData = await listResponse.json()
    console.log(`  ✅ 契約一覧取得: ${listData.contracts?.length || 0}件`)

    return {
      name: '契約API',
      success: true,
      data: listData
    }
  } catch (error: any) {
    return {
      name: '契約API',
      success: false,
      error: error.message
    }
  }
}

async function testNotificationAPI(userId: string): Promise<TestResult> {
  try {
    // 通知一覧を取得
    const listResponse = await fetch(`${BASE_URL}/api/notifications?userId=${userId}`)
    if (!listResponse.ok) {
      return {
        name: '通知一覧取得',
        success: false,
        error: `HTTP ${listResponse.status}`
      }
    }
    const listData = await listResponse.json()
    console.log(`  ✅ 通知一覧取得: ${listData.notifications?.length || 0}件`)
    console.log(`  ✅ 未読数: ${listData.unreadCount || 0}件`)

    return {
      name: '通知API',
      success: true,
      data: listData
    }
  } catch (error: any) {
    return {
      name: '通知API',
      success: false,
      error: error.message
    }
  }
}

async function testPromotionAPI(userId: string): Promise<TestResult> {
  try {
    // 昇格可能性をチェック
    const eligibilityResponse = await fetch(`${BASE_URL}/api/promotions/eligibility?userId=${userId}&targetRole=manager`)
    if (!eligibilityResponse.ok) {
      return {
        name: '昇格可能性チェック',
        success: false,
        error: `HTTP ${eligibilityResponse.status}`
      }
    }
    const eligibilityData = await eligibilityResponse.json()
    console.log(`  ✅ 昇格可能性チェック: ${eligibilityData.eligibility?.isEligible ? '可能' : '不可'}`)

    return {
      name: '昇格API',
      success: true,
      data: eligibilityData
    }
  } catch (error: any) {
    return {
      name: '昇格API',
      success: false,
      error: error.message
    }
  }
}

async function testBasicTestAPI(userId: string): Promise<TestResult> {
  try {
    // 基礎テストを取得
    const testResponse = await fetch(`${BASE_URL}/api/basic-test`)
    if (!testResponse.ok) {
      return {
        name: '基礎テスト取得',
        success: false,
        error: `HTTP ${testResponse.status}`
      }
    }
    const testData = await testResponse.json()
    console.log(`  ✅ 基礎テスト取得: ${testData.test?.title || 'N/A'}`)

    // テスト結果を取得
    const resultsResponse = await fetch(`${BASE_URL}/api/basic-test?userId=${userId}`)
    if (resultsResponse.ok) {
      const resultsData = await resultsResponse.json()
      console.log(`  ✅ テスト結果取得: ${resultsData.results?.length || 0}件`)
    }

    return {
      name: '基礎テストAPI',
      success: true,
      data: testData
    }
  } catch (error: any) {
    return {
      name: '基礎テストAPI',
      success: false,
      error: error.message
    }
  }
}

async function testSurveyAPI(userId: string): Promise<TestResult> {
  try {
    // アンケートを取得
    const surveyResponse = await fetch(`${BASE_URL}/api/survey`)
    if (!surveyResponse.ok) {
      return {
        name: 'アンケート取得',
        success: false,
        error: `HTTP ${surveyResponse.status}`
      }
    }
    const surveyData = await surveyResponse.json()
    console.log(`  ✅ アンケート取得: ${surveyData.survey?.title || 'N/A'}`)

    // アンケート提出を取得
    const submissionResponse = await fetch(`${BASE_URL}/api/survey?userId=${userId}`)
    if (submissionResponse.ok) {
      const submissionData = await submissionResponse.json()
      console.log(`  ✅ アンケート提出取得: ${submissionData.submission ? '提出済み' : '未提出'}`)
    }

    return {
      name: 'アンケートAPI',
      success: true,
      data: surveyData
    }
  } catch (error: any) {
    return {
      name: 'アンケートAPI',
      success: false,
      error: error.message
    }
  }
}

async function testLPMeetingAPI(userId: string): Promise<TestResult> {
  try {
    // LP面談情報を取得
    const meetingResponse = await fetch(`${BASE_URL}/api/lp-meetings/my-meeting?userId=${userId}`)
    if (!meetingResponse.ok) {
      return {
        name: 'LP面談情報取得',
        success: false,
        error: `HTTP ${meetingResponse.status}`
      }
    }
    const meetingData = await meetingResponse.json()
    console.log(`  ✅ LP面談情報取得: ${meetingData.meeting ? `ステータス: ${meetingData.meeting.status}` : '面談なし'}`)

    return {
      name: 'LP面談API',
      success: true,
      data: meetingData
    }
  } catch (error: any) {
    return {
      name: 'LP面談API',
      success: false,
      error: error.message
    }
  }
}

// 開発サーバーが起動しているか確認
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`, { 
      method: 'HEAD',
      signal: AbortSignal.timeout(3000)
    })
    return true
  } catch {
    try {
      // ヘルスチェックエンドポイントがない場合、ルートページを確認
      const response = await fetch(BASE_URL, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(3000)
      })
      return response.ok
    } catch {
      return false
    }
  }
}

async function main() {
  const serverRunning = await checkServer()
  if (!serverRunning) {
    console.log('⚠️ 開発サーバーが起動していないようです')
    console.log(`   以下のコマンドで開発サーバーを起動してください:`)
    console.log(`   npm run dev`)
    console.log(`\n   その後、再度このスクリプトを実行してください。`)
    return
  }

  await testAPI()
}

main()


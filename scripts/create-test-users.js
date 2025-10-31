#!/usr/bin/env node

// テスト用ユーザーを作成するスクリプト
const testUsers = [
  {
    email: 'admin@example.com',
    password: '123',
    name: '山田 二郎',
    role: 'admin'
  },
  {
    email: 'member@example.com',
    password: '123',
    name: '田中 太郎',
    role: 'member'
  },
  {
    email: 'fp@example.com',
    password: '123',
    name: '佐藤 花子',
    role: 'fp'
  },
  {
    email: 'manager@example.com',
    password: '123',
    name: '鈴木 一郎',
    role: 'manager'
  }
]

async function createTestUsers() {
  console.log('🚀 テスト用ユーザーを作成中...')
  
  for (const userData of testUsers) {
    try {
      console.log(`📝 ${userData.email} を作成中...`)
      
      const response = await fetch('http://localhost:3000/api/auth/create-test-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      })
      
      const result = await response.json()
      
      if (response.ok) {
        console.log(`✅ ${userData.email} の作成に成功しました`)
      } else {
        console.log(`❌ ${userData.email} の作成に失敗: ${result.error}`)
      }
    } catch (error) {
      console.log(`❌ ${userData.email} の作成中にエラー: ${error.message}`)
    }
  }
  
  console.log('🎉 テスト用ユーザーの作成が完了しました！')
  console.log('\n📋 ログイン情報:')
  testUsers.forEach(user => {
    console.log(`${user.role}: ${user.email} / ${user.password}`)
  })
}

// スクリプトを実行
createTestUsers().catch(console.error)

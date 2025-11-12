import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * 接続プール設定の検証と最適化
 * 根本的な解決: 環境変数で設定されているか確認し、設定されていない場合は警告を出す
 */
function validateConnectionPoolConfig(): void {
  const databaseUrl = process.env.DATABASE_URL || ''
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set. Please configure it in Vercel environment variables.')
    return
  }
  
  // 接続プール設定の検証
  const hasConnectionLimit = databaseUrl.includes('connection_limit')
  const hasPoolTimeout = databaseUrl.includes('pool_timeout')
  const hasConnectTimeout = databaseUrl.includes('connect_timeout')
  
  if (!hasConnectionLimit || !hasPoolTimeout || !hasConnectTimeout) {
    console.warn('⚠️ 接続プール設定が不完全です。以下のパラメータをDATABASE_URLに追加してください:')
    console.warn('   - connection_limit=20')
    console.warn('   - pool_timeout=30')
    console.warn('   - connect_timeout=30')
    console.warn('例: postgresql://...?connection_limit=20&pool_timeout=30&connect_timeout=30')
    console.warn('詳細: PRISMA-OPTIMIZATION-GUIDE.md を参照してください')
  } else {
    console.log('✅ 接続プール設定が検証されました')
  }
  
  // Transaction Poolerの使用を推奨
  if (databaseUrl.includes('pooler.supabase.com')) {
    console.log('✅ Supabase Transaction Poolerが使用されています')
  } else if (databaseUrl.includes('db.') && databaseUrl.includes('.supabase.co')) {
    console.warn('⚠️ 直接接続が使用されています。Transaction Poolerの使用を推奨します')
    console.warn('   Transaction Pooler URL: postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true')
  }
}

/**
 * Prismaクライアントの設定を最適化（サーバーレス環境対応）
 * 根本的な解決: 接続プール設定を環境変数で管理し、設定の検証を行う
 */
const createPrismaClient = () => {
  // 接続プール設定の検証（開発環境と本番環境の起動時のみ）
  if (typeof window === 'undefined') {
    validateConnectionPoolConfig()
  }
  
  const databaseUrl = process.env.DATABASE_URL || ''
  
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })
}

// グローバル変数に保存して、モジュール再読み込み時も同じインスタンスを再利用
// これにより、サーバーレス環境での接続プールの効率が最大化される
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// すべての環境でグローバル変数に保存（サーバーレス環境での接続再利用のため）
globalForPrisma.prisma = prisma

/**
 * 接続プールのヘルスチェック
 * 根本的な解決: 起動時に接続プールの状態を確認し、問題を早期に検知
 */
export async function checkConnectionPoolHealth(): Promise<{
  healthy: boolean
  error?: string
  details?: {
    connectionLimit?: string
    poolTimeout?: string
    connectTimeout?: string
  }
}> {
  try {
    const startTime = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const duration = Date.now() - startTime
    
    const databaseUrl = process.env.DATABASE_URL || ''
    const urlParams = new URLSearchParams(databaseUrl.split('?')[1] || '')
    
    return {
      healthy: true,
      details: {
        connectionLimit: urlParams.get('connection_limit') || '未設定',
        poolTimeout: urlParams.get('pool_timeout') || '未設定',
        connectTimeout: urlParams.get('connect_timeout') || '未設定',
      },
    }
  } catch (error: any) {
    return {
      healthy: false,
      error: error.message || 'Unknown error',
    }
  }
}

// 接続をテストする関数
export async function testConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database connection test failed:', error)
    return false
  }
}

// 接続を切断する関数（クリーンアップ用）
export async function disconnectPrisma(): Promise<void> {
  try {
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error disconnecting Prisma:', error)
  }
}

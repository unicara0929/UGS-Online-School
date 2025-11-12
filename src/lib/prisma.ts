import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Prismaクライアントの設定を最適化（サーバーレス環境対応）
const createPrismaClient = () => {
  const databaseUrl = process.env.DATABASE_URL || ''
  
  // サーバーレス環境（Vercel）での最適化設定
  // 1. 接続プールの設定を最適化
  // 2. 接続の再利用を最大化
  // 3. タイムアウト設定を適切に設定
  const connectionString = databaseUrl
  
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: connectionString,
      },
    },
    // サーバーレス環境での接続管理を最適化
    // - 接続プールの設定はDATABASE_URLのクエリパラメータで制御
    // - Vercel環境変数で直接設定することを推奨
    // - connection_limit, pool_timeout, connect_timeoutは環境変数で設定
  })
}

// グローバル変数に保存して、モジュール再読み込み時も同じインスタンスを再利用
// これにより、サーバーレス環境での接続プールの効率が向上
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// 本番環境でもグローバル変数に保存（Vercelのサーバーレス環境での接続再利用のため）
if (process.env.NODE_ENV === 'production') {
  globalForPrisma.prisma = prisma
}

// 接続エラー時のリトライ関数
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 2, // リトライ回数を3回→2回に削減
  delay = 500 // 初期待機時間を2秒→500msに短縮
): Promise<T> {
  let lastError: Error | null = null
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error
      
      // PrismaClientInitializationErrorの場合はリトライ
      if (
        error?.constructor?.name === 'PrismaClientInitializationError' ||
        error?.message?.includes("Can't reach database server") ||
        error?.message?.includes('database server') ||
        error?.message?.includes('pooler.supabase.com')
      ) {
        if (i < maxRetries - 1) {
          // 指数バックオフで待機（最大2秒に短縮）
          const waitTime = Math.min(delay * Math.pow(2, i), 2000)
          console.warn(`Database connection failed, retrying in ${waitTime}ms... (attempt ${i + 1}/${maxRetries})`)
          console.warn('Connection URL:', process.env.DATABASE_URL ? 'Set' : 'Not set')
          await new Promise(resolve => setTimeout(resolve, waitTime))
          continue
        }
      }
      
      // リトライできないエラーまたは最大リトライ回数に達した場合
      throw error
    }
  }
  
  throw lastError || new Error('Operation failed after retries')
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

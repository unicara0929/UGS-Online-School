import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Prismaクライアントの設定を改善
const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // 接続タイムアウトを長く設定（30秒）
    // 接続プールの初期化に時間がかかる場合があるため
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// 接続エラー時のリトライ関数
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 2000 // 初期待機時間を2秒に延長
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
          // 指数バックオフで待機（最大10秒）
          const waitTime = Math.min(delay * Math.pow(2, i), 10000)
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

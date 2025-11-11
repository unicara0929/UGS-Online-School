import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Prismaクライアントの設定を改善
const createPrismaClient = () => {
  // 接続プールの設定を追加
  const databaseUrl = process.env.DATABASE_URL || ''
  let connectionString = databaseUrl
  
  // 接続プールのパラメータが含まれていない場合は追加
  if (connectionString && !connectionString.includes('connection_limit')) {
    const separator = connectionString.includes('?') ? '&' : '?'
    connectionString = `${connectionString}${separator}connection_limit=10&pool_timeout=20`
  }
  
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: connectionString,
      },
    },
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
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

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  connectionPoolConfigValidated?: boolean
}

/**
 * 接続プール設定の検証と最適化
 * 根本的な解決: 環境変数で設定されているか確認し、設定されていない場合は警告を出す（一度だけ）
 */
function validateConnectionPoolConfig(): void {
  // 既に検証済みの場合はスキップ（警告の重複を防ぐ）
  // グローバル変数に保存して、モジュール再読み込み時も保持
  if (globalForPrisma.connectionPoolConfigValidated) {
    return
  }

  const databaseUrl = process.env.DATABASE_URL || ''

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set. Please configure it in Vercel environment variables.')
    globalForPrisma.connectionPoolConfigValidated = true
    return
  }

  // デバッグ: 使用中のURLをログ出力（パスワードは隠す）
  const urlForLog = databaseUrl.replace(/:[^:@]+@/, ':***@')
  console.log('🔗 Database URL:', urlForLog)

  // 直接接続を使用している場合はPoolerの警告をスキップ
  if (databaseUrl.includes('db.') && databaseUrl.includes('.supabase.co') && !databaseUrl.includes('pooler')) {
    console.log('✅ 直接接続が使用されています（開発環境推奨）')
  } else if (databaseUrl.includes('pooler.supabase.com')) {
    console.log('✅ Supabase Transaction Poolerが使用されています')
  }

  // 検証済みフラグをグローバル変数に設定（モジュール再読み込み時も保持）
  globalForPrisma.connectionPoolConfigValidated = true
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
  
  // 環境変数から引用符を削除（.env.localで引用符が含まれている場合に対応）
  let databaseUrl = (process.env.DATABASE_URL || '').replace(/^["']|["']$/g, '')
  
  // URLの検証と修正
  try {
    // URLをパースして検証
    const urlObj = new URL(databaseUrl)
    
    // パスワード部分をURLエンコード（特殊文字が含まれている場合）
    if (urlObj.password) {
      const decodedPassword = decodeURIComponent(urlObj.password)
      const encodedPassword = encodeURIComponent(decodedPassword)
      if (decodedPassword !== encodedPassword) {
        // 特殊文字が含まれている場合はエンコード
        urlObj.password = encodedPassword
        databaseUrl = urlObj.toString()
      }
    }
  } catch (urlError) {
    console.error('DATABASE_URLの解析に失敗しました:', urlError)
    console.error('DATABASE_URL:', databaseUrl.substring(0, 50) + '...')
  }
  
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

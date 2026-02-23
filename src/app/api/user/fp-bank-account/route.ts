import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole, AccountType } from '@prisma/client'
import { getAuthenticatedUser, Roles } from '@/lib/auth/api-helpers'
import { supabaseAdmin } from '@/lib/supabase'
import { convertYuchoToStandard } from '@/lib/utils/yucho-converter'

/**
 * GET /api/user/fp-bank-account
 * オンボーディング用口座情報取得
 * 権限: FPロール OR fpPromotionApproved
 */
export async function GET(request: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const user = await prisma.user.findUnique({
      where: { id: authUser!.id },
      select: {
        role: true,
        fpPromotionApproved: true,
        compensationBankAccount: {
          select: {
            id: true,
            bankName: true,
            branchName: true,
            branchNumber: true,
            accountType: true,
            accountNumber: true,
            accountHolderName: true,
            isYuchoBank: true,
            yuchoSymbol: true,
            yuchoNumber: true,
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // FPまたは昇格承認済みかチェック
    if (user.role !== Roles.FP && !user.fpPromotionApproved) {
      return NextResponse.json(
        { error: 'アクセス権限がありません' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      bankAccount: user.compensationBankAccount || null
    })
  } catch (error) {
    console.error('FP bank account GET error:', error)
    return NextResponse.json(
      { error: '口座情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 口座情報のバリデーション共通処理
 */
function validateBankAccountData(body: Record<string, unknown>) {
  const {
    bankName,
    branchName,
    branchNumber,
    accountType,
    accountNumber,
    accountHolderName,
    isYuchoBank,
    yuchoSymbol,
    yuchoNumber
  } = body

  if (!bankName || typeof bankName !== 'string' || !bankName.trim()) {
    return { error: '金融機関名は必須です' }
  }

  if (!accountHolderName || typeof accountHolderName !== 'string' || !accountHolderName.trim()) {
    return { error: '口座名義は必須です' }
  }

  const katakanaRegex = /^[ァ-ヶー\s]+$/
  if (!katakanaRegex.test(accountHolderName as string)) {
    return { error: '口座名義は全角カタカナで入力してください' }
  }

  if (!['NORMAL', 'CHECKING', 'SAVINGS'].includes(accountType as string)) {
    return { error: '無効な口座種別です' }
  }

  if (isYuchoBank) {
    if (!yuchoSymbol || !yuchoNumber) {
      return { error: 'ゆうちょ銀行の場合は記号と番号が必須です' }
    }

    const conversion = convertYuchoToStandard(yuchoSymbol as string, yuchoNumber as string)
    if (conversion.error) {
      return { error: conversion.error }
    }
  } else {
    if (!branchName || typeof branchName !== 'string' || !branchName.trim()) {
      return { error: '支店名は必須です' }
    }
    if (!branchNumber || typeof branchNumber !== 'string' || !branchNumber.trim()) {
      return { error: '支店番号は必須です' }
    }
    if (!/^\d{3}$/.test(branchNumber as string)) {
      return { error: '支店番号は3桁の数字で入力してください' }
    }
    if (!accountNumber || typeof accountNumber !== 'string' || !accountNumber.trim()) {
      return { error: '口座番号は必須です' }
    }
    if (!/^\d{7}$/.test(accountNumber as string)) {
      return { error: '口座番号は7桁の数字で入力してください' }
    }
  }

  return { error: null }
}

/**
 * 口座登録/更新後の自動昇格チェック
 */
async function checkAndPromote(userId: string, email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      fpPromotionApproved: true,
      managerContactConfirmedAt: true,
      complianceTestPassed: true,
      fpOnboardingCompleted: true,
    }
  })

  if (!user || !user.fpPromotionApproved) return false

  const allOnboardingComplete =
    user.managerContactConfirmedAt !== null &&
    user.complianceTestPassed === true &&
    user.fpOnboardingCompleted === true
    // BankAccount は今登録/更新したので存在するとみなす

  if (!allOnboardingComplete) return false

  // 承認済みの申請を取得
  const approvedApplication = await prisma.fPPromotionApplication.findFirst({
    where: { userId, status: 'APPROVED' }
  })

  // FPロールに昇格
  await prisma.user.update({
    where: { id: userId },
    data: {
      role: UserRole.FP,
      fpPromotionApproved: false
    }
  })

  // 申請ステータスをCOMPLETEDに更新
  if (approvedApplication) {
    await prisma.fPPromotionApplication.update({
      where: { id: approvedApplication.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    })
  }

  // Supabaseのロールも更新
  try {
    const supabaseUser = await supabaseAdmin.auth.admin.listUsers()
    const supaUser = supabaseUser.data.users.find(u => u.email === email)

    if (supaUser) {
      await supabaseAdmin.auth.admin.updateUserById(supaUser.id, {
        user_metadata: {
          ...supaUser.user_metadata,
          role: 'fp'
        }
      })
    }
  } catch (supabaseError) {
    console.error('Failed to update Supabase user role:', supabaseError)
  }

  console.log('All onboarding steps completed, user promoted to FP:', userId)
  return true
}

/**
 * 口座データからPrisma create/updateデータを構築
 */
function buildBankAccountData(body: Record<string, unknown>, userId: string) {
  const { bankName, branchName, branchNumber, accountType, accountNumber, accountHolderName, isYuchoBank, yuchoSymbol, yuchoNumber } = body

  if (isYuchoBank) {
    const conversion = convertYuchoToStandard(yuchoSymbol as string, yuchoNumber as string)
    return {
      bankName: (bankName as string).trim(),
      branchName: null,
      branchNumber: conversion.branchNumber!,
      accountType: accountType as AccountType,
      accountNumber: conversion.accountNumber!,
      accountHolderName: (accountHolderName as string).trim(),
      isYuchoBank: true,
      yuchoSymbol: yuchoSymbol as string,
      yuchoNumber: yuchoNumber as string,
      lastModifiedBy: userId
    }
  } else {
    return {
      bankName: (bankName as string).trim(),
      branchName: (branchName as string).trim(),
      branchNumber: (branchNumber as string).trim(),
      accountType: accountType as AccountType,
      accountNumber: (accountNumber as string).trim(),
      accountHolderName: (accountHolderName as string).trim(),
      isYuchoBank: false,
      yuchoSymbol: null,
      yuchoNumber: null,
      lastModifiedBy: userId
    }
  }
}

/**
 * POST /api/user/fp-bank-account
 * オンボーディング用口座情報新規登録 + 自動昇格チェック
 * 権限: FPロール OR fpPromotionApproved
 */
export async function POST(request: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const currentUser = await prisma.user.findUnique({
      where: { id: authUser!.id },
      select: {
        email: true,
        role: true,
        fpPromotionApproved: true,
      }
    })

    if (!currentUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    if (currentUser.role !== Roles.FP && !currentUser.fpPromotionApproved) {
      return NextResponse.json(
        { error: 'アクセス権限がありません' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validation = validateBankAccountData(body)
    if (validation.error) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const data = buildBankAccountData(body, authUser!.id)

    const bankAccount = await prisma.bankAccount.create({
      data: {
        userId: authUser!.id,
        ...data
      }
    })

    console.log('[FP_BANK_ACCOUNT] Created:', { userId: authUser!.id, bankName: data.bankName })

    // 自動昇格チェック
    const promoted = await checkAndPromote(authUser!.id, currentUser.email)

    return NextResponse.json({
      success: true,
      bankAccount,
      promoted,
      message: promoted ? 'オンボーディング完了！FPエイドに昇格しました' : '口座情報を登録しました'
    })
  } catch (error: any) {
    console.error('FP bank account POST error:', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: '既に口座情報が登録されています' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: '口座情報の登録に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/user/fp-bank-account
 * オンボーディング用口座情報更新 + 自動昇格チェック
 * 権限: FPロール OR fpPromotionApproved
 */
export async function PUT(request: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    const currentUser = await prisma.user.findUnique({
      where: { id: authUser!.id },
      select: {
        email: true,
        role: true,
        fpPromotionApproved: true,
      }
    })

    if (!currentUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    if (currentUser.role !== Roles.FP && !currentUser.fpPromotionApproved) {
      return NextResponse.json(
        { error: 'アクセス権限がありません' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validation = validateBankAccountData(body)
    if (validation.error) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const data = buildBankAccountData(body, authUser!.id)

    const bankAccount = await prisma.bankAccount.update({
      where: { userId: authUser!.id },
      data
    })

    console.log('[FP_BANK_ACCOUNT] Updated:', { userId: authUser!.id, bankName: data.bankName })

    // 自動昇格チェック
    const promoted = await checkAndPromote(authUser!.id, currentUser.email)

    return NextResponse.json({
      success: true,
      bankAccount,
      promoted,
      message: promoted ? 'オンボーディング完了！FPエイドに昇格しました' : '口座情報を更新しました'
    })
  } catch (error: any) {
    console.error('FP bank account PUT error:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: '口座情報が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: '口座情報の更新に失敗しました' },
      { status: 500 }
    )
  }
}

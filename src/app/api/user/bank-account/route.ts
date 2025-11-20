import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, checkRole, Roles } from '@/lib/auth/api-helpers'
import { convertYuchoToStandard } from '@/lib/utils/yucho-converter'

/**
 * GET /api/user/bank-account
 * 自分の報酬受け取り口座情報を取得
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // FP または Manager 権限チェック
    const { error: roleError } = checkRole(authUser!.role, [Roles.FP, Roles.MANAGER, Roles.ADMIN])
    if (roleError) return roleError

    // 口座情報を取得
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { userId: authUser!.id },
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
        createdAt: true,
        updatedAt: true
      }
    })

    if (!bankAccount) {
      return NextResponse.json({
        success: true,
        bankAccount: null
      })
    }

    return NextResponse.json({
      success: true,
      bankAccount
    })
  } catch (error: any) {
    console.error('Bank account GET error:', error)
    return NextResponse.json(
      { error: '口座情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/user/bank-account
 * 報酬受け取り口座情報を新規登録
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // FP または Manager 権限チェック
    const { error: roleError } = checkRole(authUser!.role, [Roles.FP, Roles.MANAGER, Roles.ADMIN])
    if (roleError) return roleError

    const body = await request.json()
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

    // バリデーション
    if (!bankName || !bankName.trim()) {
      return NextResponse.json(
        { error: '金融機関名は必須です' },
        { status: 400 }
      )
    }

    if (!accountHolderName || !accountHolderName.trim()) {
      return NextResponse.json(
        { error: '口座名義は必須です' },
        { status: 400 }
      )
    }

    // カタカナチェック
    const katakanaRegex = /^[ァ-ヶー\s]+$/
    if (!katakanaRegex.test(accountHolderName)) {
      return NextResponse.json(
        { error: '口座名義は全角カタカナで入力してください' },
        { status: 400 }
      )
    }

    if (!['NORMAL', 'CHECKING', 'SAVINGS'].includes(accountType)) {
      return NextResponse.json(
        { error: '無効な口座種別です' },
        { status: 400 }
      )
    }

    // ゆうちょ銀行の場合
    if (isYuchoBank) {
      if (!yuchoSymbol || !yuchoNumber) {
        return NextResponse.json(
          { error: 'ゆうちょ銀行の場合は記号と番号が必須です' },
          { status: 400 }
        )
      }

      // 変換して支店番号・口座番号を取得
      const conversion = convertYuchoToStandard(yuchoSymbol, yuchoNumber)
      if (conversion.error) {
        return NextResponse.json(
          { error: conversion.error },
          { status: 400 }
        )
      }

      // 口座情報を登録（ゆうちょ）
      const bankAccount = await prisma.bankAccount.create({
        data: {
          userId: authUser!.id,
          bankName,
          branchName: null,
          branchNumber: conversion.branchNumber, // 変換後の支店番号
          accountType,
          accountNumber: conversion.accountNumber, // 変換後の口座番号
          accountHolderName,
          isYuchoBank: true,
          yuchoSymbol,
          yuchoNumber,
          lastModifiedBy: authUser!.id
        }
      })

      console.log('[BANK_ACCOUNT] Created (Yucho):', {
        userId: authUser!.id,
        bankName,
        symbol: yuchoSymbol,
        number: yuchoNumber
      })

      return NextResponse.json({
        success: true,
        bankAccount
      })
    } else {
      // 通常の銀行の場合
      if (!branchName || !branchName.trim()) {
        return NextResponse.json(
          { error: '支店名は必須です' },
          { status: 400 }
        )
      }

      if (!branchNumber || !branchNumber.trim()) {
        return NextResponse.json(
          { error: '支店番号は必須です' },
          { status: 400 }
        )
      }

      if (!/^\d{3}$/.test(branchNumber)) {
        return NextResponse.json(
          { error: '支店番号は3桁の数字で入力してください' },
          { status: 400 }
        )
      }

      if (!accountNumber || !accountNumber.trim()) {
        return NextResponse.json(
          { error: '口座番号は必須です' },
          { status: 400 }
        )
      }

      if (!/^\d{7}$/.test(accountNumber)) {
        return NextResponse.json(
          { error: '口座番号は7桁の数字で入力してください' },
          { status: 400 }
        )
      }

      // 口座情報を登録（通常の銀行）
      const bankAccount = await prisma.bankAccount.create({
        data: {
          userId: authUser!.id,
          bankName,
          branchName,
          branchNumber,
          accountType,
          accountNumber,
          accountHolderName,
          isYuchoBank: false,
          yuchoSymbol: null,
          yuchoNumber: null,
          lastModifiedBy: authUser!.id
        }
      })

      console.log('[BANK_ACCOUNT] Created (Regular):', {
        userId: authUser!.id,
        bankName,
        branchName
      })

      return NextResponse.json({
        success: true,
        bankAccount
      })
    }
  } catch (error: any) {
    console.error('Bank account POST error:', error)

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
 * PUT /api/user/bank-account
 * 報酬受け取り口座情報を更新
 */
export async function PUT(request: NextRequest) {
  try {
    // 認証チェック
    const { user: authUser, error: authError } = await getAuthenticatedUser(request)
    if (authError) return authError

    // FP または Manager 権限チェック
    const { error: roleError } = checkRole(authUser!.role, [Roles.FP, Roles.MANAGER, Roles.ADMIN])
    if (roleError) return roleError

    const body = await request.json()
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

    // バリデーション
    if (!bankName || !bankName.trim()) {
      return NextResponse.json(
        { error: '金融機関名は必須です' },
        { status: 400 }
      )
    }

    if (!accountHolderName || !accountHolderName.trim()) {
      return NextResponse.json(
        { error: '口座名義は必須です' },
        { status: 400 }
      )
    }

    // カタカナチェック
    const katakanaRegex = /^[ァ-ヶー\s]+$/
    if (!katakanaRegex.test(accountHolderName)) {
      return NextResponse.json(
        { error: '口座名義は全角カタカナで入力してください' },
        { status: 400 }
      )
    }

    if (!['NORMAL', 'CHECKING', 'SAVINGS'].includes(accountType)) {
      return NextResponse.json(
        { error: '無効な口座種別です' },
        { status: 400 }
      )
    }

    // ゆうちょ銀行の場合
    if (isYuchoBank) {
      if (!yuchoSymbol || !yuchoNumber) {
        return NextResponse.json(
          { error: 'ゆうちょ銀行の場合は記号と番号が必須です' },
          { status: 400 }
        )
      }

      // 変換して支店番号・口座番号を取得
      const conversion = convertYuchoToStandard(yuchoSymbol, yuchoNumber)
      if (conversion.error) {
        return NextResponse.json(
          { error: conversion.error },
          { status: 400 }
        )
      }

      // 口座情報を更新（ゆうちょ）
      const bankAccount = await prisma.bankAccount.update({
        where: { userId: authUser!.id },
        data: {
          bankName,
          branchName: null,
          branchNumber: conversion.branchNumber,
          accountType,
          accountNumber: conversion.accountNumber,
          accountHolderName,
          isYuchoBank: true,
          yuchoSymbol,
          yuchoNumber,
          lastModifiedBy: authUser!.id
        }
      })

      console.log('[BANK_ACCOUNT] Updated (Yucho):', {
        userId: authUser!.id,
        bankName,
        symbol: yuchoSymbol
      })

      return NextResponse.json({
        success: true,
        bankAccount
      })
    } else {
      // 通常の銀行の場合
      if (!branchName || !branchName.trim()) {
        return NextResponse.json(
          { error: '支店名は必須です' },
          { status: 400 }
        )
      }

      if (!branchNumber || !branchNumber.trim()) {
        return NextResponse.json(
          { error: '支店番号は必須です' },
          { status: 400 }
        )
      }

      if (!/^\d{3}$/.test(branchNumber)) {
        return NextResponse.json(
          { error: '支店番号は3桁の数字で入力してください' },
          { status: 400 }
        )
      }

      if (!accountNumber || !accountNumber.trim()) {
        return NextResponse.json(
          { error: '口座番号は必須です' },
          { status: 400 }
        )
      }

      if (!/^\d{7}$/.test(accountNumber)) {
        return NextResponse.json(
          { error: '口座番号は7桁の数字で入力してください' },
          { status: 400 }
        )
      }

      // 口座情報を更新（通常の銀行）
      const bankAccount = await prisma.bankAccount.update({
        where: { userId: authUser!.id },
        data: {
          bankName,
          branchName,
          branchNumber,
          accountType,
          accountNumber,
          accountHolderName,
          isYuchoBank: false,
          yuchoSymbol: null,
          yuchoNumber: null,
          lastModifiedBy: authUser!.id
        }
      })

      console.log('[BANK_ACCOUNT] Updated (Regular):', {
        userId: authUser!.id,
        bankName,
        branchName
      })

      return NextResponse.json({
        success: true,
        bankAccount
      })
    }
  } catch (error: any) {
    console.error('Bank account PUT error:', error)

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

'use client'

/**
 * FPエイドのオンボーディングガード
 *
 * 以前は強制リダイレクトを行っていたが、
 * ユーザー体験向上のため、バナー通知方式に変更。
 *
 * 現在は単純にchildrenを返すだけのパススルーコンポーネント。
 * バナー表示は FPOnboardingBanner コンポーネントで行う。
 */

interface FPOnboardingGuardProps {
  children: React.ReactNode
}

export function FPOnboardingGuard({ children }: FPOnboardingGuardProps) {
  // 強制リダイレクトは廃止。バナー通知方式に移行。
  return <>{children}</>
}

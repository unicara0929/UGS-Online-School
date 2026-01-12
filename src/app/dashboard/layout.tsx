import { SubscriptionGuard } from "@/components/auth/subscription-guard"
import { FPOnboardingGuard } from "@/components/auth/fp-onboarding-guard"

// 決済エラー時でもアクセスを許可するパス
const SUBSCRIPTION_ALLOWED_PATHS = [
  '/dashboard/settings/subscription',
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SubscriptionGuard allowAccess={false} allowedPaths={SUBSCRIPTION_ALLOWED_PATHS}>
      <FPOnboardingGuard>
        <div className="w-full max-w-full overflow-x-hidden">
          {children}
        </div>
      </FPOnboardingGuard>
    </SubscriptionGuard>
  )
}

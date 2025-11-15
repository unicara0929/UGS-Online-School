import { SubscriptionGuard } from "@/components/auth/subscription-guard"
import { FPOnboardingGuard } from "@/components/auth/fp-onboarding-guard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SubscriptionGuard allowAccess={false}>
      <FPOnboardingGuard>
        {children}
      </FPOnboardingGuard>
    </SubscriptionGuard>
  )
}

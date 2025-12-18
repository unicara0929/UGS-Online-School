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
        <div className="w-full max-w-full overflow-x-hidden">
          {children}
        </div>
      </FPOnboardingGuard>
    </SubscriptionGuard>
  )
}

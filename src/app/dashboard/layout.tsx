import { AuthProvider } from "@/contexts/auth-context"
import { SubscriptionGuard } from "@/components/auth/subscription-guard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <SubscriptionGuard allowAccess={false}>
        {children}
      </SubscriptionGuard>
    </AuthProvider>
  )
}

import { SubscriptionGuard } from "@/components/auth/subscription-guard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SubscriptionGuard allowAccess={false}>
      {children}
    </SubscriptionGuard>
  )
}

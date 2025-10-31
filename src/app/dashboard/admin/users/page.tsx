import { ProtectedRoute } from '@/components/auth/protected-route'
import AdminUsersPage from './admin-users-page'

export default function Page() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <AdminUsersPage />
    </ProtectedRoute>
  )
}
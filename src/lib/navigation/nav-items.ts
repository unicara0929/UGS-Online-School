import { 
  Home,
  BookOpen,
  DollarSign,
  Users,
  Calendar,
  Settings,
  BarChart3,
  UserCheck,
  Award,
  GraduationCap
} from 'lucide-react'

export interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
  badge?: string
}

export const navigation: NavItem[] = [
  { name: 'ダッシュボード', href: '/dashboard', icon: Home, roles: ['member', 'fp', 'manager', 'admin'] },
  { name: '教育コンテンツ', href: '/dashboard/courses', icon: BookOpen, roles: ['member', 'fp', 'manager', 'admin'] },
  { name: '学習', href: '/dashboard/learn/1', icon: GraduationCap, roles: ['member', 'fp', 'manager', 'admin'] },
  { name: '報酬管理', href: '/dashboard/compensation', icon: DollarSign, roles: ['fp', 'manager', 'admin'] },
  { name: '昇格管理', href: '/dashboard/promotion', icon: Award, roles: ['member', 'fp', 'manager'] },
  { name: 'イベント', href: '/dashboard/events', icon: Calendar, roles: ['member', 'fp', 'manager', 'admin'] },
  { name: 'イベント管理', href: '/dashboard/admin/events', icon: Calendar, roles: ['admin'] },
  { name: 'チーム管理', href: '/dashboard/team', icon: Users, roles: ['manager', 'admin'] },
  { name: '分析', href: '/dashboard/analytics', icon: BarChart3, roles: ['admin'] },
  { name: 'ユーザー管理', href: '/dashboard/admin/users', icon: UserCheck, roles: ['admin'] },
  { name: '設定', href: '/dashboard/settings', icon: Settings, roles: ['member', 'fp', 'manager', 'admin'] },
]

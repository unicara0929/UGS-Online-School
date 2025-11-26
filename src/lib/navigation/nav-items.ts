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
  UserPlus,
  Bell,
  FileText,
  MessageSquare,
  FolderOpen,
  Mail,
  HelpCircle,
  Send,
  Inbox,
  CreditCard,
  UserRound
} from 'lucide-react'

export interface NavItem {
  name: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
  badge?: string
  subItems?: NavItem[] // 子項目をサポート
}

export const navigation: NavItem[] = [
  { name: 'ダッシュボード', href: '/dashboard', icon: Home, roles: ['member', 'fp', 'manager', 'admin'] },
  {
    name: 'コンテンツ',
    icon: FolderOpen,
    roles: ['member', 'fp', 'manager', 'admin'],
    subItems: [
      { name: '教育コンテンツ', href: '/dashboard/courses', icon: BookOpen, roles: ['member', 'fp', 'manager', 'admin'] },
      { name: '資料コンテンツ', href: '/dashboard/materials', icon: FileText, roles: ['member', 'fp', 'manager', 'admin'] },
    ]
  },
  { name: '報酬管理', href: '/dashboard/compensation', icon: DollarSign, roles: ['fp', 'manager', 'admin'] },
  { name: '紹介管理', href: '/dashboard/referrals', icon: UserPlus, roles: ['fp', 'manager', 'admin'] },
  { name: '契約管理', href: '/dashboard/contracts', icon: FileText, roles: ['fp', 'manager', 'admin'] },
  { name: '通知', href: '/dashboard/notifications', icon: Bell, roles: ['member', 'fp', 'manager', 'admin'] },
  { name: '昇格管理', href: '/dashboard/promotion', icon: Award, roles: ['member', 'fp'] },
  { name: 'LP面談予約', href: '/dashboard/lp-meeting/request', icon: MessageSquare, roles: ['member'] },
  { name: 'LP面談管理', href: '/dashboard/lp-meeting/manage', icon: MessageSquare, roles: ['fp'] },
  { name: 'イベント', href: '/dashboard/events', icon: Calendar, roles: ['member', 'fp', 'manager', 'admin'] },
  {
    name: '名刺注文',
    icon: CreditCard,
    roles: ['fp', 'manager', 'admin'],
    subItems: [
      { name: '名刺を注文する', href: '/dashboard/business-card/order', icon: CreditCard, roles: ['fp', 'manager', 'admin'] },
      { name: '注文履歴', href: '/dashboard/business-card/history', icon: FileText, roles: ['fp', 'manager', 'admin'] },
    ]
  },
  {
    name: 'サポート',
    icon: HelpCircle,
    roles: ['member', 'fp', 'manager', 'admin'],
    subItems: [
      { name: 'よくある質問', href: '/dashboard/support/faq', icon: HelpCircle, roles: ['member', 'fp', 'manager', 'admin'] },
      { name: 'お問い合わせ', href: '/dashboard/support/contact', icon: Send, roles: ['member', 'fp', 'manager', 'admin'] },
      { name: '個別相談', href: '/dashboard/consultation', icon: UserRound, roles: ['member', 'fp', 'manager', 'admin'] },
    ]
  },
  { name: '教育コンテンツ管理', href: '/dashboard/admin/courses', icon: BookOpen, roles: ['admin'] },
  { name: 'イベント管理', href: '/dashboard/admin/events', icon: Calendar, roles: ['admin'] },
  { name: 'LP面談管理（管理者）', href: '/dashboard/admin/lp-meetings', icon: MessageSquare, roles: ['admin'] },
  { name: '昇格申請管理', href: '/dashboard/admin/promotions', icon: Award, roles: ['admin'] },
  { name: '紹介管理（管理者）', href: '/dashboard/admin/referrals', icon: UserPlus, roles: ['admin'] },
  { name: '報酬管理（管理者）', href: '/dashboard/admin/compensations', icon: DollarSign, roles: ['admin'] },
  { name: 'チーム管理', href: '/dashboard/team', icon: Users, roles: ['manager', 'admin'] },
  { name: '分析', href: '/dashboard/analytics', icon: BarChart3, roles: ['admin'] },
  { name: 'ユーザー管理', href: '/dashboard/admin/users', icon: UserCheck, roles: ['admin'] },
  { name: 'メール送信履歴', href: '/dashboard/admin/email-history', icon: Mail, roles: ['admin'] },
  { name: 'FAQ管理', href: '/dashboard/admin/faq', icon: HelpCircle, roles: ['admin'] },
  { name: 'お問い合わせ管理', href: '/dashboard/admin/contacts', icon: Inbox, roles: ['admin'] },
  { name: '個別相談管理', href: '/dashboard/admin/consultations', icon: UserRound, roles: ['admin'] },
  { name: '名刺注文管理', href: '/dashboard/admin/business-card', icon: CreditCard, roles: ['admin'] },
  { name: '設定', href: '/dashboard/settings', icon: Settings, roles: ['member', 'fp', 'manager', 'admin'] },
]

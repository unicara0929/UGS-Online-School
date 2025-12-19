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
  UserRound,
  UserX,
  ClipboardList,
  ShieldCheck,
  Wrench,
  Briefcase,
  TrendingUp,
  AlertTriangle,
  Scale,
  Receipt
} from 'lucide-react'

export interface NavItem {
  name: string
  href?: string
  externalUrl?: string // 外部リンク用
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
  { name: 'インボイス申請フォーム', externalUrl: 'https://forms.gle/dkBGExfEuVhKppyk7', icon: Receipt, roles: ['fp'] },
  { name: '紹介管理', href: '/dashboard/referrals', icon: UserPlus, roles: ['member', 'fp', 'manager', 'admin'] },
  { name: '契約管理', href: '/dashboard/contracts', icon: FileText, roles: ['fp', 'manager', 'admin'] },
  { name: '通知', href: '/dashboard/notifications', icon: Bell, roles: ['member', 'fp', 'manager', 'admin'] },
  { name: '昇格管理', href: '/dashboard/promotion', icon: Award, roles: ['member', 'fp'] },
  { name: 'LP面談予約', href: '/dashboard/lp-meeting/request', icon: MessageSquare, roles: ['member'] },
  // FP向けLP面談管理は廃止（面談者が社内スタッフに変更、管理者画面で管理）
  { name: 'イベント', href: '/dashboard/events', icon: Calendar, roles: ['member', 'fp', 'manager', 'admin'] },
  { name: '個別相談', href: '/dashboard/consultation', icon: UserRound, roles: ['member', 'fp', 'manager', 'admin'] },
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
    ]
  },
  // ========== 管理者専用メニュー ==========
  {
    name: '会員管理',
    icon: Users,
    roles: ['admin'],
    subItems: [
      { name: 'ユーザー管理', href: '/dashboard/admin/users', icon: UserCheck, roles: ['admin'] },
      { name: '退会申請管理', href: '/dashboard/admin/cancel-requests', icon: UserX, roles: ['admin'] },
      { name: '昇格申請管理', href: '/dashboard/admin/promotions', icon: Award, roles: ['admin'] },
    ]
  },
  {
    name: 'コンテンツ管理',
    icon: FolderOpen,
    roles: ['admin'],
    subItems: [
      { name: '教育コンテンツ管理', href: '/dashboard/admin/courses', icon: BookOpen, roles: ['admin'] },
      { name: 'コンプライアンステスト', href: '/dashboard/admin/compliance-test', icon: ShieldCheck, roles: ['admin'] },
    ]
  },
  {
    name: 'イベント・面談',
    icon: Calendar,
    roles: ['admin'],
    subItems: [
      { name: 'イベント管理', href: '/dashboard/admin/events', icon: Calendar, roles: ['admin'] },
      { name: 'LP面談管理', href: '/dashboard/admin/lp-meetings', icon: MessageSquare, roles: ['admin'] },
      { name: '事前アンケート管理', href: '/dashboard/admin/pre-interview-templates', icon: ClipboardList, roles: ['admin'] },
    ]
  },
  {
    name: '報酬・契約・紹介',
    icon: DollarSign,
    roles: ['admin'],
    subItems: [
      { name: '報酬管理', href: '/dashboard/admin/compensations', icon: DollarSign, roles: ['admin'] },
      { name: '契約管理', href: '/dashboard/admin/contracts', icon: Briefcase, roles: ['admin'] },
      { name: '紹介管理', href: '/dashboard/admin/referrals', icon: UserPlus, roles: ['admin'] },
    ]
  },
  {
    name: '問い合わせ対応',
    icon: Inbox,
    roles: ['admin'],
    subItems: [
      { name: 'お問い合わせ管理', href: '/dashboard/admin/contacts', icon: Inbox, roles: ['admin'] },
      { name: '個別相談管理', href: '/dashboard/admin/consultations', icon: UserRound, roles: ['admin'] },
      { name: 'FAQ管理', href: '/dashboard/admin/faq', icon: HelpCircle, roles: ['admin'] },
    ]
  },
  {
    name: 'MGR管理',
    icon: Scale,
    roles: ['admin'],
    subItems: [
      { name: 'MGR売上管理', href: '/dashboard/admin/manager-sales', icon: TrendingUp, roles: ['admin'] },
      { name: '半期査定管理', href: '/dashboard/admin/manager-assessments', icon: Scale, roles: ['admin'] },
      { name: '降格候補一覧', href: '/dashboard/admin/demotion-candidates', icon: AlertTriangle, roles: ['admin'] },
    ]
  },
  {
    name: 'その他管理',
    icon: Wrench,
    roles: ['admin'],
    subItems: [
      { name: '名刺注文管理', href: '/dashboard/admin/business-card', icon: CreditCard, roles: ['admin'] },
      { name: 'メール送信履歴', href: '/dashboard/admin/email-history', icon: Mail, roles: ['admin'] },
    ]
  },
  { name: 'チーム管理', href: '/dashboard/team', icon: Users, roles: ['manager', 'admin'] },
  { name: '分析', href: '/dashboard/analytics', icon: BarChart3, roles: ['admin'] },
  { name: '設定', href: '/dashboard/settings', icon: Settings, roles: ['member', 'fp', 'manager', 'admin'] },
]

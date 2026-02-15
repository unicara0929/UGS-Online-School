'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  Users,
  GraduationCap,
  Calendar,
  Bell,
  DollarSign,
  FileText,
  Settings,
  Shield,
  HelpCircle,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Info,
  UserPlus,
  CreditCard,
  Award,
  MessageSquare,
  Briefcase,
  ClipboardList,
  UserCheck,
  LayoutDashboard,
  Mail,
  Upload,
  Download
} from 'lucide-react'

interface ManualSection {
  id: string
  title: string
  icon: React.ReactNode
  forRoles: ('member' | 'fp' | 'manager' | 'admin')[]
  content: React.ReactNode
}

export default function ManualPage() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['getting-started']))
  const [roleFilter, setRoleFilter] = useState<'all' | 'member' | 'fp' | 'manager' | 'admin'>('all')

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  const sections: ManualSection[] = [
    // 1. はじめに
    {
      id: 'getting-started',
      title: 'はじめに（全ユーザー向け）',
      icon: <BookOpen className="h-5 w-5" aria-hidden="true" />,
      forRoles: ['member', 'fp', 'manager', 'admin'],
      content: (
        <div className="space-y-6">
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <h4 className="font-semibold text-primary-900 mb-2">UGSとは</h4>
            <p className="text-primary-800">
              UGSは、"勉強だけで終わらない"「お金の知識×稼げる力」がコンセプトのビジネスコミュニティです。
              教育コンテンツで金融知識を学び、FPエイドとして活動することで収益を得ることができます。
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-3">ロール（会員種別）について</h4>
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="h-4 w-4 text-slate-600" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium">UGS会員（MEMBER）</p>
                  <p className="text-sm text-slate-600">基礎編の教育コンテンツで学習できます。FPエイドへの昇格条件を満たすと申請可能。</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <Briefcase className="h-4 w-4 text-blue-600" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium">FPエイド（FP）</p>
                  <p className="text-sm text-slate-600">実践編・応用編の教育コンテンツにアクセス可能。報酬を得る活動ができます。</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <Award className="h-4 w-4 text-purple-600" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium">マネージャー（MANAGER）</p>
                  <p className="text-sm text-slate-600">チームを管理できます。FPエイドとしての実績が必要です。</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <div className="w-8 h-8 bg-red-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="h-4 w-4 text-red-600" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium">管理者（ADMIN）</p>
                  <p className="text-sm text-slate-600">システム全体を管理できます。</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">ログイン方法</h4>
            <ol className="list-decimal list-inside space-y-2 text-slate-700">
              <li><Link href="/login" className="text-primary-600 hover:underline">/login</Link> にアクセス</li>
              <li>登録したメールアドレスとパスワードを入力</li>
              <li>「ログイン」ボタンをクリック</li>
              <li>ダッシュボードに遷移します</li>
            </ol>
          </div>
        </div>
      )
    },

    // 2. 会員登録フロー
    {
      id: 'registration',
      title: '会員登録の流れ',
      icon: <UserPlus className="h-5 w-5" aria-hidden="true" />,
      forRoles: ['member', 'fp', 'manager', 'admin'],
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-blue-800">
                新規会員は以下の流れで登録が完了します。動作確認時は各ステップが正常に動作するか確認してください。
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">1</div>
              <div>
                <p className="font-medium">仮登録</p>
                <p className="text-sm text-slate-600 mb-2">
                  <Link href="/register" className="text-primary-600 hover:underline">/register</Link> で名前・メールアドレス・パスワードを入力
                </p>
                <div className="bg-slate-50 p-3 rounded text-sm">
                  <p className="font-medium text-slate-700">確認ポイント:</p>
                  <ul className="list-disc list-inside text-slate-600 mt-1">
                    <li>紹介コード入力欄があるか</li>
                    <li>バリデーション（パスワード要件など）が動作するか</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">2</div>
              <div>
                <p className="font-medium">メール認証</p>
                <p className="text-sm text-slate-600 mb-2">登録メールアドレスに認証リンクが送信されます</p>
                <div className="bg-slate-50 p-3 rounded text-sm">
                  <p className="font-medium text-slate-700">確認ポイント:</p>
                  <ul className="list-disc list-inside text-slate-600 mt-1">
                    <li>認証メールが届くか（迷惑メールフォルダも確認）</li>
                    <li>認証リンクをクリックして認証完了するか</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">3</div>
              <div>
                <p className="font-medium">決済（Stripe）</p>
                <p className="text-sm text-slate-600 mb-2">
                  <Link href="/checkout" className="text-primary-600 hover:underline">/checkout</Link> で月額サブスクリプションの決済
                </p>
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm">
                  <p className="font-medium text-yellow-800">テスト用カード番号:</p>
                  <p className="text-yellow-700 font-mono mt-1">4242 4242 4242 4242</p>
                  <p className="text-yellow-600 mt-1">有効期限: 任意の将来の日付 / CVC: 任意の3桁</p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="font-medium">登録完了</p>
                <p className="text-sm text-slate-600">決済完了後、自動的にダッシュボードに遷移し、会員番号が付与されます</p>
              </div>
            </div>
          </div>
        </div>
      )
    },

    // 3. ダッシュボード
    {
      id: 'dashboard',
      title: 'ダッシュボードの使い方',
      icon: <LayoutDashboard className="h-5 w-5" aria-hidden="true" />,
      forRoles: ['member', 'fp', 'manager', 'admin'],
      content: (
        <div className="space-y-6">
          <p className="text-slate-700">
            ログイン後に表示されるダッシュボードから、各種機能にアクセスできます。
          </p>

          <div>
            <h4 className="font-semibold mb-3">サイドバーメニュー</h4>
            <p className="text-sm text-slate-600 mb-3">左側のサイドバーから各機能にアクセスできます。ロールによって表示されるメニューが異なります。</p>

            <div className="grid gap-2">
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                <GraduationCap className="h-4 w-4 text-slate-500" aria-hidden="true" />
                <span className="text-sm">教育コンテンツ - コース・レッスンの視聴</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                <FileText className="h-4 w-4 text-slate-500" aria-hidden="true" />
                <span className="text-sm">資料 - PDFなどの資料ダウンロード</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                <Calendar className="h-4 w-4 text-slate-500" aria-hidden="true" />
                <span className="text-sm">イベント - イベントへの参加登録</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                <Bell className="h-4 w-4 text-slate-500" aria-hidden="true" />
                <span className="text-sm">通知 - お知らせの確認</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">確認ポイント</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li>サイドバーのメニューがロールに応じて表示されるか</li>
              <li>アクティブなメニューがハイライトされるか</li>
              <li>モバイル表示でハンバーガーメニューが動作するか</li>
              <li>ユーザー名とロールが正しく表示されるか</li>
            </ul>
          </div>
        </div>
      )
    },

    // 4. 教育コンテンツ
    {
      id: 'courses',
      title: '教育コンテンツ（コース・レッスン）',
      icon: <GraduationCap className="h-5 w-5" aria-hidden="true" />,
      forRoles: ['member', 'fp', 'manager', 'admin'],
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold mb-3">コースの種類</h4>
            <div className="grid gap-2">
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                <span className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded">基礎編</span>
                <span className="text-sm">所得を増やす - 全ロールがアクセス可能</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded">実践編</span>
                <span className="text-sm">生き方を豊かにする - FP以上がアクセス可能</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-purple-50 rounded border border-purple-200">
                <span className="px-2 py-1 bg-purple-200 text-purple-800 text-xs rounded">応用編</span>
                <span className="text-sm">スタートアップ支援 - FP以上がアクセス可能</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">操作手順</h4>
            <ol className="list-decimal list-inside space-y-2 text-slate-700">
              <li>サイドバーから「教育コンテンツ」をクリック</li>
              <li>コース一覧から学習したいコースを選択</li>
              <li>「学習を始める」ボタンをクリック</li>
              <li>動画を視聴（90%以上で完了扱い）</li>
              <li>次のレッスンへ進む</li>
            </ol>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">確認ポイント</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
              <li>コース一覧が正しく表示されるか</li>
              <li>ロックされたコースに「FPエイド限定」と表示されるか</li>
              <li>動画が再生されるか（Vimeo連携）</li>
              <li>視聴進捗が保存されるか</li>
              <li>90%以上視聴で「完了」になるか</li>
              <li>NEWバッジが新しいコースに表示されるか</li>
            </ul>
          </div>
        </div>
      )
    },

    // 5. イベント
    {
      id: 'events',
      title: 'イベント参加',
      icon: <Calendar className="h-5 w-5" aria-hidden="true" />,
      forRoles: ['member', 'fp', 'manager', 'admin'],
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold mb-3">イベントの種類</h4>
            <div className="grid gap-2">
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                <span className="text-sm"><strong>オンライン:</strong> Zoom等でのオンライン開催</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                <span className="text-sm"><strong>オフライン:</strong> 会場での対面開催</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                <span className="text-sm"><strong>ハイブリッド:</strong> オンライン・オフライン両方</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">参加登録の手順</h4>
            <ol className="list-decimal list-inside space-y-2 text-slate-700">
              <li>サイドバーから「イベント」をクリック</li>
              <li>参加したいイベントの「参加登録」ボタンをクリック</li>
              <li>有料イベントの場合は決済ページへ</li>
              <li>登録完了</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold mb-3">出席確認方法</h4>
            <div className="space-y-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <p className="font-medium text-green-800">方法1: 参加コード入力</p>
                <p className="text-sm text-green-700">イベント当日に告知される参加コードを入力して出席完了</p>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="font-medium text-blue-800">方法2: 録画視聴+アンケート</p>
                <p className="text-sm text-blue-700">録画を視聴 → 「視聴完了」をクリック → アンケート回答で出席完了</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">確認ポイント</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
              <li>イベント一覧が表示されるか</li>
              <li>対象ロール以外のイベントが非表示になっているか</li>
              <li>参加登録ができるか</li>
              <li>有料イベントで決済ができるか</li>
              <li>参加コード入力が動作するか</li>
            </ul>
          </div>
        </div>
      )
    },

    // 6. FP昇格
    {
      id: 'fp-promotion',
      title: 'FPエイドへの昇格',
      icon: <Award className="h-5 w-5" aria-hidden="true" />,
      forRoles: ['member', 'fp', 'manager', 'admin'],
      content: (
        <div className="space-y-6">
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <p className="text-primary-800">
              UGS会員がFPエイドに昇格するには、以下の条件をすべて満たす必要があります。
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-3">昇格条件（申請前）</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded">
                <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold">1</div>
                <div>
                  <p className="font-medium">LP面談の完了</p>
                  <p className="text-sm text-slate-600">/dashboard/lp-meeting/request から面談をリクエスト</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded">
                <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                <div>
                  <p className="font-medium">基礎テスト合格（80%以上）</p>
                  <p className="text-sm text-slate-600">/dashboard/basic-test でテストを受験</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded">
                <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold">3</div>
                <div>
                  <p className="font-medium">アンケート提出</p>
                  <p className="text-sm text-slate-600">/dashboard/survey でアンケートに回答</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">申請後の手続き</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded">
                <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold">4</div>
                <div>
                  <p className="font-medium">管理者の承認を待つ</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded">
                <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold">5</div>
                <div>
                  <p className="font-medium">連絡先情報の確認</p>
                  <p className="text-sm text-slate-600">電話番号・LINE IDの入力</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded">
                <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold">6</div>
                <div>
                  <p className="font-medium">コンプライアンステスト合格（90%以上）</p>
                  <p className="text-sm text-slate-600">/dashboard/compliance-test で受験</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded">
                <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold">7</div>
                <div>
                  <p className="font-medium">ガイダンス動画視聴</p>
                  <p className="text-sm text-slate-600">/dashboard/fp-onboarding で90%以上視聴</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">確認ポイント</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
              <li>/dashboard/promotion で条件達成状況が表示されるか</li>
              <li>条件を満たすと「FP昇格申請」ボタンが表示されるか</li>
              <li>承認後にオンボーディングフローに遷移するか</li>
              <li>コンプライアンステストが動作するか</li>
            </ul>
          </div>
        </div>
      )
    },

    // 7. 紹介機能
    {
      id: 'referrals',
      title: '紹介機能',
      icon: <UserCheck className="h-5 w-5" aria-hidden="true" />,
      forRoles: ['member', 'fp', 'manager', 'admin'],
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold mb-3">紹介の仕組み</h4>
            <ol className="list-decimal list-inside space-y-2 text-slate-700">
              <li>/dashboard/referrals で自分の紹介コードを確認</li>
              <li>紹介リンクをコピー（例: /register?ref=ABC12345）</li>
              <li>知人にリンクを共有</li>
              <li>知人が登録・決済完了すると紹介実績としてカウント</li>
            </ol>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">確認ポイント</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
              <li>紹介コードが表示されるか</li>
              <li>紹介リンクがコピーできるか</li>
              <li>紹介実績（UGS会員紹介数、FPエイド紹介数）が表示されるか</li>
            </ul>
          </div>
        </div>
      )
    },

    // 8. 報酬管理（FP以上）
    {
      id: 'compensation',
      title: '報酬管理',
      icon: <DollarSign className="h-5 w-5" aria-hidden="true" />,
      forRoles: ['fp', 'manager', 'admin'],
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">
              FPエイド以上のロールで報酬管理機能を利用できます。
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-3">報酬の確認方法</h4>
            <ol className="list-decimal list-inside space-y-2 text-slate-700">
              <li>サイドバーから「報酬管理」をクリック</li>
              <li>月別の報酬一覧を確認</li>
              <li>ステータス（PENDING/CONFIRMED/PAID）を確認</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold mb-3">口座情報の登録</h4>
            <p className="text-sm text-slate-600 mb-2">/dashboard/settings/bank-account で振込先口座を登録してください。</p>
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm">
              <p className="text-yellow-800">ゆうちょ銀行の場合は、記号・番号から自動変換されます。</p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">確認ポイント</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
              <li>報酬一覧が表示されるか</li>
              <li>報酬の内訳が確認できるか</li>
              <li>口座情報が登録・更新できるか</li>
            </ul>
          </div>
        </div>
      )
    },

    // 9. 個別相談
    {
      id: 'consultation',
      title: '個別相談',
      icon: <MessageSquare className="h-5 w-5" aria-hidden="true" />,
      forRoles: ['member', 'fp', 'manager', 'admin'],
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold mb-3">相談ジャンル</h4>
            <div className="grid gap-2">
              <div className="p-2 bg-slate-50 rounded text-sm">ライフプラン（将来設計、資産形成）</div>
              <div className="p-2 bg-slate-50 rounded text-sm">住宅（住宅ローン、購入相談）</div>
              <div className="p-2 bg-slate-50 rounded text-sm">転職（キャリア相談）</div>
              <div className="p-2 bg-slate-50 rounded text-sm">賃貸（賃貸物件相談）</div>
              <div className="p-2 bg-slate-50 rounded text-sm">その他</div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">相談申請の手順</h4>
            <ol className="list-decimal list-inside space-y-2 text-slate-700">
              <li>サイドバーから「個別相談」をクリック</li>
              <li>相談ジャンルを選択</li>
              <li>電話番号・相談内容・希望日時を入力</li>
              <li>「申請する」をクリック</li>
            </ol>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">確認ポイント</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
              <li>相談申請フォームが表示されるか</li>
              <li>添付ファイルがアップロードできるか</li>
              <li>相談履歴が確認できるか（/dashboard/consultation/history）</li>
            </ul>
          </div>
        </div>
      )
    },

    // 10. 設定
    {
      id: 'settings',
      title: 'プロフィール・設定',
      icon: <Settings className="h-5 w-5" aria-hidden="true" />,
      forRoles: ['member', 'fp', 'manager', 'admin'],
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold mb-3">設定メニュー</h4>
            <div className="grid gap-2">
              <div className="p-3 bg-slate-50 rounded">
                <p className="font-medium">プロフィール設定</p>
                <p className="text-sm text-slate-600">/dashboard/settings/profile - 名前、電話番号、住所、プロフィール画像など</p>
              </div>
              <div className="p-3 bg-slate-50 rounded">
                <p className="font-medium">アカウント設定</p>
                <p className="text-sm text-slate-600">/dashboard/settings/account - パスワード変更、退会申請</p>
              </div>
              <div className="p-3 bg-slate-50 rounded">
                <p className="font-medium">サブスクリプション</p>
                <p className="text-sm text-slate-600">/dashboard/settings/subscription - 支払い方法、解約</p>
              </div>
              <div className="p-3 bg-slate-50 rounded">
                <p className="font-medium">口座情報</p>
                <p className="text-sm text-slate-600">/dashboard/settings/bank-account - 振込先口座登録（FP以上）</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">確認ポイント</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
              <li>会員番号が表示されるか（読み取り専用）</li>
              <li>プロフィール画像がアップロードできるか</li>
              <li>パスワード変更が動作するか</li>
            </ul>
          </div>
        </div>
      )
    },

    // ===== 管理者向けセクション =====

    // 11. 管理者ダッシュボード
    {
      id: 'admin-dashboard',
      title: '【管理者】ダッシュボード・分析',
      icon: <Shield className="h-5 w-5" aria-hidden="true" />,
      forRoles: ['admin'],
      content: (
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">このセクションは管理者（ADMIN）向けです。</p>
          </div>

          <div>
            <h4 className="font-semibold mb-3">管理者メニュー</h4>
            <p className="text-sm text-slate-600 mb-3">サイドバーの「管理」カテゴリから各機能にアクセスできます。</p>

            <div className="grid gap-2 text-sm">
              <div className="p-2 bg-slate-50 rounded">/dashboard/admin/users - ユーザー管理</div>
              <div className="p-2 bg-slate-50 rounded">/dashboard/admin/analytics - 分析</div>
              <div className="p-2 bg-slate-50 rounded">/dashboard/admin/events - イベント管理</div>
              <div className="p-2 bg-slate-50 rounded">/dashboard/admin/courses - コース管理</div>
              <div className="p-2 bg-slate-50 rounded">/dashboard/admin/materials - 資料管理</div>
              <div className="p-2 bg-slate-50 rounded">/dashboard/admin/compensations - 報酬管理</div>
              <div className="p-2 bg-slate-50 rounded">/dashboard/admin/promotions - 昇格申請管理</div>
              <div className="p-2 bg-slate-50 rounded">/dashboard/admin/consultations - 個別相談管理</div>
            </div>
          </div>
        </div>
      )
    },

    // 12. ユーザー管理
    {
      id: 'admin-users',
      title: '【管理者】ユーザー管理',
      icon: <Users className="h-5 w-5" aria-hidden="true" />,
      forRoles: ['admin'],
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold mb-3">ユーザー一覧（/dashboard/admin/users）</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li>名前、メール、会員番号で検索</li>
              <li>ロール別、ステータス別でフィルター</li>
              <li>ユーザー詳細ページへ遷移</li>
              <li>CSVエクスポート</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">ロール変更</h4>
            <ol className="list-decimal list-inside space-y-2 text-slate-700">
              <li>ユーザー一覧から対象ユーザーを選択</li>
              <li>ロールのプルダウンから新しいロールを選択</li>
              <li>確認ダイアログで「変更」をクリック</li>
            </ol>
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm mt-2">
              <p className="text-yellow-800">
                <strong>注意:</strong> FPからMEMBERに変更すると、コンプライアンステスト合格状態がリセットされます。
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">確認ポイント</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
              <li>ユーザー検索が動作するか</li>
              <li>フィルターが動作するか</li>
              <li>ロール変更が反映されるか</li>
              <li>CSVエクスポートができるか</li>
            </ul>
          </div>
        </div>
      )
    },

    // 13. イベント管理
    {
      id: 'admin-events',
      title: '【管理者】イベント管理',
      icon: <Calendar className="h-5 w-5" aria-hidden="true" />,
      forRoles: ['admin'],
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold mb-3">イベント作成</h4>
            <ol className="list-decimal list-inside space-y-2 text-slate-700">
              <li>/dashboard/admin/events で「新規作成」をクリック</li>
              <li>タイトル、日時、場所を入力</li>
              <li>対象ロールを選択（複数可）</li>
              <li>有料イベントの場合は価格を設定</li>
              <li>サムネイル画像をアップロード（オプション）</li>
              <li>「作成」をクリック</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold mb-3">出席確認の設定</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li><strong>参加コード:</strong> イベント当日に告知するコードを設定</li>
              <li><strong>録画URL:</strong> Vimeo URLを設定（後日視聴用）</li>
              <li><strong>アンケートURL:</strong> Google Formなどのリンクを設定</li>
            </ul>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">確認ポイント</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
              <li>イベント作成ができるか</li>
              <li>対象ロール以外のユーザーにイベントが表示されないか</li>
              <li>有料イベントの決済が動作するか</li>
              <li>参加者一覧が確認できるか</li>
            </ul>
          </div>
        </div>
      )
    },

    // 14. コンプライアンステスト管理
    {
      id: 'admin-compliance',
      title: '【管理者】コンプライアンステスト管理',
      icon: <ClipboardList className="h-5 w-5" aria-hidden="true" />,
      forRoles: ['admin'],
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold mb-3">問題管理（/dashboard/admin/compliance-test）</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li>問題一覧の表示</li>
              <li>新規問題の作成（質問、選択肢、正解、解説）</li>
              <li>問題の編集・削除</li>
              <li>並び順の変更（ドラッグ&ドロップ）</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">受験履歴の確認</h4>
            <p className="text-sm text-slate-600">各FPエイドの受験履歴（スコア、合否、受験日時）を確認できます。</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">確認ポイント</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
              <li>問題の追加・編集・削除ができるか</li>
              <li>並び順の変更が保存されるか</li>
              <li>受験履歴が表示されるか</li>
            </ul>
          </div>
        </div>
      )
    },

    // 15. 報酬・契約管理
    {
      id: 'admin-compensation',
      title: '【管理者】報酬・契約管理',
      icon: <DollarSign className="h-5 w-5" aria-hidden="true" />,
      forRoles: ['admin'],
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold mb-3">CSV一括アップロード</h4>
            <ol className="list-decimal list-inside space-y-2 text-slate-700">
              <li>/dashboard/admin/csv-upload にアクセス</li>
              <li>契約データのCSVファイルを選択</li>
              <li>プレビューでデータを確認</li>
              <li>「確定」をクリック</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold mb-3">報酬管理フロー</h4>
            <div className="flex items-center gap-2 text-sm">
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">PENDING</span>
              <span>→</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">CONFIRMED</span>
              <span>→</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded">PAID</span>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">確認ポイント</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
              <li>CSVアップロード・プレビューが動作するか</li>
              <li>報酬の承認ができるか</li>
              <li>支払い完了の処理ができるか</li>
            </ul>
          </div>
        </div>
      )
    },

    // 16. 昇格申請管理
    {
      id: 'admin-promotions',
      title: '【管理者】昇格申請管理',
      icon: <Award className="h-5 w-5" aria-hidden="true" />,
      forRoles: ['admin'],
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold mb-3">FP昇格申請（/dashboard/admin/promotions）</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li>申請一覧を確認</li>
              <li>条件達成状況を確認（LP面談、基礎テスト、アンケート）</li>
              <li>承認 or 却下（却下の場合は理由を入力）</li>
            </ul>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">確認ポイント</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
              <li>申請一覧が表示されるか</li>
              <li>承認・却下が動作するか</li>
              <li>承認後にユーザーがオンボーディングに進めるか</li>
            </ul>
          </div>
        </div>
      )
    },

    // 17. FAQ
    {
      id: 'faq',
      title: 'FAQ・よくある質問',
      icon: <HelpCircle className="h-5 w-5" aria-hidden="true" />,
      forRoles: ['member', 'fp', 'manager', 'admin'],
      content: (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <p className="font-medium mb-2">Q: パスワードを忘れました</p>
              <p className="text-sm text-slate-600">
                A: ログイン画面の「パスワードをお忘れの方」から再設定できます。
                登録メールアドレスにリセットリンクが送信されます。
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <p className="font-medium mb-2">Q: 動画が再生されません</p>
              <p className="text-sm text-slate-600">
                A: ブラウザのキャッシュをクリアするか、別のブラウザをお試しください。
                推奨: Chrome、Safari、Firefox の最新版
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <p className="font-medium mb-2">Q: 決済エラーが発生しました</p>
              <p className="text-sm text-slate-600">
                A: カード情報を確認の上、再度お試しください。
                解決しない場合はお問い合わせフォームからご連絡ください。
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <p className="font-medium mb-2">Q: 退会したい</p>
              <p className="text-sm text-slate-600">
                A: /dashboard/settings/account の「退会申請」から手続きできます。
                なお、解約後も期間終了までサービスをご利用いただけます。
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">
              その他のご質問は /dashboard/support/contact からお問い合わせください。
            </p>
          </div>
        </div>
      )
    }
  ]

  const filteredSections = roleFilter === 'all'
    ? sections
    : sections.filter(s => s.forRoles.includes(roleFilter))

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-slate-500 hover:text-slate-700">
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">UGSユーザーマニュアル</h1>
                <p className="text-sm text-slate-500">動作確認ガイド</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* フィルター */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium text-slate-700">表示するロール:</span>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'all', label: 'すべて' },
                { value: 'member', label: 'UGS会員' },
                { value: 'fp', label: 'FPエイド' },
                { value: 'manager', label: 'マネージャー' },
                { value: 'admin', label: '管理者' },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setRoleFilter(option.value as typeof roleFilter)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    roleFilter === option.value
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* セクション一覧 */}
        <div className="space-y-4">
          {filteredSections.map(section => (
            <div key={section.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600">
                  {section.icon}
                </div>
                <span className="flex-1 text-left font-medium text-slate-900">{section.title}</span>
                <div className="flex items-center gap-2">
                  {section.forRoles.includes('admin') && section.forRoles.length === 1 && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">管理者専用</span>
                  )}
                  {expandedSections.has(section.id) ? (
                    <ChevronDown className="h-5 w-5 text-slate-400" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-slate-400" aria-hidden="true" />
                  )}
                </div>
              </button>
              {expandedSections.has(section.id) && (
                <div className="px-4 pb-4 border-t border-slate-100">
                  <div className="pt-4">
                    {section.content}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* フッター */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>最終更新: 2025-12-03</p>
          <p className="mt-1">
            ご不明点は <Link href="/dashboard/support/contact" className="text-primary-600 hover:underline">お問い合わせ</Link> からご連絡ください。
          </p>
        </div>
      </main>
    </div>
  )
}

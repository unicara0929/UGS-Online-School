-- =====================================================
-- Row Level Security (RLS) の有効化
-- =====================================================
-- 目的: Supabase Security Advisorの警告を解消する
--
-- 設計方針:
-- - 全テーブルでRLSを有効化
-- - ポリシーは設定しない（全アクセス拒否）
-- - サーバーサイドAPI（service_roleキー）経由のアクセスはRLSをバイパス
-- - フロントエンドからの直接アクセス（anonキー）は全て拒否
--
-- 注意: このアプリはサーバーサイドAPI経由でのみDBアクセスするため
--       既存機能への影響はありません
-- =====================================================

-- ユーザー関連
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- コース・学習関連
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- イベント関連
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- 報酬・契約関連
ALTER TABLE public.compensations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- 昇格申請関連
ALTER TABLE public.fp_promotion_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_applications ENABLE ROW LEVEL SECURITY;

-- LP面談関連
ALTER TABLE public.lp_meetings ENABLE ROW LEVEL SECURITY;

-- テスト・アンケート関連
ALTER TABLE public.basic_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.basic_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_submissions ENABLE ROW LEVEL SECURITY;

-- 退会・ステータス関連
ALTER TABLE public.cancel_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_change_history ENABLE ROW LEVEL SECURITY;

-- メール関連
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- 通知関連
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_reads ENABLE ROW LEVEL SECURITY;

-- FAQ・お問い合わせ関連
ALTER TABLE public.faq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- 名刺関連
ALTER TABLE public.business_card_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_card_orders ENABLE ROW LEVEL SECURITY;

-- 新着通知関連
ALTER TABLE public.user_category_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_content_views ENABLE ROW LEVEL SECURITY;

-- 個別相談
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

-- 事前アンケート関連
ALTER TABLE public.pre_interview_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_interview_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_interview_answers ENABLE ROW LEVEL SECURITY;

-- コンプライアンステスト関連
ALTER TABLE public.compliance_test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_test_answers ENABLE ROW LEVEL SECURITY;

-- 全体MTG免除申請
ALTER TABLE public.mtg_exemptions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 確認用クエリ（実行後にこれを実行して確認）
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
-- =====================================================

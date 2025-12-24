-- RLS（Row Level Security）を有効化
-- これらのテーブルはPrisma経由でサーバーサイドからのみアクセスされるため、
-- RLSを有効にしつつ、service_roleキーを使用するサーバーからのアクセスは許可する

-- event_surveys テーブル
ALTER TABLE public.event_surveys ENABLE ROW LEVEL SECURITY;

-- event_survey_questions テーブル
ALTER TABLE public.event_survey_questions ENABLE ROW LEVEL SECURITY;

-- event_survey_responses テーブル
ALTER TABLE public.event_survey_responses ENABLE ROW LEVEL SECURITY;

-- event_survey_answers テーブル
ALTER TABLE public.event_survey_answers ENABLE ROW LEVEL SECURITY;

-- manager_ranges テーブル
ALTER TABLE public.manager_ranges ENABLE ROW LEVEL SECURITY;

-- manager_assessments テーブル
ALTER TABLE public.manager_assessments ENABLE ROW LEVEL SECURITY;

-- manager_monthly_sales テーブル
ALTER TABLE public.manager_monthly_sales ENABLE ROW LEVEL SECURITY;

-- 注意: このアプリケーションではPrismaからservice_roleキーを使用してアクセスするため、
-- RLSポリシーを追加しなくてもサーバーサイドからのアクセスは可能です。
-- service_roleキーはRLSをバイパスします。

-- もしクライアントサイドから直接Supabaseにアクセスする場合は、
-- 以下のようなポリシーを追加する必要があります：
-- CREATE POLICY "Allow authenticated users to read" ON public.event_surveys
--   FOR SELECT USING (auth.role() = 'authenticated');

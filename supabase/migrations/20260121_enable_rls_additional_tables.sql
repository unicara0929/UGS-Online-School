-- RLS（Row Level Security）を有効化 - 追加テーブル
-- これらのテーブルはPrisma経由でサーバーサイドからのみアクセスされるため、
-- RLSを有効にしつつ、service_roleキーを使用するサーバーからのアクセスは許可する

-- external_event_registrations テーブル
ALTER TABLE public.external_event_registrations ENABLE ROW LEVEL SECURITY;

-- event_schedules テーブル
ALTER TABLE public.event_schedules ENABLE ROW LEVEL SECURITY;

-- survey_templates テーブル
ALTER TABLE public.survey_templates ENABLE ROW LEVEL SECURITY;

-- material_folders テーブル
ALTER TABLE public.material_folders ENABLE ROW LEVEL SECURITY;

-- 注意: このアプリケーションではPrismaからservice_roleキーを使用してアクセスするため、
-- RLSポリシーを追加しなくてもサーバーサイドからのアクセスは可能です。
-- service_roleキーはRLSをバイパスします。

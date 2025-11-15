-- FPエイド向け動画ガイダンス完了フラグを追加
-- 既存ユーザーはデフォルトでtrue（完了済み）として扱う

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "fpOnboardingCompleted" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "fpOnboardingCompletedAt" TIMESTAMP(3);

-- 既存のFPエイドユーザーは完了済みとして扱う（既に運用中なので）
-- 新規にFPエイドに昇格したユーザーのみ未完了として扱う

COMMENT ON COLUMN "users"."fpOnboardingCompleted" IS 'FPエイド向け動画ガイダンス完了フラグ（既存ユーザーはtrue）';
COMMENT ON COLUMN "users"."fpOnboardingCompletedAt" IS 'FPエイド向け動画ガイダンス完了日時';


# Vercel環境変数の確認手順

## 確認すべき環境変数

以下の環境変数がVercelに正しく設定されているか確認してください：

### 必須の環境変数：

1. **DATABASE_URL**
   - 接続プール使用の場合: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true`
   - 直接接続の場合: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

2. **DIRECT_URL**
   - `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

3. **NEXT_PUBLIC_SUPABASE_URL**
   - `https://[PROJECT-REF].supabase.co`

4. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - SupabaseのAnon Key

5. **SUPABASE_SERVICE_ROLE_KEY**
   - SupabaseのService Role Key

## Vercelでの確認方法

1. Vercelダッシュボードにログイン
2. プロジェクト `ugs-online-school` を選択
3. **Settings** > **Environment Variables** に移動
4. 上記の環境変数がすべて設定されているか確認
5. `DATABASE_URL` の値が正しいか確認（特に接続プールのURL形式）

## 環境変数を更新する場合

1. **Settings** > **Environment Variables** に移動
2. 更新したい環境変数をクリック
3. 値を更新して保存
4. **Redeploy** を実行してデプロイを再実行

## 接続プールのURL形式

接続プールを使用する場合の正しいURL形式：

```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

または

```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

**注意**: 
- `[PROJECT-REF]` はSupabaseプロジェクトの参照ID
- `[PASSWORD]` はデータベースのパスワード
- `[REGION]` はリージョン（例: `ap-northeast-1`）

## 接続プールが使用できない場合

接続プールが使用できない場合は、直接接続URLに切り替えてください：

```
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

詳細は `DATABASE-CONNECTION-FIX.md` を参照してください。

---

**最終更新**: 2025年1月


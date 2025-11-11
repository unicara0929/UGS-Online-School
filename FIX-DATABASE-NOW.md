# 🚨 緊急：データベース接続エラーの解決（必須対応）

## 問題の原因

Vercelの環境変数 `DATABASE_URL` が接続プールURLになっているため、データベースに接続できません。

**現在の設定（動作していない）:**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres
```

## ✅ 解決方法（5分で完了）

### ステップ1: Supabaseで直接接続URLを取得（1分）

1. [Supabaseダッシュボード](https://app.supabase.com)にログイン
2. プロジェクトを選択
3. **Settings** → **Database** をクリック
4. **Connection string** セクションを開く
5. **URI** タブをクリック（⚠️ **Connection pooling** ではない）
6. 接続文字列をコピー

**例:**
```
postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijklmnop.supabase.co:5432/postgres
```

### ステップ2: Vercelの環境変数を更新（2分）

1. [Vercelダッシュボード](https://vercel.com)にログイン
2. プロジェクト **ugs-online-school** を選択
3. **Settings** タブをクリック
4. 左メニューから **Environment Variables** をクリック
5. `DATABASE_URL` を検索または探す
6. `DATABASE_URL` の行をクリック
7. **Value** フィールドに、ステップ1でコピーした直接接続URLを貼り付け
   - `[YOUR-PASSWORD]` を実際のパスワードに置き換える
8. **Save** をクリック

### ステップ3: デプロイを再実行（2分）

1. **Deployments** タブに移動
2. 最新のデプロイメントの右側の **...** をクリック
3. **Redeploy** を選択
4. 確認ダイアログで **Redeploy** をクリック
5. デプロイ完了を待つ（1-2分）

## 📋 チェックリスト

- [ ] Supabaseで直接接続URL（URIタブ）を取得した
- [ ] Vercelの `DATABASE_URL` を直接接続URLに更新した
- [ ] パスワード部分を実際のパスワードに置き換えた
- [ ] デプロイを再実行した
- [ ] エラーが解消されたか確認した

## ⚠️ 重要な注意事項

- **接続プールURLは現在使用できません** - 直接接続URLに切り替える必要があります
- 直接接続URLの形式: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
- 接続プールURLの形式: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres` （❌ これは使用しない）

## 🔍 確認方法

デプロイ完了後、ブラウザのコンソール（F12）でエラーが解消されているか確認してください。

---

**この手順を実行しない限り、エラーは解消されません。**


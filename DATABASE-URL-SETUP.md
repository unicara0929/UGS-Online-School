# DATABASE_URL設定ガイド

## 🚨 重要: 接続プール設定が必須です

接続プールタイムアウトエラーを防ぐため、`DATABASE_URL`には以下の設定パラメータを含める必要があります。

## ✅ 正しい設定（推奨）

### Transaction Poolerを使用する場合（本番環境・推奨）

```env
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=20&pool_timeout=30&connect_timeout=30"
```

### 直接接続を使用する場合（開発環境）

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?connection_limit=20&pool_timeout=30&connect_timeout=30"
```

## ❌ よくある間違い

### 間違い1: 接続プール設定パラメータが含まれていない

```env
# ❌ 設定不足（エラーの原因）
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
```

**問題点**:
- `aws-1` を使用している（`aws-0` が推奨）
- ポート `5432` を使用している（Transaction Poolerは `6543` を使用）
- 接続プール設定パラメータが含まれていない

### 間違い2: 不完全な設定

```env
# ❌ 一部のパラメータが欠けている
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

**問題点**:
- `connection_limit`、`pool_timeout`、`connect_timeout` が含まれていない

## 📋 設定パラメータの説明

| パラメータ | 値 | 説明 |
|-----------|-----|------|
| `pgbouncer=true` | `true` | Transaction Poolerを使用することを明示 |
| `connection_limit` | `20` | サーバーレス環境での同時接続数（推奨: 20） |
| `pool_timeout` | `30` | 接続プールから接続を取得するまでのタイムアウト（秒） |
| `connect_timeout` | `30` | データベースへの接続確立までのタイムアウト（秒） |

## 🔧 設定手順

### ステップ1: ローカル環境（.env.local）

1. `.env.example`をコピーして`.env.local`を作成
2. `DATABASE_URL`を上記の正しい形式に更新
3. 実際の`[PROJECT-REF]`、`[PASSWORD]`、`[REGION]`を置き換え

```bash
# .env.local を編集
cp .env.example .env.local
# エディタで .env.local を開き、DATABASE_URL を更新
```

### ステップ2: Vercel環境変数の更新（本番環境）

1. [Vercel Dashboard](https://vercel.com)にログイン
2. プロジェクトを選択
3. **Settings** → **Environment Variables** に移動
4. `DATABASE_URL` を編集
5. 上記の正しい形式に更新
6. すべての環境（Production, Preview, Development）にチェック
7. **Save** をクリック
8. **Deployments** → 最新デプロイ → **Redeploy**

### ステップ3: 動作確認

開発サーバーを起動すると、以下のログが表示されるはずです：

```
✅ 接続プール設定が検証されました
✅ Supabase Transaction Poolerが使用されています
```

もし警告が表示される場合：

```
⚠️ 接続プール設定が不完全です。以下のパラメータをDATABASE_URLに追加してください:
   - connection_limit=20
   - pool_timeout=30
   - connect_timeout=30
```

## 🔍 現在の設定を確認する方法

### ローカル環境

```bash
# .env.local を確認
cat .env.local | grep DATABASE_URL
```

### Vercel環境

1. Vercel Dashboard → Settings → Environment Variables
2. `DATABASE_URL` の値を確認

### アプリケーション起動時のログ

アプリケーション起動時に、接続プール設定の検証結果がログに表示されます：

- ✅ `接続プール設定が検証されました` → 設定が正しい
- ⚠️ `接続プール設定が不完全です` → 設定を確認してください

## 📝 実例

### 実際の設定例（Transaction Pooler）

```env
DATABASE_URL="postgresql://postgres.izyxfdmfqezpntbpjbnp:REDACTED_PASSWORD@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=20&pool_timeout=30&connect_timeout=30"
```

**変更点**:
- `aws-1` → `aws-0` に変更
- ポート `5432` → `6543` に変更
- 接続プール設定パラメータを追加

## 🎯 まとめ

**必須の設定**:
1. ✅ `aws-0` を使用（`aws-1` ではない）
2. ✅ ポート `6543` を使用（Transaction Poolerの場合）
3. ✅ `pgbouncer=true` を含める
4. ✅ `connection_limit=20` を含める
5. ✅ `pool_timeout=30` を含める
6. ✅ `connect_timeout=30` を含める

これらの設定がないと、接続プールタイムアウトエラーが発生する可能性があります。


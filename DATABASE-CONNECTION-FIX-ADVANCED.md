# 🔧 データベース接続エラーの追加対処法

## 新たに判明した可能性

Web検索の結果から、以下の可能性が判明しました：

### 1. 接続タイムアウトの設定が不足している

接続タイムアウトが短すぎると、接続エラーが発生する可能性があります。

**対処法:**
Vercelの環境変数 `DATABASE_URL` に `connect_timeout` パラメータを追加してください。

**現在の形式:**
```
postgresql://postgres:[PASSWORD]@db.izyxfdmfqezpntbpjbnp.supabase.co:5432/postgres
```

**修正後の形式:**
```
postgresql://postgres:[PASSWORD]@db.izyxfdmfqezpntbpjbnp.supabase.co:5432/postgres?connect_timeout=30
```

### 2. IPv6とIPv4の互換性の問題

Supabaseの直接接続URLはIPv6のみをサポートしている場合があり、Vercelのサーバーレス環境がIPv4のみの場合、接続エラーが発生する可能性があります。

**対処法:**
セッションプーラー（接続プール）を使用することで、IPv4環境でも接続が可能になります。

**セッションプーラーのURL形式:**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

**例:**
```
postgresql://postgres.izyxfdmfqezpntbpjbnp:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
```

## 🔧 推奨される対処手順

### オプション1: 接続タイムアウトを追加（簡単）

1. Supabaseダッシュボードで **Settings** → **Database** に移動
2. **Connection string** → **URI** タブを選択
3. 接続文字列をコピー
4. 末尾に `?connect_timeout=30` を追加
5. Vercelの環境変数 `DATABASE_URL` を更新
6. デプロイを再実行

**例:**
```
postgresql://postgres:[PASSWORD]@db.izyxfdmfqezpntbpjbnp.supabase.co:5432/postgres?connect_timeout=30
```

### オプション2: セッションプーラーを使用（推奨）

1. Supabaseダッシュボードで **Settings** → **Database** に移動
2. **Connection string** → **Connection pooling** タブを選択
3. **Session mode** を選択
4. 接続文字列をコピー
5. Vercelの環境変数 `DATABASE_URL` を更新
6. デプロイを再実行

**注意:** セッションプーラーが有効になっていることを確認してください。

## 📋 確認チェックリスト

- [ ] Supabaseのデータベースが **Active** になっている
- [ ] 接続タイムアウトパラメータを追加した（オプション1）
- [ ] セッションプーラーを使用している（オプション2）
- [ ] Vercelの環境変数 `DATABASE_URL` を更新した
- [ ] デプロイを再実行した
- [ ] エラーが解消されたか確認した

## ⚠️ 重要な注意事項

- **接続タイムアウトを追加する場合**: パスワードに特殊文字が含まれている場合、URLエンコードが必要です
- **セッションプーラーを使用する場合**: セッションプーラーが有効になっていることを確認してください
- **両方の方法を試す場合**: まず接続タイムアウトを追加し、それでも解決しない場合はセッションプーラーを試してください

---

**推奨: まずは接続タイムアウトを追加してみてください。それでも解決しない場合は、セッションプーラーを使用してください。**


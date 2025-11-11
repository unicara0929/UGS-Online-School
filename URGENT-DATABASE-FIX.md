# 🔴 緊急対応：データベース接続エラーの解決手順

## 現在の状況

接続プールURL `aws-1-ap-northeast-1.pooler.supabase.com:5432` に接続できないため、データベース接続エラーが発生しています。

## ✅ 解決方法：直接接続URLに切り替え

### ステップ1: Supabaseダッシュボードで直接接続URLを取得

1. [Supabaseダッシュボード](https://app.supabase.com)にログイン
2. プロジェクトを選択
3. 左側のメニューから **Settings** > **Database** をクリック
4. **Connection string** セクションを開く
5. **URI** タブを選択（⚠️ **Connection pooling** ではなく、**URI** を選択）
6. 接続文字列をコピー

**接続文字列の形式**:
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

**重要**: 
- `[YOUR-PASSWORD]` の部分を実際のデータベースパスワードに置き換えてください
- `[PROJECT-REF]` の部分は既に正しい値が入っているはずです

### ステップ2: Vercelの環境変数を更新

1. [Vercelダッシュボード](https://vercel.com)にログイン
2. プロジェクト **ugs-online-school** を選択
3. 上部のタブから **Settings** をクリック
4. 左側のメニューから **Environment Variables** をクリック
5. `DATABASE_URL` を探す（検索ボックスで検索できます）
6. `DATABASE_URL` の行をクリックして編集
7. **Value** フィールドに、ステップ1で取得した直接接続URLを貼り付け
   - 例: `postgresql://postgres:yourpassword123@db.abcdefghijklmnop.supabase.co:5432/postgres`
8. **Save** をクリック

### ステップ3: デプロイを再実行

1. Vercelダッシュボードで **Deployments** タブに移動
2. 最新のデプロイメントの右側にある **...** メニューをクリック
3. **Redeploy** を選択
4. 確認ダイアログで **Redeploy** をクリック
5. デプロイが完了するまで待つ（通常1-2分）

### ステップ4: 動作確認

デプロイ完了後、アプリケーションにアクセスして、データベース接続エラーが解消されたか確認してください。

## 📝 接続URLの形式

### ❌ 現在（接続プール - 動作していない）
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres
```

### ✅ 推奨（直接接続 - これに切り替える）
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

## ⚠️ 注意事項

- **直接接続は接続数の制限があるため、本番環境では接続プールの使用を推奨します**
- 直接接続は一時的な対処として使用し、接続プールの問題が解決したら再度切り替えることを推奨します
- 接続プールが使用できない場合は、Supabaseのサポートに問い合わせることを検討してください

## 🔍 接続プールの問題が解決したら

将来的に接続プールが使用できるようになったら、以下の手順で接続プールに戻すことができます：

1. Supabaseダッシュボードで **Settings** > **Database** に移動
2. **Connection Pooling** セクションを確認
3. 接続プールが有効になっていることを確認
4. **Connection pooling** タブの接続文字列をコピー
5. Vercelの環境変数 `DATABASE_URL` を更新
6. デプロイを再実行

---

**最終更新**: 2025年1月


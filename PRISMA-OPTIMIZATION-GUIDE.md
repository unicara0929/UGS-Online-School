# Prisma接続プール最適化ガイド

## 根本的な最適化の実装

### 1. Prismaクライアントのシングルトン化（✅ 実装済み）

- `globalForPrisma`を使用してグローバル変数に保存
- モジュール再読み込み時も同じインスタンスを再利用
- サーバーレス環境での接続プールの効率を最大化

### 2. 接続プール設定の最適化（⚠️ 環境変数で設定が必要）

**重要**: 接続プールの設定は、コードで追加するのではなく、**Vercel環境変数で直接設定**することを強く推奨します。

#### Vercel環境変数の設定

```
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=20&pool_timeout=30&connect_timeout=30"
```

または、直接接続を使用する場合：

```
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?connection_limit=20&pool_timeout=30&connect_timeout=30"
```

#### 推奨設定値

- **connection_limit**: `20` - サーバーレス環境では同時リクエストが多いため
- **pool_timeout**: `30` - 接続プールから接続を取得するまでのタイムアウト（秒）
- **connect_timeout**: `30` - データベースへの接続確立までのタイムアウト（秒）

### 3. Supabase接続プールの使用（推奨）

Supabaseの**Transaction Pooler**を使用することで、接続プールの効率が大幅に向上します。

- **ポート**: `6543` (Transaction Pooler)
- **URL形式**: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true`

### 4. 接続管理の最適化

#### サーバーレス環境での注意点

- **接続の切断は不要**: Next.jsのサーバーレス環境では、各リクエストが独立したLambda関数として実行されるため、`prisma.$disconnect()`を呼ぶ必要はありません
- **接続の再利用**: Prismaクライアントは自動的に接続を管理し、接続プールから接続を再利用します
- **グローバル変数の活用**: `globalForPrisma`を使用することで、同じLambda関数内での接続再利用が可能

### 5. パフォーマンスモニタリング

接続プールのパフォーマンスを監視するために、以下を確認してください：

1. **Vercelのログ**: 接続タイムアウトエラーが発生していないか
2. **Supabaseダッシュボード**: データベース接続数とアクティブ接続数を確認
3. **Prismaログ**: 接続エラーやタイムアウトが発生していないか

## トラブルシューティング

### 接続プールタイムアウトエラーが発生する場合

1. **環境変数の確認**: `DATABASE_URL`に`connection_limit`、`pool_timeout`、`connect_timeout`が設定されているか確認
2. **接続プールの使用**: Transaction Poolerを使用しているか確認
3. **接続数の調整**: `connection_limit`を増やす（最大値はSupabaseプランによる）
4. **タイムアウトの延長**: `pool_timeout`と`connect_timeout`を延長

### 接続数が不足する場合

- `connection_limit`を増やす
- Supabaseプランのアップグレードを検討
- 接続プールの使用を確認

## まとめ

根本的な最適化のポイント：

1. ✅ **Prismaクライアントのシングルトン化** - 実装済み
2. ⚠️ **接続プール設定の最適化** - Vercel環境変数で設定が必要
3. ✅ **接続管理の最適化** - サーバーレス環境での自動管理を活用
4. ✅ **Supabase接続プールの使用** - Transaction Poolerの使用を推奨

**重要**: 接続プールの設定は、コードで追加するのではなく、**Vercel環境変数で直接設定**することで、より確実に最適化されます。


import { ProtectedRoute } from '@/components/auth/protected-route'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function TeamPage() {
  const placeholderMembers = [
    { name: '田中 太郎', email: 'member@example.com', role: 'MEMBER', status: '学習中' },
    { name: '佐藤 花子', email: 'fp@example.com', role: 'FP', status: '決済アクティブ' },
  ]

  return (
    <ProtectedRoute requiredRoles={['manager', 'admin']}>
      <div className="min-h-screen p-6 space-y-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">チーム管理</h1>
          <p className="text-slate-600 mt-1">配下メンバーの一覧（プレースホルダー）</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>メンバー一覧</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名前</TableHead>
                  <TableHead>メール</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>状況</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {placeholderMembers.map((m) => (
                  <TableRow key={m.email}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>{m.email}</TableCell>
                    <TableCell>{m.role}</TableCell>
                    <TableCell>{m.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>今後の実装予定</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-slate-700 space-y-1">
              <li>メンバー招待（メール招待）</li>
              <li>ステータス変更／昇格申請の承認フロー</li>
              <li>学習・決済・成果の可視化（集計指標）</li>
              <li>チーム別フィルタ／検索／エクスポート</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}

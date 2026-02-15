'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, CheckCircle, Clock } from 'lucide-react'
import Link from 'next/link'

function VerifyEmailPendingContent() {
  const searchParams = useSearchParams()
  const email = searchParams?.get('email') || ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4 py-6 sm:py-0">
      <Card className="w-full max-w-2xl shadow-2xl border-0">
        <CardHeader className="text-center pb-4 sm:pb-6 px-4 sm:px-6">
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <Mail className="h-6 w-6 sm:h-8 sm:w-8 text-white" aria-hidden="true" />
            </div>
          </div>
          <CardTitle className="text-xl sm:text-3xl font-bold text-slate-900">
            📧 メールアドレスを確認してください
          </CardTitle>
          <CardDescription className="text-sm sm:text-lg mt-2">
            登録を完了するには、メールの確認が必要です
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
          {/* メール送信完了メッセージ */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 mr-2 sm:mr-3 mt-0.5 sm:mt-1 flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold text-blue-900 mb-1 sm:mb-2 text-sm sm:text-base">
                  確認メールを送信しました！
                </p>
                {email && (
                  <p className="text-xs sm:text-sm text-blue-800 mb-2 sm:mb-3 break-all">
                    <strong>{email}</strong> 宛にメールを送信しました。
                  </p>
                )}
                <p className="text-xs sm:text-sm text-blue-700">
                  メール内の「メールアドレスを確認する」ボタンをクリックすると、決済ページへ進むことができます。
                </p>
              </div>
            </div>
          </div>

          {/* 次のステップ */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6">
            <h3 className="font-semibold text-slate-900 mb-3 sm:mb-4 flex items-center text-sm sm:text-base">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-slate-600" aria-hidden="true" />
              次のステップ
            </h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-slate-700 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold mr-2 sm:mr-3 mt-0.5 flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium text-sm sm:text-base">メールボックスを確認</p>
                  <p className="text-xs sm:text-sm text-slate-600">
                    「【UGS】メールアドレスの確認」という件名のメールを探してください
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-slate-700 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold mr-2 sm:mr-3 mt-0.5 flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium text-sm sm:text-base">確認リンクをクリック</p>
                  <p className="text-xs sm:text-sm text-slate-600">
                    メール内の「メールアドレスを確認する」ボタンをクリック
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-slate-700 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold mr-2 sm:mr-3 mt-0.5 flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="font-medium text-sm sm:text-base">決済ページへ進む</p>
                  <p className="text-xs sm:text-sm text-slate-600">
                    自動的に決済ページにリダイレクトされます
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 注意事項 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-start">
              <div className="text-yellow-600 mr-2 sm:mr-3 mt-0.5 flex-shrink-0">⚠️</div>
              <div className="text-xs sm:text-sm text-yellow-800 space-y-2">
                <p className="font-semibold">メールが届かない場合</p>
                <ul className="list-disc list-inside space-y-1 ml-1 sm:ml-2">
                  <li><strong>迷惑メールフォルダ</strong>を確認してください</li>
                  <li>メールアドレスに<strong>間違いがないか</strong>確認してください</li>
                  <li>数分待ってから再度確認してください</li>
                </ul>
                <p className="text-xs text-yellow-700 mt-2 sm:mt-3 pt-2 border-t border-yellow-300">
                  ※ 確認リンクは<strong>24時間有効</strong>です。期限が切れた場合は、再度登録してください。
                </p>
              </div>
            </div>
          </div>

          {/* サポート情報 */}
          <div className="text-center pt-4">
            <p className="text-sm text-slate-600">
              問題が解決しない場合は、サポートまでお問い合わせください
            </p>
            <a
              href="mailto:support@ugs.example.com"
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              support@ugs.example.com
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyEmailPendingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700 mx-auto mb-4"></div>
          <p className="text-slate-600">読み込み中...</p>
        </div>
      </div>
    }>
      <VerifyEmailPendingContent />
    </Suspense>
  )
}

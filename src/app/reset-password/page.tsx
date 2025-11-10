'use client'

import { Suspense } from 'react'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export const dynamic = 'force-dynamic'

function ResetPasswordContent() {
  return <ResetPasswordForm />
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">読み込み中...</h2>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}


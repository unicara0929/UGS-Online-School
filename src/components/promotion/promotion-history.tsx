'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  History,
  Loader2
} from "lucide-react"
import { authenticatedFetch } from '@/lib/utils/api-client'

interface PromotionApplication {
  id: string
  targetRole: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  appliedAt: string
  approvedAt: string | null
  rejectedAt: string | null
  rejectionReason: string | null
}

export function PromotionHistory() {
  const [applications, setApplications] = useState<PromotionApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchApplicationHistory()
  }, [])

  const fetchApplicationHistory = async () => {
    try {
      setIsLoading(true)
      const response = await authenticatedFetch('/api/promotions/history')

      if (!response.ok) {
        throw new Error('申請履歴の取得に失敗しました')
      }

      const data = await response.json()
      setApplications(data.applications || [])
    } catch (error) {
      console.error('Error fetching application history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            審査中
          </Badge>
        )
      case 'APPROVED':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            承認済み
          </Badge>
        )
      case 'REJECTED':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            却下
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'FP':
        return 'FPエイド'
      case 'MANAGER':
        return 'マネージャー'
      default:
        return role
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            申請履歴
          </CardTitle>
          <CardDescription>
            過去の昇格申請の履歴を確認できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          申請履歴
        </CardTitle>
        <CardDescription>
          過去の昇格申請の履歴を確認できます
        </CardDescription>
      </CardHeader>
      <CardContent>
        {applications.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-600">まだ昇格申請の履歴がありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <div
                key={application.id}
                className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">
                        {getRoleLabel(application.targetRole)}への昇格申請
                      </h4>
                      {getStatusBadge(application.status)}
                    </div>
                    <div className="space-y-1 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>申請日: {new Date(application.appliedAt).toLocaleDateString('ja-JP')}</span>
                      </div>
                      {application.approvedAt && (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>承認日: {new Date(application.approvedAt).toLocaleDateString('ja-JP')}</span>
                        </div>
                      )}
                      {application.rejectedAt && (
                        <div className="flex items-center gap-2 text-red-600">
                          <XCircle className="h-4 w-4" />
                          <span>却下日: {new Date(application.rejectedAt).toLocaleDateString('ja-JP')}</span>
                        </div>
                      )}
                    </div>
                    {application.rejectionReason && (
                      <div className="mt-3 p-3 bg-red-50 rounded-lg">
                        <p className="text-sm font-medium text-red-800 mb-1">却下理由</p>
                        <p className="text-sm text-red-700">{application.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

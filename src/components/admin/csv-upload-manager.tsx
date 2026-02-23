'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CompensationCsvUpload } from "./compensation-csv-upload"
import { ContractCsvUpload } from "./contract-csv-upload"
import { CompensationDetailCsvUpload } from "./compensation-detail-csv-upload"
import { DollarSign, FileText, Building2, Shield } from "lucide-react"

type TabValue = 'compensation' | 'contract' | 'detail-real-estate' | 'detail-insurance'

export function CsvUploadManager() {
  const [activeTab, setActiveTab] = useState<TabValue>('compensation')

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>CSV一括アップロード</CardTitle>
          <CardDescription>
            報酬データと契約データをCSVファイルから一括更新できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)}>
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
              <TabsTrigger value="compensation" className="flex items-center gap-1 text-xs sm:text-sm">
                <DollarSign className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">報酬サマリー</span>
                <span className="sm:hidden">報酬</span>
              </TabsTrigger>
              <TabsTrigger value="contract" className="flex items-center gap-1 text-xs sm:text-sm">
                <FileText className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">契約一覧</span>
                <span className="sm:hidden">契約</span>
              </TabsTrigger>
              <TabsTrigger value="detail-real-estate" className="flex items-center gap-1 text-xs sm:text-sm">
                <Building2 className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">報酬内訳（不動産）</span>
                <span className="sm:hidden">不動産</span>
              </TabsTrigger>
              <TabsTrigger value="detail-insurance" className="flex items-center gap-1 text-xs sm:text-sm">
                <Shield className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">報酬内訳（保険）</span>
                <span className="sm:hidden">保険</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="compensation" className="space-y-6 mt-6">
              <CompensationCsvUpload />
            </TabsContent>

            <TabsContent value="contract" className="space-y-6 mt-6">
              <ContractCsvUpload />
            </TabsContent>

            <TabsContent value="detail-real-estate" className="space-y-6 mt-6">
              <CompensationDetailCsvUpload businessType="REAL_ESTATE" />
            </TabsContent>

            <TabsContent value="detail-insurance" className="space-y-6 mt-6">
              <CompensationDetailCsvUpload businessType="INSURANCE" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

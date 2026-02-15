'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CompensationCsvUpload } from "./compensation-csv-upload"
import { ContractCsvUpload } from "./contract-csv-upload"
import { DollarSign, FileText } from "lucide-react"

export function CsvUploadManager() {
  const [activeTab, setActiveTab] = useState<'compensation' | 'contract'>('compensation')

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
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'compensation' | 'contract')}>
            <TabsList className="grid w-full md:w-[400px] grid-cols-2">
              <TabsTrigger value="compensation" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" aria-hidden="true" />
                報酬サマリー
              </TabsTrigger>
              <TabsTrigger value="contract" className="flex items-center gap-2">
                <FileText className="h-4 w-4" aria-hidden="true" />
                契約一覧
              </TabsTrigger>
            </TabsList>

            <TabsContent value="compensation" className="space-y-6 mt-6">
              <CompensationCsvUpload />
            </TabsContent>

            <TabsContent value="contract" className="space-y-6 mt-6">
              <ContractCsvUpload />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

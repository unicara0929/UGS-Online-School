'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell } from "lucide-react"
import { Notification } from "@/lib/types"

interface ActionNotificationsProps {
  notifications: Notification[]
}

export function ActionNotifications({ notifications }: ActionNotificationsProps) {
  const actionNotifications = notifications.filter(n => n.type === "action" && !n.isRead)

  if (actionNotifications.length === 0) {
    return null
  }

  return (
    <div className="mb-6 sm:mb-8">
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
          <CardTitle className="text-red-800 flex items-center text-base sm:text-lg">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5 mr-2" aria-hidden="true" />
            アクション必須
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="space-y-2">
            {actionNotifications.map(notification => (
              <div key={notification.id} className="flex items-center justify-between gap-2 p-2 sm:p-3 bg-white rounded-lg border border-red-200">
                <span className="text-red-800 font-medium text-sm sm:text-base flex-1 min-w-0 truncate">{notification.title}</span>
                <Button size="sm" className="flex-shrink-0 text-xs sm:text-sm h-9 sm:h-9 px-2 sm:px-3">対応する</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

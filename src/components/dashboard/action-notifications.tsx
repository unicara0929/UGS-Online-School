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
    <div className="mb-8">
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800 flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            アクション必須
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {actionNotifications.map(notification => (
              <div key={notification.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                <span className="text-red-800 font-medium">{notification.title}</span>
                <Button size="sm">対応する</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

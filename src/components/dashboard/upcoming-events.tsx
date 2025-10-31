'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "lucide-react"
import { Event } from "@/lib/types"
import { formatDateTime } from "@/lib/utils"

interface UpcomingEventsProps {
  events: Event[]
}

export function UpcomingEvents({ events }: UpcomingEventsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          今後のイベント
        </CardTitle>
        <CardDescription>
          参加予定のイベント一覧
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map(event => (
            <div key={event.id} className="p-4 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-slate-900">{event.title}</h3>
                <Badge variant={event.type === "required" ? "destructive" : "secondary"}>
                  {event.type === "required" ? "必須" : "任意"}
                </Badge>
              </div>
              <p className="text-sm text-slate-600 mb-3">{formatDateTime(event.date)}</p>
              <Button 
                size="sm" 
                variant={event.isRegistered ? "outline" : "default"}
                className="w-full"
              >
                {event.isRegistered ? "キャンセル" : "申し込む"}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

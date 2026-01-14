'use client'

import { useRouter } from "next/navigation"
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
  const router = useRouter()

  const handleEventClick = (eventId: string) => {
    router.push(`/dashboard/events/${eventId}`)
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center text-base sm:text-lg">
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
          今後のイベント
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          参加予定のイベント一覧
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        <div className="space-y-3 sm:space-y-4">
          {events.map(event => (
            <div key={event.id} className="p-3 sm:p-4 border border-slate-200 rounded-xl">
              <div className="flex items-start sm:items-center justify-between gap-2 mb-2">
                <h3 className="font-semibold text-slate-900 text-sm sm:text-base line-clamp-2">{event.title}</h3>
                <Badge variant={event.type === "required" ? "destructive" : "secondary"} className="flex-shrink-0 text-xs">
                  {event.type === "required" ? "必須" : "任意"}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mb-3">{formatDateTime(event.date)}</p>
              <Button
                size="sm"
                variant={event.isRegistered ? "outline" : "default"}
                className="w-full text-xs sm:text-sm h-8 sm:h-9"
                onClick={() => handleEventClick(event.id)}
              >
                {event.isRegistered ? "詳細を見る" : "申し込む"}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

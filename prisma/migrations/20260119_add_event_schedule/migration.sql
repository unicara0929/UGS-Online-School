-- CreateEnum
CREATE TYPE "EventScheduleStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "event_schedules" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT,
    "location" TEXT,
    "onlineMeetingUrl" TEXT,
    "status" "EventScheduleStatus" NOT NULL DEFAULT 'OPEN',
    "attendanceCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_schedules_eventId_idx" ON "event_schedules"("eventId");

-- CreateIndex
CREATE INDEX "event_schedules_date_idx" ON "event_schedules"("date");

-- AddForeignKey
ALTER TABLE "event_schedules" ADD CONSTRAINT "event_schedules_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add scheduleId to EventRegistration
ALTER TABLE "event_registrations" ADD COLUMN "scheduleId" TEXT;

-- CreateIndex
CREATE INDEX "event_registrations_scheduleId_idx" ON "event_registrations"("scheduleId");

-- Add foreign key for scheduleId in EventRegistration
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "event_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop old unique constraint and create new one
ALTER TABLE "event_registrations" DROP CONSTRAINT IF EXISTS "event_registrations_userId_eventId_key";
CREATE UNIQUE INDEX "event_registrations_userId_eventId_scheduleId_key" ON "event_registrations"("userId", "eventId", "scheduleId");

-- Add scheduleId to ExternalEventRegistration
ALTER TABLE "external_event_registrations" ADD COLUMN "scheduleId" TEXT;

-- CreateIndex
CREATE INDEX "external_event_registrations_scheduleId_idx" ON "external_event_registrations"("scheduleId");

-- Add foreign key for scheduleId in ExternalEventRegistration
ALTER TABLE "external_event_registrations" ADD CONSTRAINT "external_event_registrations_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "event_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop old unique constraint and create new one for external registrations
ALTER TABLE "external_event_registrations" DROP CONSTRAINT IF EXISTS "external_event_registrations_email_eventId_key";
CREATE UNIQUE INDEX "external_event_registrations_email_eventId_scheduleId_key" ON "external_event_registrations"("email", "eventId", "scheduleId");

-- Add new columns to events table
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "applicationDeadlineDays" INTEGER;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "attendanceDeadlineDays" INTEGER;

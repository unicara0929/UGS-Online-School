import { prisma } from '@/lib/prisma'

export interface EmailRecipient {
  userId: string
  email: string
  status: 'SENT' | 'FAILED' | 'BOUNCED' | 'INVALID'
  errorMessage?: string
}

export interface CreateEmailCampaignParams {
  subject: string
  body: string
  templateType?: string
  sourceType: 'USER_MANAGEMENT' | 'EVENT_MANAGEMENT'
  eventId?: string
  totalCount: number
  sentBy: string
}

/**
 * メール送信履歴を記録
 */
export async function createEmailCampaign(
  params: CreateEmailCampaignParams,
  recipients: EmailRecipient[]
) {
  const {
    subject,
    body,
    templateType,
    sourceType,
    eventId,
    totalCount,
    sentBy,
  } = params

  const successCount = recipients.filter((r) => r.status === 'SENT').length
  const failedCount = recipients.filter((r) => r.status !== 'SENT').length

  // EmailCampaignを作成
  const campaign = await prisma.emailCampaign.create({
    data: {
      subject,
      body,
      templateType,
      sourceType,
      eventId,
      totalCount,
      successCount,
      failedCount,
      sentBy,
    },
  })

  // EmailLogを一括作成
  if (recipients.length > 0) {
    await prisma.emailLog.createMany({
      data: recipients.map((recipient) => ({
        campaignId: campaign.id,
        userId: recipient.userId,
        email: recipient.email,
        status: recipient.status,
        errorMessage: recipient.errorMessage,
      })),
    })
  }

  return campaign
}

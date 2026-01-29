/**
 * Chatwork API通知ユーティリティ
 */

const CHATWORK_API_URL = 'https://api.chatwork.com/v2'

// ルームID
const CHATWORK_ROOM_IDS = {
  PAYMENT: '420332678',      // 決済／会員管理
  SUPPORT: '420332656',      // サポート／問い合わせ
  PROMOTION: '420332637',    // 昇格・面談
}

// 共通メンション
const NOTIFICATION_MENTIONS = `[To:6658741]野々垣暁洋さん
[To:8995295]安井聡史さん
[To:8991677]小林亮太さん`

/**
 * 日本時間でフォーマットされた日時文字列を返す
 */
function formatJapaneseDateTime(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  })
}

/**
 * 日本時間でフォーマットされた日付文字列を返す
 */
function formatJapaneseDate(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Tokyo',
  })
}

interface ChatworkMessageParams {
  roomId: string
  message: string
}

/**
 * Chatworkにメッセージを送信
 */
async function sendChatworkMessage({ roomId, message }: ChatworkMessageParams): Promise<void> {
  const apiToken = process.env.CHATWORK_API_TOKEN

  if (!apiToken) {
    console.warn('[CHATWORK] CHATWORK_API_TOKEN is not set, skipping notification')
    return
  }

  if (!roomId) {
    console.warn('[CHATWORK] Room ID is not provided, skipping notification')
    return
  }

  try {
    const response = await fetch(`${CHATWORK_API_URL}/rooms/${roomId}/messages`, {
      method: 'POST',
      headers: {
        'X-ChatWorkToken': apiToken,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ body: message }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Chatwork API error: ${response.status} - ${errorText}`)
    }

    console.log('[CHATWORK] Message sent successfully to room:', roomId)
  } catch (error) {
    console.error('[CHATWORK] Failed to send message:', error)
    throw error
  }
}

interface ChatworkTaskParams {
  roomId: string
  body: string
  assigneeIds: string[] // 担当者のアカウントID
  limitType?: 'none' | 'date' | 'time' // 期限タイプ
}

/**
 * Chatworkにタスクを追加
 */
async function addChatworkTask({ roomId, body, assigneeIds, limitType = 'none' }: ChatworkTaskParams): Promise<void> {
  const apiToken = process.env.CHATWORK_API_TOKEN

  if (!apiToken) {
    console.warn('[CHATWORK] CHATWORK_API_TOKEN is not set, skipping task creation')
    return
  }

  if (!roomId) {
    console.warn('[CHATWORK] Room ID is not provided, skipping task creation')
    return
  }

  try {
    const params = new URLSearchParams({
      body,
      to_ids: assigneeIds.join(','),
      limit_type: limitType,
    })

    const response = await fetch(`${CHATWORK_API_URL}/rooms/${roomId}/tasks`, {
      method: 'POST',
      headers: {
        'X-ChatWorkToken': apiToken,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Chatwork API error: ${response.status} - ${errorText}`)
    }

    console.log('[CHATWORK] Task created successfully in room:', roomId)
  } catch (error) {
    console.error('[CHATWORK] Failed to create task:', error)
    throw error
  }
}

/**
 * 名刺注文決済完了通知をChatworkに送信
 */
export async function sendBusinessCardOrderChatworkNotification(params: {
  userName: string
  deliveryMethod: 'PICKUP' | 'SHIPPING'
  // 名刺に記載する連絡先
  email?: string | null
  phoneNumber?: string | null
  // 名刺記載住所
  cardAddress?: {
    postalCode?: string | null
    prefecture?: string | null
    city?: string | null
    addressLine1?: string | null
    addressLine2?: string | null
  }
  // 郵送先住所（郵送の場合のみ）
  shippingAddress?: {
    postalCode?: string | null
    prefecture?: string | null
    city?: string | null
    addressLine1?: string | null
    addressLine2?: string | null
  }
}): Promise<void> {
  const { userName, deliveryMethod, email, phoneNumber, cardAddress, shippingAddress } = params
  const roomId = process.env.CHATWORK_BUSINESS_CARD_ROOM_ID

  if (!roomId) {
    console.warn('[CHATWORK] CHATWORK_BUSINESS_CARD_ROOM_ID is not set, skipping notification')
    return
  }

  const deliveryMethodLabel = deliveryMethod === 'PICKUP'
    ? '本社で手渡し'
    : '郵送'

  // 名刺記載住所を整形
  let cardAddressText = '未設定'
  if (cardAddress) {
    const parts = [
      cardAddress.postalCode ? `〒${cardAddress.postalCode}` : '',
      cardAddress.prefecture || '',
      cardAddress.city || '',
      cardAddress.addressLine1 || '',
      cardAddress.addressLine2 || '',
    ].filter(Boolean)
    if (parts.length > 0) {
      cardAddressText = parts.join(' ')
    }
  }

  // 郵送の場合は郵送先住所を含める
  let shippingAddressText = ''
  if (deliveryMethod === 'SHIPPING' && shippingAddress) {
    const parts = [
      shippingAddress.postalCode ? `〒${shippingAddress.postalCode}` : '',
      shippingAddress.prefecture || '',
      shippingAddress.city || '',
      shippingAddress.addressLine1 || '',
      shippingAddress.addressLine2 || '',
    ].filter(Boolean)
    if (parts.length > 0) {
      shippingAddressText = `\n郵送先住所: ${parts.join(' ')}`
    }
  }

  // メンション先
  const mentions = '[To:9252602]土岐成美さん\n\n'

  const message = `${mentions}[info][title]名刺注文決済完了[/title]ユーザー名: ${userName}
メールアドレス: ${email || '未設定'}
電話番号: ${phoneNumber || '未設定'}
名刺記載住所: ${cardAddressText}
渡す方法: ${deliveryMethodLabel}${shippingAddressText}[/info]`

  try {
    // メッセージを送信
    await sendChatworkMessage({ roomId, message })

    // タスクを追加（土岐さんに割り当て）
    const taskBody = `名刺注文対応：${userName}さん（${deliveryMethodLabel}）`
    await addChatworkTask({
      roomId,
      body: taskBody,
      assigneeIds: ['9252602'], // 土岐成美さん
    })
  } catch (error) {
    console.error('[CHATWORK] Failed to send business card order notification:', error)
    // 通知失敗でも決済処理は続行するため、エラーは再スローしない
  }
}

/**
 * アプリ登録決済通知をChatworkに送信
 * [UGS通知]決済／会員管理 グループ
 */
export async function sendRegistrationPaymentChatworkNotification(params: {
  userName: string
  email: string
  referrerName?: string
  registeredAt?: Date
}): Promise<void> {
  const { userName, email, referrerName, registeredAt = new Date() } = params
  const roomId = CHATWORK_ROOM_IDS.PAYMENT

  const message = `${NOTIFICATION_MENTIONS}

[info][title]アプリ登録決済通知[/title]名前：${userName}
メールアドレス：${email}
紹介者：${referrerName || 'なし'}
登録日時：${formatJapaneseDateTime(registeredAt)}[/info]`

  try {
    await sendChatworkMessage({ roomId, message })
  } catch (error) {
    console.error('[CHATWORK] Failed to send registration payment notification:', error)
  }
}

/**
 * 決済失敗通知をChatworkに送信
 * [UGS通知]決済／会員管理 グループ
 */
export async function sendPaymentFailedChatworkNotification(params: {
  userName: string
  email: string
  failedAt?: Date
  amount: number
}): Promise<void> {
  const { userName, email, failedAt = new Date(), amount } = params
  const roomId = CHATWORK_ROOM_IDS.PAYMENT

  const formattedAmount = new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(amount)

  const message = `${NOTIFICATION_MENTIONS}

[info][title]決済失敗通知[/title]名前：${userName}
メールアドレス：${email}
失敗日時：${formatJapaneseDateTime(failedAt)}
未納金額：${formattedAmount}[/info]`

  try {
    await sendChatworkMessage({ roomId, message })
  } catch (error) {
    console.error('[CHATWORK] Failed to send payment failed notification:', error)
  }
}

/**
 * 退会申請通知をChatworkに送信
 * [UGS通知]決済／会員管理 グループ
 */
export async function sendCancellationChatworkNotification(params: {
  userName: string
  email: string
  cancelledAt?: Date
}): Promise<void> {
  const { userName, email, cancelledAt = new Date() } = params
  const roomId = CHATWORK_ROOM_IDS.PAYMENT

  const message = `${NOTIFICATION_MENTIONS}

[info][title]退会申請通知[/title]名前：${userName}
メールアドレス：${email}
退会日時：${formatJapaneseDateTime(cancelledAt)}[/info]`

  try {
    await sendChatworkMessage({ roomId, message })
  } catch (error) {
    console.error('[CHATWORK] Failed to send cancellation notification:', error)
  }
}

/**
 * 個別相談提出通知をChatworkに送信
 * [UGS通知]サポート／問い合わせ グループ
 */
export async function sendConsultationChatworkNotification(params: {
  userName: string
  email: string
  consultationType: string
  submittedAt?: Date
}): Promise<void> {
  const { userName, email, consultationType, submittedAt = new Date() } = params
  const roomId = CHATWORK_ROOM_IDS.SUPPORT

  const message = `${NOTIFICATION_MENTIONS}

[info][title]個別相談提出通知[/title]名前：${userName}
メールアドレス：${email}
相談ジャンル：${consultationType}
提出日時：${formatJapaneseDateTime(submittedAt)}[/info]`

  try {
    await sendChatworkMessage({ roomId, message })
  } catch (error) {
    console.error('[CHATWORK] Failed to send consultation notification:', error)
  }
}

/**
 * お問い合わせ通知をChatworkに送信
 * [UGS通知]サポート／問い合わせ グループ
 */
export async function sendContactChatworkNotification(params: {
  userName: string
  email: string
  contactType: string
  submittedAt?: Date
}): Promise<void> {
  const { userName, email, contactType, submittedAt = new Date() } = params
  const roomId = CHATWORK_ROOM_IDS.SUPPORT

  const message = `${NOTIFICATION_MENTIONS}

[info][title]お問い合わせ通知[/title]名前：${userName}
メールアドレス：${email}
問い合わせ種別：${contactType}
提出日時：${formatJapaneseDateTime(submittedAt)}[/info]`

  try {
    await sendChatworkMessage({ roomId, message })
  } catch (error) {
    console.error('[CHATWORK] Failed to send contact notification:', error)
  }
}

/**
 * FPエイド昇格承認通知をChatworkに送信
 * [UGS通知]昇格・面談 グループ
 */
export async function sendFPPromotionChatworkNotification(params: {
  userName: string
  email: string
  approvedAt?: Date
}): Promise<void> {
  const { userName, email, approvedAt = new Date() } = params
  const roomId = CHATWORK_ROOM_IDS.PROMOTION

  const message = `${NOTIFICATION_MENTIONS}

[info][title]FPエイド昇格承認通知[/title]名前：${userName}
メールアドレス：${email}
承認日時：${formatJapaneseDateTime(approvedAt)}[/info]`

  try {
    await sendChatworkMessage({ roomId, message })
  } catch (error) {
    console.error('[CHATWORK] Failed to send FP promotion notification:', error)
  }
}

/**
 * MGR昇格承認通知をChatworkに送信
 * [UGS通知]昇格・面談 グループ
 */
export async function sendMGRPromotionChatworkNotification(params: {
  userName: string
  email: string
  approvedAt?: Date
}): Promise<void> {
  const { userName, email, approvedAt = new Date() } = params
  const roomId = CHATWORK_ROOM_IDS.PROMOTION

  const message = `${NOTIFICATION_MENTIONS}

[info][title]MGR昇格承認通知[/title]名前：${userName}
メールアドレス：${email}
承認日時：${formatJapaneseDateTime(approvedAt)}[/info]`

  try {
    await sendChatworkMessage({ roomId, message })
  } catch (error) {
    console.error('[CHATWORK] Failed to send MGR promotion notification:', error)
  }
}

/**
 * LP面談リクエスト通知をChatworkに送信
 * [UGS通知]昇格・面談 グループ
 */
export async function sendLPMeetingRequestChatworkNotification(params: {
  userName: string
  email: string
  preferredDates: Date[]
  requestedAt?: Date
}): Promise<void> {
  const { userName, email, preferredDates, requestedAt = new Date() } = params
  const roomId = CHATWORK_ROOM_IDS.PROMOTION

  const formattedPreferredDates = preferredDates
    .map(date => formatJapaneseDate(date))
    .join(', ')

  const message = `${NOTIFICATION_MENTIONS}

[info][title]LP面談リクエスト通知[/title]名前：${userName}
メールアドレス：${email}
希望日時：${formattedPreferredDates}
申請日時：${formatJapaneseDateTime(requestedAt)}[/info]`

  try {
    await sendChatworkMessage({ roomId, message })
  } catch (error) {
    console.error('[CHATWORK] Failed to send LP meeting request notification:', error)
  }
}

/**
 * LP面談確定通知をChatworkに送信
 * [UGS通知]昇格・面談 グループ
 */
export async function sendLPMeetingScheduledChatworkNotification(params: {
  userName: string
  email: string
  scheduledAt: Date
  counselorName: string
}): Promise<void> {
  const { userName, email, scheduledAt, counselorName } = params
  const roomId = CHATWORK_ROOM_IDS.PROMOTION

  const message = `${NOTIFICATION_MENTIONS}

[info][title]LP面談確定通知[/title]名前：${userName}
メールアドレス：${email}
確定日時：${formatJapaneseDateTime(scheduledAt)}
面談者：${counselorName}[/info]`

  try {
    await sendChatworkMessage({ roomId, message })
  } catch (error) {
    console.error('[CHATWORK] Failed to send LP meeting scheduled notification:', error)
  }
}

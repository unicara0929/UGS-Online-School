/**
 * Chatwork API通知ユーティリティ
 */

const CHATWORK_API_URL = 'https://api.chatwork.com/v2'

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

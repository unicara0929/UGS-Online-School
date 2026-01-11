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

/**
 * 名刺注文決済完了通知をChatworkに送信
 */
export async function sendBusinessCardOrderChatworkNotification(params: {
  userName: string
  deliveryMethod: 'PICKUP' | 'SHIPPING'
  orderId: string
  // 郵送先住所（郵送の場合のみ）
  shippingAddress?: {
    postalCode?: string | null
    prefecture?: string | null
    city?: string | null
    addressLine1?: string | null
    addressLine2?: string | null
  }
}): Promise<void> {
  const { userName, deliveryMethod, orderId, shippingAddress } = params
  const roomId = process.env.CHATWORK_BUSINESS_CARD_ROOM_ID

  if (!roomId) {
    console.warn('[CHATWORK] CHATWORK_BUSINESS_CARD_ROOM_ID is not set, skipping notification')
    return
  }

  const deliveryMethodLabel = deliveryMethod === 'PICKUP'
    ? '本社で手渡し'
    : '郵送'

  // 郵送の場合は住所を含める
  let addressText = ''
  if (deliveryMethod === 'SHIPPING' && shippingAddress) {
    const parts = [
      shippingAddress.postalCode ? `〒${shippingAddress.postalCode}` : '',
      shippingAddress.prefecture || '',
      shippingAddress.city || '',
      shippingAddress.addressLine1 || '',
      shippingAddress.addressLine2 || '',
    ].filter(Boolean)
    if (parts.length > 0) {
      addressText = `\n郵送先: ${parts.join(' ')}`
    }
  }

  const message = `[info][title]名刺注文決済完了[/title]ユーザー名: ${userName}
渡す方法: ${deliveryMethodLabel}${addressText}
注文ID: ${orderId}[/info]`

  try {
    await sendChatworkMessage({ roomId, message })
  } catch (error) {
    console.error('[CHATWORK] Failed to send business card order notification:', error)
    // 通知失敗でも決済処理は続行するため、エラーは再スローしない
  }
}

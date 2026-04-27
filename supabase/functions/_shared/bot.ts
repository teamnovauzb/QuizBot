// Shared Telegram Bot API helpers (used by tg-bot-webhook, broadcast-send, daily-reminder).

const TG_API = 'https://api.telegram.org/bot'

export type TgChatId = number | string

export async function tgSend(token: string, chatId: TgChatId, text: string, opts: Record<string, unknown> = {}): Promise<{ ok: boolean; description?: string; result?: { message_id: number } }> {
  const r = await fetch(`${TG_API}${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, parse_mode: 'HTML', disable_web_page_preview: true, ...opts, text }),
  })
  return r.json() as Promise<{ ok: boolean; description?: string; result?: { message_id: number } }>
}

export async function tgSetMyCommands(token: string, commands: { command: string; description: string }[], language?: string) {
  const body: Record<string, unknown> = { commands }
  if (language) body.language_code = language
  const r = await fetch(`${TG_API}${token}/setMyCommands`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return r.json()
}

export async function tgSetWebhook(token: string, url: string, secretToken?: string) {
  const r = await fetch(`${TG_API}${token}/setWebhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      url,
      allowed_updates: ['message', 'callback_query'],
      secret_token: secretToken,
    }),
  })
  return r.json()
}

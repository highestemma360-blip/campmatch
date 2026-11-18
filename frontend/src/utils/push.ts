// Web push helpers. Students opt in to receive match + campus notifications
// on their phone (via the browser Push API + service worker).

export type PushState = {
  supported: boolean
  permission: NotificationPermission | 'unsupported'
  enabled: boolean
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

function urlB64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const output = new Uint8Array(new ArrayBuffer(rawData.length))
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

async function registration() {
  return navigator.serviceWorker.ready
}

export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) {
    return { supported: false, permission: 'unsupported', enabled: false }
  }
  const permission = Notification.permission
  let enabled = false
  try {
    const reg = await registration()
    enabled = Boolean(await reg.pushManager.getSubscription())
  } catch {
    enabled = false
  }
  return { supported: true, permission, enabled }
}

export async function enablePush(token: string): Promise<{ ok: boolean; denied?: boolean; error?: string }> {
  if (!pushSupported()) return { ok: false, error: 'This browser does not support push notifications.' }

  let permission = Notification.permission
  if (permission === 'denied') return { ok: false, denied: true }
  if (permission === 'default') {
    permission = await Notification.requestPermission()
    if (permission !== 'granted') return { ok: false, denied: true }
  }

  try {
    const reg = await registration()
    let subscription = await reg.pushManager.getSubscription()
    if (!subscription) {
      const cfgRes = await fetch('/api/push/config')
      if (!cfgRes.ok) return { ok: false, error: 'Push is not configured on this server.' }
      const cfg = await cfgRes.json()
      if (!cfg.public_key) return { ok: false, error: 'Push is not configured on this server.' }
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(cfg.public_key),
      })
    }

    const sub = subscription.toJSON() as { endpoint: string; keys?: { p256dh?: string; auth?: string } }
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({
        subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.keys?.p256dh, auth: sub.keys?.auth } },
        user_agent: navigator.userAgent,
      }),
    })
    if (!res.ok) return { ok: false, error: 'Could not save your notification settings.' }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Unable to enable notifications. Please try again.' }
  }
}

export async function disablePush(token: string): Promise<void> {
  try {
    const reg = await registration()
    const subscription = await reg.pushManager.getSubscription()
    if (subscription) {
      const sub = subscription.toJSON() as { endpoint?: string }
      await subscription.unsubscribe()
      if (sub.endpoint) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {})
      }
    }
  } catch {
    /* noop */
  }
}

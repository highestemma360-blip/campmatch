export type RealtimeListener = (event: Record<string, any>) => void

export class RealtimeClient {
  private ws: WebSocket | null = null
  private token = ''
  private listener: RealtimeListener
  private reconnectTimer: number | null = null
  private reconnectDelay = 1000
  private pingTimer: number | null = null
  private closedManually = false
  private sendQueue: Record<string, any>[] = []

  constructor(listener: RealtimeListener) {
    this.listener = listener
  }

  connect(token: string) {
    this.disconnect()
    if (!token) return
    this.token = token
    this.closedManually = false
    this.reconnectDelay = 1000
    this.sendQueue = []
    this.openSocket()
  }

  private openSocket() {
    if (this.closedManually || !this.token) return
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${proto}//${window.location.host}/ws?token=${encodeURIComponent(this.token)}`

    try {
      const ws = new WebSocket(url)
      this.ws = ws

      ws.onopen = () => {
        this.listener({ type: 'ws_status', connected: true })
        this.reconnectDelay = 1000
        // Flush any messages queued while disconnected
        const queued = this.sendQueue.splice(0, this.sendQueue.length)
        for (const payload of queued) this.ws?.send(JSON.stringify(payload))
        this.pingTimer = window.setInterval(() => {
          this.send({ type: 'ping' })
        }, 25000)
      }

      ws.onmessage = ev => {
        try {
          const parsed = JSON.parse(ev.data)
          if (parsed && parsed.type && parsed.type !== 'pong') {
            this.listener(parsed)
          }
        } catch {
          // Ignore malformed frame
        }
      }

      ws.onclose = ev => {
        this.clearTimers()
        this.listener({ type: 'ws_status', connected: false })
        if (!this.closedManually && ev.code !== 4401) {
          const delay = this.reconnectDelay
          this.reconnectDelay = Math.min(delay * 2, 30000)
          this.reconnectTimer = window.setTimeout(() => this.openSocket(), delay)
        }
      }

      ws.onerror = () => {
        // onclose will handle reconnect; avoid incrementing backoff twice
        ws.close()
      }
    } catch {
      const delay = this.reconnectDelay
      this.reconnectDelay = Math.min(delay * 2, 30000)
      this.reconnectTimer = window.setTimeout(() => this.openSocket(), delay)
    }
  }

  send(payload: Record<string, any>) {
    const str = JSON.stringify(payload)
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(str)
    } else {
      // Queue for delivery once the socket reconnects (craft floor: no silent drops)
      this.sendQueue.push(payload)
      if (this.sendQueue.length > 50) this.sendQueue.shift()
    }
  }

  private clearTimers() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  disconnect() {
    this.closedManually = true
    this.clearTimers()
    if (this.ws) {
      try {
        this.ws.close()
      } catch {
        // Ignore
      }
      this.ws = null
    }
  }
}

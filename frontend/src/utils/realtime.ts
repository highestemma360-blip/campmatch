export type RealtimeListener = (event: Record<string, any>) => void

export class RealtimeClient {
  private ws: WebSocket | null = null
  private token = ''
  private listener: RealtimeListener
  private reconnectTimer: number | null = null
  private pingTimer: number | null = null
  private closedManually = false

  constructor(listener: RealtimeListener) {
    this.listener = listener
  }

  connect(token: string) {
    this.disconnect()
    if (!token) return
    this.token = token
    this.closedManually = false
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
          this.reconnectTimer = window.setTimeout(() => this.openSocket(), 3000)
        }
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch {
      this.reconnectTimer = window.setTimeout(() => this.openSocket(), 4000)
    }
  }

  send(payload: Record<string, any>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload))
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

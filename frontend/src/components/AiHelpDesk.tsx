import { useEffect, useRef, useState } from "react"

export interface AiHelpDeskProps {
  phone: string
  token: string
  userName?: string
  show: boolean
  onToggle: () => void
  onWhatsAppClick?: () => void
}

interface Msg {
  role: "user" | "assistant"
  text: string
}

const QUICK_TOPICS: Array<{ label: string; prompt: string }> = [
  { label: "Swipes & limits", prompt: "How many swipes do I get each day?" },
  { label: "Campmatch Plus", prompt: "What do I get with Campmatch Plus and how much does it cost?" },
  { label: "Payments", prompt: "How does Mobile Money payment work and what if it fails?" },
  { label: "Read receipts", prompt: "How do read receipts work?" },
  { label: "Matches & chat", prompt: "How do matches and chat work?" },
  { label: "Safety", prompt: "How do I report or block someone safely?" },
  { label: "Profile & photos", prompt: "How do I update my profile and photos?" },
  { label: "Location", prompt: "How is my location used?" },
]

function RobotMark({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#17181a"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.6 8.1V5.6h2.1" />
      <rect x="6.1" y="8.1" width="11.8" height="8.9" rx="2.2" />
      <path d="M6.1 12.1H4.6" />
      <path d="M17.9 12.1h1.5" />
      <path d="M9.7 11.3v1.9" />
      <path d="M14.3 11.3v1.9" />
      <path d="M9.9 14.6h4.2" />
    </svg>
  )
}

/**
 * Campmatch assistant. Streams replies from the backend in real time, keeping
 * the conversation context so follow-up questions work naturally.
 */
export function AiHelpDesk({
  phone,
  token,
  userName,
  show,
  onToggle,
  onWhatsAppClick,
}: AiHelpDeskProps) {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Welcome to the Campmatch assistant. Ask me anything about swiping, matches, Campmatch Plus, payments, safety or your profile.",
    },
  ])
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<"live" | "local" | "">("")
  const endRef = useRef<HTMLDivElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!show) return
    fetch("/api/ai/status")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.mode) setMode(d.mode)
      })
      .catch(() => {})
  }, [show])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, busy])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  async function send(raw?: string) {
    const content = (raw ?? input).trim()
    if (!content || busy) return
    if (raw === undefined) setInput("")

    const history: Msg[] = [...messages, { role: "user", text: content }]
    const assistantIndex = history.length
    setMessages([...history, { role: "assistant", text: "" }])
    setBusy(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.text })),
        }),
        signal: controller.signal,
      })
      if (!response.ok || !response.body) {
        let detail = ""
        try {
          const d = await response.json()
          detail = typeof d.detail === "string" ? d.detail : ""
        } catch {
          // Response was not JSON.
        }
        throw new Error(detail || "The assistant is unavailable right now.")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let answer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let split = buffer.indexOf("\n\n")
        while (split !== -1) {
          const frame = buffer.slice(0, split)
          buffer = buffer.slice(split + 2)
          for (const line of frame.split("\n")) {
            if (!line.startsWith("data:")) continue
            const payload = line.slice(5).trim()
            if (!payload) continue
            try {
              const event = JSON.parse(payload)
              if (event.delta) {
                answer += event.delta
                setMessages(prev =>
                  prev.map((m, i) => (i === assistantIndex ? { ...m, text: answer } : m))
                )
              }
            } catch {
              // Ignore malformed frames and keep streaming.
            }
          }
          split = buffer.indexOf("\n\n")
        }
      }

      if (!answer.trim()) {
        setMessages(prev =>
          prev.map((m, i) =>
            i === assistantIndex
              ? { ...m, text: "I could not finish that answer. Please try again or contact WhatsApp support." }
              : m
          )
        )
      }
    } catch (error) {
      const aborted = error instanceof DOMException && error.name === "AbortError"
      if (!aborted) {
        const detail = error instanceof Error ? error.message : "The assistant is unavailable right now."
        setMessages(prev =>
          prev.map((m, i) => (i === assistantIndex ? { ...m, text: detail } : m))
        )
      }
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  function resetChat() {
    abortRef.current?.abort()
    setBusy(false)
    setInput("")
    setMessages([
      {
        role: "assistant",
        text: "Fresh start. What would you like to know about Campmatch?",
      },
    ])
  }

  if (!show) return null

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        right: 0,
        width: "100%",
        maxWidth: 420,
        height: "min(72vh, 640px)",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "18px 18px 0 0",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.24)",
        zIndex: 10000,
        fontFamily: "system-ui, -apple-system, sans-serif",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
      role="dialog"
      aria-label="Campmatch assistant"
    >
      {/* Header */}
      <div
        style={{
          background: "var(--bg-subtle)",
          padding: "12px 16px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              background: "linear-gradient(180deg, #f8c14a 0%, #f2ac2b 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <RobotMark size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, lineHeight: 1.2 }}>
              Campmatch Assistant
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#22c55e",
                  display: "inline-block",
                }}
              />
              {mode === "live" ? "AI online · replies in real time" : "Online · instant answers"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={resetChat}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
              padding: "4px 6px",
            }}
          >
            New chat
          </button>
          <button
            onClick={onToggle}
            aria-label="Close assistant"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
              width: 30,
              height: 30,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 16px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {messages.map((m, i) => {
          const isUser = m.role === "user"
          const empty = !m.text
          if (empty && i === messages.length - 1) {
            return (
              <div
                key={i}
                style={{
                  alignSelf: "flex-start",
                  background: "var(--bg-subtle)",
                  borderRadius: 14,
                  padding: "11px 14px",
                }}
              >
                <div className="typing-dots" style={{ marginTop: 0 }}>
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )
          }
          return (
            <div
              key={i}
              style={{
                alignSelf: isUser ? "flex-end" : "flex-start",
                maxWidth: "86%",
                padding: "10px 13px",
                borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                background: isUser ? "var(--tinder-pink)" : "var(--bg-subtle)",
                color: isUser ? "#fff" : "var(--text-primary)",
                fontSize: 13,
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {m.text}
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* Quick topics */}
      {messages.length <= 1 && (
        <div
          style={{
            padding: "0 16px 8px",
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            flexShrink: 0,
          }}
        >
          {QUICK_TOPICS.map(topic => (
            <button
              key={topic.label}
              onClick={() => send(topic.prompt)}
              disabled={busy}
              style={{
                padding: "5px 10px",
                background: "var(--bg-subtle)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {topic.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div
        style={{
          padding: "10px 12px calc(12px + env(safe-area-inset-bottom))",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          gap: 8,
          alignItems: "flex-end",
          flexShrink: 0,
          background: "var(--bg-elevated)",
        }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder={busy ? "Assistant is replying..." : "Ask a question..."}
          disabled={busy}
          aria-label="Message the Campmatch assistant"
          style={{
            flex: 1,
            padding: "10px 12px",
            border: "1px solid var(--border-subtle)",
            borderRadius: 12,
            background: "var(--bg-subtle)",
            color: "var(--text-primary)",
            fontSize: 13,
            fontFamily: "inherit",
            outline: "none",
          }}
        />
        <button
          onClick={() => send()}
          disabled={busy || !input.trim()}
          aria-label="Send message"
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            border: "none",
            background: busy || !input.trim() ? "var(--bg-subtle)" : "var(--tinder-pink)",
            color: busy || !input.trim() ? "var(--text-muted)" : "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: busy || !input.trim() ? "default" : "pointer",
            flexShrink: 0,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13" />
            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>

      {/* Support fallback */}
      {phone && (
        <button
          onClick={() => {
            if (onWhatsAppClick) onWhatsAppClick()
            else window.open("https://wa.me/" + phone, "_blank", "noopener,noreferrer")
          }}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "none",
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--bg-subtle)",
            color: "var(--text-muted)",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          Need a person? Chat with the Campmatch team on WhatsApp
        </button>
      )}
    </div>
  )
}

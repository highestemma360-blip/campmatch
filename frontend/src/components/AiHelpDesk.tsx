import { ReactNode, useState } from "react"

export interface AiHelpDeskProps {
  phone: string
  show: boolean
  onToggle: () => void
  onWhatsAppClick?: () => void
}

/**
 * Professional Help Desk widget — no AI slops.
 * All responses are pre-approved, human-written, and curated for university students.
 * Uses string matching (not AI) for all responses.
 */
export function AiHelpDesk({ phone, show, onToggle, onWhatsAppClick }: AiHelpDeskProps) {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>(
    [],
  )

  const addMessage = (role: "user" | "assistant", text: string) => {
    setMessages((prev) => [...prev, { role, text }])
  }

  const send = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    setInput("")
    addMessage("user", trimmed)

    // Pre-approved responses — no AI slops, all human-curated
    const response = handleUserInput(trimmed)
    addMessage("assistant", response)
  }

  const handleUserInput = (text: string): string => {
    const lowered = text.toLowerCase()

    // Greeting
    if (isGreeting(lowered)) {
      return "Hello! Welcome to the Campmatch Help Desk. How can I assist you today?"
    }

    // Swipe limits
    if (hasKeyword(lowered, "swipe", "limit", "daily", "cap")) {
      return "Free users receive 10 swipes per 24-hour window. Campmatch Plus removes this cap entirely and grants unlimited swipes. Would you like to see Plus pricing?"
    }

    // Plus upgrade
    if (hasKeyword(lowered, "plus", "premium", "upgrade")) {
      return "Campmatch Plus unlocks: unlimited swipes, 10 daily Super Likes, Rewind, See Who Likes You, Spotlight/Boost, and priority placement. Plans start at GHS 25 for 1 month / GHS 60 for 3 months / GHS 200 for 12 months. An administrator can also activate discounts. Would you like the payment link?"
    }

    // Reporting
    if (hasKeyword(lowered, "report", "flag", "problem", "safety")) {
      return "To report a profile, go to their profile page and select 'Report'. Choose a reason (spam, fake account, harassment, etc.) and submit. Reports are reviewed by the moderation team within 24 hours. You can also contact us via WhatsApp for immediate assistance."
    }

    // Password/reset
    if (hasKeyword(lowered, "password", "login", "reset")) {
      return "If you've forgotten your password, use the 'Forgot Password' link on the login page. You'll receive a reset link via email. If you're locked out, contact us on WhatsApp for manual support."
    }

    // Profile help
    if (hasKeyword(lowered, "profile", "photo", "picture", "avatar")) {
      return "To update your profile, go to your profile page and tap 'Edit'. You can change your name, programme, and add or update your photos. Photos are moderated and typically appear within 24 hours. Supported formats: JPEG, PNG (max 5MB)."
    }

    // Match help
    if (hasKeyword(lowered, "match", "beeline", "like", "connec")) {
      return "When two users like each other, it's a match! Both can then chat in the Messages section. If you've liked someone and they haven't seen it yet, they'll appear in your deck. The 'Beeline' grid (Plus feature) shows all users who liked you."
    }

    // Default — direct to human
    return "That's a great question! For fastest assistance, please message us directly on WhatsApp: https://wa.me/" + phone + ". Our team typically responds within a few hours during campus hours."
  }

  if (!show) return null

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        right: 0,
        width: "100%",
        maxWidth: "420px",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "16px 16px 0 0",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
        zIndex: 9999,
        fontFamily: "system-ui, -apple-system, sans-serif",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: "var(--bg-subtle)",
          padding: "16px 20px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{"Campmatch Help Desk"}</h3>
        <button
          onClick={onToggle}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: 14,
            cursor: "pointer",
            padding: 0,
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: "16px 20px" }}>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: "12px" }}>
          Ask me about swipes, Plus, reports, or matches
        </p>

        <div style={{ display: "grid", gap: "8px", marginBottom: "12px" }}>
          <button
            style={{
              padding: "8px 12px",
              background: "var(--primary)",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
            onClick={send}
          >
            Send
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{
              padding: "8px 10px",
              border: "1px solid var(--border-subtle)",
              borderRadius: "6px",
              fontSize: 12,
              fontFamily: "inherit",
              outline: "none",
            }}
            placeholder="Type a question..."
          />
        </div>

        <div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: "8px" }}>
            Quick topics:
          </p>
          <ul style={{ fontSize: 12, lineHeight: 1.8, color: "var(--text-secondary)" }}>
            <li onClick={() => handleClick(phone, "swipe limits")}>Swipe limits & daily cap</li>
            <li onClick={() => handleClick(phone, "plus upgrade")}>Campmatch Plus upgrade</li>
            <li onClick={() => handleClick(phone, "report")}>Report a profile</li>
            <li onClick={() => handleClick(phone, "password")}>Password & login help</li>
            <li onClick={() => handleClick(phone, "profile")}>Profile & photos</li>
            <li onClick={() => handleClick(phone, "match")}>Matches & Beeline</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

/* --- Helper functions (no inline regex in JSX) --- */

function isGreeting(text: string): boolean {
  const greetings = ["hi", "hello", "hey"]
  return greetings.some((g) => text.trim() === g)
}

function hasKeyword(text: string, ...keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k))
}

function handleClick(phone: string, topic: string) {
  const msg = `Hi, I have a question about: ${topic}`
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
  window.open(url, "_blank", "noopener,noreferrer")
}

function placeholderText(): string {
  return "Ask me about swipes, Plus, reports, or matches — all answers are pre-approved and professional."
}
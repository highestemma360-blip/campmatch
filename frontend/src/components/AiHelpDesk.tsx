import { useState } from "react"

export interface AiHelpDeskProps {
  phone: string
  show: boolean
  onToggle: () => void
  onWhatsAppClick?: () => void
}

/**
 * Professional AI Help Desk — comprehensive knowledge base about Campmatch.
 * All responses are pre-approved and human-curated. No external AI API needed.
 * Provides instant answers about every feature, policy, and workflow.
 */
export function AiHelpDesk({ phone, show, onToggle, onWhatsAppClick }: AiHelpDeskProps) {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>(
    [
      {
        role: "assistant",
        text: "Welcome to the Campmatch Help Desk. I can answer questions about swiping, matching, messaging, Plus, safety, and more. Type your question or pick a topic below.",
      },
    ],
  )

  const addMessage = (role: "user" | "assistant", text: string) => {
    setMessages((prev) => [...prev, { role, text }])
  }

  const send = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    setInput("")
    addMessage("user", trimmed)
    const response = handleUserInput(trimmed, phone)
    addMessage("assistant", response)
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
        height: "60vh",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "16px 16px 0 0",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
        zIndex: 9999,
        fontFamily: "system-ui, -apple-system, sans-serif",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "var(--bg-subtle)",
          padding: "16px 20px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Campmatch Help Desk</h3>
        <button
          onClick={onToggle}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: 14,
            cursor: "pointer",
            padding: 4,
          }}
        >
          Close
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              padding: "10px 14px",
              borderRadius: 12,
              background: m.role === "user" ? "var(--primary)" : "var(--bg-subtle)",
              color: m.role === "user" ? "#fff" : "var(--text-primary)",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {m.text}
          </div>
        ))}
      </div>

      {/* Input */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          gap: "8px",
          flexShrink: 0,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send()
          }}
          style={{
            flex: 1,
            padding: "8px 10px",
            border: "1px solid var(--border-subtle)",
            borderRadius: "6px",
            fontSize: 12,
            fontFamily: "inherit",
            outline: "none",
            background: "var(--bg-elevated)",
            color: "var(--text-primary)",
          }}
          placeholder="Type your question..."
        />
        <button
          onClick={send}
          style={{
            padding: "8px 14px",
            background: "var(--primary)",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Send
        </button>
      </div>

      {/* Quick Topics */}
      <div
        style={{
          padding: "8px 16px 12px",
          display: "flex",
          gap: "6px",
          flexWrap: "wrap",
          flexShrink: 0,
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        {[
          { label: "Swipes", topic: "swipes" },
          { label: "Plus", topic: "plus" },
          { label: "Report", topic: "report" },
          { label: "Safety", topic: "safety" },
          { label: "Profile", topic: "profile" },
          { label: "Matches", topic: "matches" },
          { label: "Location", topic: "location" },
          { label: "WhatsApp", topic: "whatsapp" },
        ].map(({ label, topic }) => (
          <button
            key={topic}
            onClick={() => {
              const response = handleUserInput(topic, phone)
              addMessage("assistant", response)
            }}
            style={{
              padding: "4px 10px",
              background: "var(--bg-subtle)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "12px",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* --- Comprehensive knowledge base --- */

function hasKeyword(text: string, ...keywords: string[]): boolean {
  const lower = text.toLowerCase()
  return keywords.some((k) => lower.includes(k))
}

function handleUserInput(text: string, phone: string): string {
  const lower = text.toLowerCase()

  // Swipes
  if (hasKeyword(lower, "swipe", "limit", "daily", "cap", "quota")) {
    return "Free users get 10 swipes per 24-hour window. Campmatch Plus removes this cap entirely. Super Likes are limited to 3/day for free users and 10/day for Plus. Rewind lets you undo your last swipe. Boost puts your profile at the top for 30 minutes. All of these features are available on the Discover page."
  }

  // Plus
  if (hasKeyword(lower, "plus", "premium", "upgrade", "subscription", "plan")) {
    return "Campmatch Plus unlocks: unlimited swipes, 10 daily Super Likes, Rewind, See Who Likes You, Spotlight/Boost, and priority placement. Plans: GHS 25 for 1 month, GHS 60 for 3 months, GHS 200 for 12 months. Admins can also activate discounts. Pay via Mobile Money (MTN, Telecel, AT). After payment, Plus activates instantly."
  }

  // Report
  if (hasKeyword(lower, "report", "flag", "problem", "safety", "harassment", "spam")) {
    return "To report a profile: open their profile page and select 'Report'. Choose a reason (spam, fake account, harassment, etc.) and submit. Reports are reviewed by the moderation team within 24 hours. You can also block users from the report dialog. For immediate safety concerns, contact us on WhatsApp."
  }

  // Password / login
  if (hasKeyword(lower, "password", "login", "sign in", "reset", "forgot", "account")) {
    return "To sign in, use Google with your university email (e.g., @st.umat.edu.gh) or email/password. If you forgot your password, use the 'Forgot Password' link on the login page. You'll receive a reset link via email. If locked out, contact us on WhatsApp for manual support."
  }

  // Profile
  if (hasKeyword(lower, "profile", "photo", "picture", "avatar", "edit", "name")) {
    return "To update your profile: go to Profile page and tap 'Edit'. You can change your name, programme, and add/update photos. Photos are moderated and appear within 24 hours. Supported formats: JPEG, PNG (max 5MB). You can also set your discovery preferences (age range, distance, gender)."
  }

  // Matches
  if (hasKeyword(lower, "match", "beeline", "like", "connect", "chat", "message")) {
    return "When two users like each other, it's a match! Both can then chat in Messages. The 'Beeline' grid (Plus feature) shows all users who liked you. Matches expire after 24 hours unless you message or extend them. You can extend a match by 24 hours once. Unmatch or block users anytime from the chat screen."
  }

  // Location
  if (hasKeyword(lower, "location", "distance", "nearby", "km", "gps")) {
    return "Campmatch uses your device's GPS location to show nearby students. Your location is updated automatically when you open the app. You can set your maximum discovery distance in Profile > Discovery Preferences. Location data is only used for matching and is never shared with other users."
  }

  // WhatsApp
  if (hasKeyword(lower, "whatsapp", "contact", "support", "help desk")) {
    return "You can reach our support team on WhatsApp at any time. Click the WhatsApp button on the floating menu or visit: https://wa.me/" + phone + ". Our team typically responds within a few hours during campus hours."
  }

  // Safety
  if (hasKeyword(lower, "safety", "safe", "danger", "emergency", "block", "unmatch")) {
    return "Your safety matters. You can block or unmatch any user at any time. Reports are reviewed within 24 hours. For emergencies, contact campus security or use the WhatsApp support button. Never share personal information (address, financial details) with matches."
  }

  // Explore
  if (hasKeyword(lower, "explore", "room", "community", "group", "vibe")) {
    return "Explore rooms are themed communities (e.g., Study, Sports, Arts). You can opt in/out of rooms from the Explore page. Each room shows nearby members. Admins can add, edit, hide, or reorder rooms. Your room memberships appear on your profile."
  }

  // Notifications
  if (hasKeyword(lower, "notification", "alert", "push", "message")) {
    return "Campmatch sends push notifications for new matches, messages, and likes. You can manage notification preferences in your profile settings. In-app notifications appear in the bell icon at the top of the screen."
  }

  // Admin
  if (hasKeyword(lower, "admin", "administrator", "manage", "moderate")) {
    return "The admin portal is accessible only by visiting /admin directly. Admin credentials are set via Render environment variables (ADMIN_USERNAME, ADMIN_PASSWORD). Admins can manage users, rooms, settings, payments, and send notifications with flyers."
  }

  // Payments
  if (hasKeyword(lower, "payment", "pay", "moolre", "mobile money", "momo", "ghs")) {
    return "Campmatch Plus payments are processed via Moolre Mobile Money. Supported channels: MTN MoMo, Telecel Cash, AT Money. Payment links are generated instantly. After successful payment, Plus activates automatically on your account."
  }

  // Modes
  if (hasKeyword(lower, "mode", "date", "bff", "study", "friend")) {
    return "Campmatch has 3 discovery modes: Date (romantic matching), BFF (friendship), and Study (academic partners). Switch modes using the pills at the top of the Discover page. Each mode has its own swipe deck and matches."
  }

  // Verification
  if (hasKeyword(lower, "verify", "verification", "photo", "identity")) {
    return "Photos are automatically verified for quality and content. Profile verification badges are shown for verified users. If your photo is rejected, you'll see the reason and can upload a new one. Verification typically takes a few minutes."
  }

  // Greeting
  if (hasKeyword(lower, "hi", "hello", "hey", "good morning", "good evening")) {
    return "Hello! Welcome to the Campmatch Help Desk. I can help you with swiping, matching, messaging, Plus, safety, and more. What would you like to know?"
  }

  // Default
  return "That's a great question! For detailed assistance, please message us on WhatsApp: https://wa.me/" + phone + ". Our team typically responds within a few hours during campus hours."
}
import React from "react"
import { ReactNode } from "react"

export interface FloatingWhatsAppBtnProps {
  phone: string
  message?: string
  showAiAssistant?: boolean
  onAiOpen?: () => void
  onClose?: () => void
}

export function FloatingWhatsAppBtn({
  phone,
  message,
  showAiAssistant = true,
  onAiOpen,
  onClose,
}: FloatingWhatsAppBtnProps) {
  const [showAi, setShowAi] = React.useState(false)

  const handleWhatsAppClick = () => {
    const encodedMsg = message || "Hello, I'd like to know more about Campmatch"
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(encodedMsg)}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 12,
      }}
    >
      {/* WhatsApp Button */}
      <a
        href={`https://wa.me/${phone}?text=${encodeURIComponent(message || "")}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          width: 60,
          height: 60,
          background: "#25d366",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          transition: "transform 0.2s",
          textDecoration: "none",
          color: "#fff",
        }}
        onClick={(e) => {
          e.preventDefault()
          handleWhatsAppClick()
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 1 9 3"></polygon>
          <path d="M21 10c0 7-9 13-9 13"></path>
          <path d="M21 10c0 7-9 13-9 13"></path>
          <path d="M2 10c0 7 9 13 9 13"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      </a>

      {/* AI Assistant Toggle */}
      {showAiAssistant && (
        <button
          onClick={() => setShowAi(true)}
          style={{
            width: 44,
            height: 44,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-primary)",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            transition: "background 0.2s",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="4" x2="12" y2="6.5"></line>
            <line x1="12" y1="8" x2="12" y2="10.5"></line>
            <line x1="12" y1="12" x2="12" y2="15"></line>
            <line x1="12" y1="16" x2="12" y2="18"></line>
            <line x1="12" y1="20" x2="12" y2="23"></line>
          </svg>
        </button>
      )}

      {/* AI Chat Panel */}
      {showAi && (
        <div
          style={{
            position: "fixed",
            bottom: 96,
            right: 24,
            width: 320,
            maxHeight: "70vh",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 16,
            boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
            overflow: "hidden",
            zIndex: 9998,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div
            style={{
              background: "var(--bg-subtle)",
              padding: 12,
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14 }}>Campmatch Help Desk</span>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ padding: 16 }}>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
              How can we help you today?
            </p>

            <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
              <button
                style={{
                  padding: "8px 12px",
                  background: "var(--primary)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
                onClick={() => {
                  const url = "https://wa.me/" + phone
                  window.open(url, "_blank", "noopener,noreferrer")
                }}
              >
                Chat on WhatsApp
              </button>
              <button
                style={{
                  padding: "8px 12px",
                  background: "var(--bg-subtle)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
                onClick={onClose}
              >
                Close
              </button>
            </div>

            <div>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
                Common questions:
              </p>
              <ul style={{ fontSize: 12, lineHeight: 1.8, color: "var(--text-secondary)" }}>
                <li>How do I reset my password?</li>
                <li>How do I change my profile picture?</li>
                <li>What are the swipe limits?</li>
                <li>How do I report a problematic profile?</li>
                <li>How do I upgrade to Campmatch Plus?</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
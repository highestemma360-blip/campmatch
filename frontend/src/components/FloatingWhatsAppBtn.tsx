import React from "react"
import { ReactNode } from "react"

export interface FloatingWhatsAppBtnProps {
  phone: string
  message?: string
  showAiAssistant?: boolean
  onAiOpen?: () => void
  onClose?: () => void
}

/**
 * Floating WhatsApp button with the official WhatsApp logo.
 * Opens a pre-filled WhatsApp chat in a new tab.
 */
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
      {/* WhatsApp Button — official WhatsApp logo */}
      <button
        onClick={handleWhatsAppClick}
        style={{
          width: 60,
          height: 60,
          background: "#25d366",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          transition: "transform 0.2s, box-shadow 0.2s",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)"
          e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.2)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)"
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"
        }}
        aria-label="Chat on WhatsApp"
      >
        {/* Official WhatsApp logo (SVG) */}
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
            fill="white"
          />
        </svg>
      </button>

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
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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
              onClick={() => setShowAi(false)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Close
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
                onClick={() => setShowAi(false)}
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
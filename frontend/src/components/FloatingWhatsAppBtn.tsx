import React from "react"

export interface FloatingWhatsAppBtnProps {
  link: string
  message?: string
  showAiAssistant?: boolean
  onAiOpen?: () => void
  onClose?: () => void
}

const BUTTON_SIZE = 48

/**
 * Floating support actions: the official WhatsApp logo and the Campmatch
 * assistant mark. Both buttons share the same 48px footprint.
 */
export function FloatingWhatsAppBtn({
  link,
  message,
  showAiAssistant = true,
  onAiOpen,
}: FloatingWhatsAppBtnProps) {
  const handleWhatsAppClick = () => {
    const encodedMsg = message || "Hello, I'd like to know more about Campmatch"
    const url = link.startsWith("http") ? link : `https://wa.me/${link}?text=${encodeURIComponent(encodedMsg)}`
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
        gap: 10,
      }}
    >
      {/* WhatsApp — official logo mark */}
      <button
        onClick={handleWhatsAppClick}
        style={{
          width: BUTTON_SIZE,
          height: BUTTON_SIZE,
          background: "#25d366",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 5px 14px rgba(0,0,0,0.18)",
          transition: "transform 0.18s ease, box-shadow 0.18s ease",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)"
          e.currentTarget.style.boxShadow = "0 7px 18px rgba(0,0,0,0.22)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)"
          e.currentTarget.style.boxShadow = "0 5px 14px rgba(0,0,0,0.18)"
        }}
        aria-label="Chat on WhatsApp"
      >
        <svg width="27" height="27" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      </button>

      {/* Campmatch assistant — amber squircle with robot mark */}
      {showAiAssistant && (
        <button
          onClick={() => onAiOpen?.()}
          style={{
            position: "relative",
            width: BUTTON_SIZE,
            height: BUTTON_SIZE,
            background: "linear-gradient(180deg, #f8c14a 0%, #f2ac2b 100%)",
            borderRadius: 15,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            cursor: "pointer",
            padding: 0,
            boxShadow: "0 5px 14px rgba(196,133,24,0.35)",
            transition: "transform 0.18s ease, box-shadow 0.18s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.05)"
            e.currentTarget.style.boxShadow = "0 7px 18px rgba(196,133,24,0.42)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)"
            e.currentTarget.style.boxShadow = "0 5px 14px rgba(196,133,24,0.35)"
          }}
          aria-label="Open Campmatch assistant"
        >
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 4,
              borderRadius: 11,
              border: "1px solid rgba(120, 72, 0, 0.16)",
              pointerEvents: "none",
            }}
          />
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#17181a"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {/* antenna */}
            <path d="M9.6 8.1V5.6h2.1" />
            {/* head */}
            <rect x="6.1" y="8.1" width="11.8" height="8.9" rx="2.2" />
            {/* side nubs */}
            <path d="M6.1 12.1H4.6" />
            <path d="M17.9 12.1h1.5" />
            {/* eyes */}
            <path d="M9.7 11.3v1.9" />
            <path d="M14.3 11.3v1.9" />
            {/* mouth */}
            <path d="M9.9 14.6h4.2" />
          </svg>
        </button>
      )}
    </div>
  )
}

import { AppNotification } from '../types'
import { CloseXIcon } from './Icons'

interface NotificationPopupProps {
  notification: AppNotification
  onDismiss: () => void
}

/**
 * Clean, centred campus update card shown when the admin publishes a new
 * notification. Flyers are displayed at their full natural aspect ratio —
 * never cropped — and the body scrolls under a pinned action footer so the
 * primary button is always reachable.
 */
export function NotificationPopup({ notification, onDismiss }: NotificationPopupProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={notification.title}
      onClick={onDismiss}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10050,
        background: 'rgba(6, 8, 12, 0.62)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        className="notification-pop"
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 400,
          maxHeight: '90dvh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 20,
          boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
        }}
      >
        <button
          onClick={onDismiss}
          aria-label="Dismiss notification"
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 2,
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: 'none',
            background: '#ffffff',
            color: '#17181a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 3px 10px rgba(0,0,0,0.22)',
          }}
        >
          <CloseXIcon size={15} />
        </button>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {notification.flyer_url && (
            <div style={{ background: '#0a0d14', borderRadius: '20px 20px 0 0', overflow: 'hidden' }}>
              <img
                src={notification.flyer_url}
                alt={notification.title}
                style={{
                  display: 'block',
                  width: '100%',
                  height: 'auto',
                  maxHeight: '44dvh',
                  objectFit: 'contain',
                }}
              />
            </div>
          )}

          <div style={{ padding: notification.flyer_url ? '18px 20px 20px' : '26px 22px 22px' }}>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 900,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                color: 'var(--tinder-pink)',
                marginBottom: 6,
              }}
            >
              Campus update
            </div>
            <div
              style={{
                fontSize: 21,
                fontWeight: 900,
                lineHeight: 1.25,
                color: 'var(--text-primary)',
              }}
            >
              {notification.title}
            </div>
            {notification.body && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  color: 'var(--text-secondary)',
                  whiteSpace: 'pre-line',
                }}
              >
                {notification.body}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            flexShrink: 0,
            padding: '12px 18px 14px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
          }}
        >
          <button
            onClick={onDismiss}
            style={{
              width: '100%',
              padding: '13px 16px',
              border: 'none',
              borderRadius: 12,
              background: 'var(--tinder-pink)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 800,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            Got it
          </button>
          <button
            onClick={onDismiss}
            style={{
              width: '100%',
              marginTop: 4,
              padding: '7px 16px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            No, thanks
          </button>
        </div>
      </div>
    </div>
  )
}

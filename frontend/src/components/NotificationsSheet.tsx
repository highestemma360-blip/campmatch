import React from 'react'
import { AppNotification } from '../types'
import { BellIcon, CloseXIcon } from './Icons'

interface NotificationsSheetProps {
  items: AppNotification[]
  onClose: () => void
  onRead: (id: number) => void
  onReadAll: () => void
}

function timeAgo(iso: string) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Math.max(0, Date.now() - then)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function NotificationsSheet({ items, onClose, onRead, onReadAll }: NotificationsSheetProps) {
  const unread = items.filter(i => !i.read).length

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        style={{ padding: 0, overflow: 'hidden', maxWidth: 560, border: 'none' }}
      >
        <div
          style={{
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-glass)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'rgba(255,79,94,0.14)',
                color: 'var(--tinder-pink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BellIcon size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Campus Notifications</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                {unread > 0 ? `${unread} unread` : 'You are all caught up'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {unread > 0 && (
              <button
                onClick={onReadAll}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--tinder-pink)',
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="icon-circle-btn"
              style={{ width: 32, height: 32 }}
            >
              <CloseXIcon size={15} />
            </button>
          </div>
        </div>

        <div style={{ maxHeight: '68vh', overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {items.length === 0 && (
            <div style={{ padding: '42px 18px', textAlign: 'center' }}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <BellIcon size={24} />
              </div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>No notifications yet</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
                Campus announcements, event flyers, and account updates will appear here.
              </div>
            </div>
          )}

          {items.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => onRead(item.id)}
              style={{
                textAlign: 'left',
                padding: 0,
                border: 'none',
                background: item.read ? 'var(--bg-elevated)' : 'rgba(255,79,94,0.06)',
                borderRadius: 16,
                overflow: 'hidden',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {item.flyer_url && (
                <img
                  src={item.flyer_url}
                  alt={item.title}
                  style={{ width: '100%', maxHeight: 360, objectFit: 'contain', display: 'block', background: '#05070c' }}
                />
              )}
              <div style={{ padding: '13px 15px 15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontWeight: 900, fontSize: 14.5, color: 'var(--text-primary)' }}>
                    {item.title}
                  </div>
                  {!item.read && (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--tinder-pink)',
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>
                {item.body && (
                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: 'var(--text-secondary)',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {item.body}
                  </div>
                )}
                <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                  {timeAgo(item.created_at)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

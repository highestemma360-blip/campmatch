import React, { useEffect, useState } from 'react'
import { ExploreRoomIcon, TrashIcon, CheckIcon, CreditCardIcon, DatabaseIcon, MegaphoneIcon } from '../components/Icons'

interface AdminPanelProps {
  token: string
  onNotify: (msg: string) => void
}

const jsonHeaders = (token: string) => ({
  Authorization: 'Bearer ' + token,
  'Content-Type': 'application/json',
})

const authHeaders = (token: string) => ({ Authorization: 'Bearer ' + token })

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 18,
  padding: 18,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid var(--border-strong)',
  background: 'var(--bg-subtle)',
  color: 'var(--text-primary)',
  fontSize: 13,
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  margin: '12px 0 6px',
  fontSize: 11.5,
  fontWeight: 800,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: 0.4,
}

function PanelHeader({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: 'rgba(255,79,94,0.12)',
          color: 'var(--tinder-pink)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 900 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>{desc}</div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* EXPLORE ROOMS                                                       */
/* ------------------------------------------------------------------ */

const emptyRoom = {
  id: 0,
  slug: '',
  title: '',
  subtitle: '',
  tag: '',
  icon: 'star',
  accent: '#FF4F5E',
  gradient: '',
  sort_order: 100,
  is_active: true,
  total_members: 0,
}

export function ExploreRoomsAdmin({ token, onNotify }: AdminPanelProps) {
  const [rooms, setRooms] = useState<any[]>([])
  const [icons, setIcons] = useState<string[]>([])
  const [form, setForm] = useState<any>(emptyRoom)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    load()
    const id = window.setInterval(load, 10000)
    return () => window.clearInterval(id)
  }, [])

  async function load() {
    const r = await fetch('/api/admin/explore-rooms', { headers: authHeaders(token) })
    if (!r.ok) return
    const d = await r.json()
    setRooms(d.rooms || [])
    setIcons(d.icons || [])
  }

  function edit(room: any) {
    setForm({ ...emptyRoom, ...room })
  }

  async function save() {
    if (!form.title.trim()) {
      onNotify('Room name is required.')
      return
    }
    setBusy(true)
    try {
      const payload = {
        title: form.title,
        subtitle: form.subtitle,
        tag: form.tag,
        icon: form.icon,
        accent: form.accent,
        gradient: form.gradient,
        sort_order: Number(form.sort_order) || 100,
        is_active: Boolean(form.is_active),
        slug: form.slug || undefined,
      }
      const r = await fetch(
        form.id ? `/api/admin/explore-rooms/${form.id}` : '/api/admin/explore-rooms',
        { method: form.id ? 'PUT' : 'POST', headers: jsonHeaders(token), body: JSON.stringify(payload) }
      )
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        onNotify(typeof d.detail === 'string' ? d.detail : 'Could not save the room.')
        return
      }
      onNotify(form.id ? 'Explore room updated.' : 'Explore room created.')
      setForm(emptyRoom)
      load()
    } finally {
      setBusy(false)
    }
  }

  async function toggle(room: any) {
    const r = await fetch(`/api/admin/explore-rooms/${room.id}`, {
      method: 'PUT',
      headers: jsonHeaders(token),
      body: JSON.stringify({
        title: room.title,
        subtitle: room.subtitle,
        tag: room.tag,
        icon: room.icon,
        accent: room.accent,
        gradient: room.gradient,
        sort_order: room.sort_order,
        is_active: !room.is_active,
        slug: room.slug,
      }),
    })
    if (r.ok) {
      onNotify(room.is_active ? 'Room hidden from students.' : 'Room is now live.')
      load()
    }
  }

  async function remove(room: any) {
    if (!window.confirm(`Delete "${room.title}"? Rooms with opted-in students are archived instead of erased.`)) return
    const r = await fetch(`/api/admin/explore-rooms/${room.id}`, { method: 'DELETE', headers: authHeaders(token) })
    const d = await r.json().catch(() => ({}))
    if (r.ok) {
      onNotify(d.message || 'Room removed.')
      if (form.id === room.id) setForm(emptyRoom)
      load()
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16 }}>
      <div style={cardStyle}>
        <PanelHeader
          icon={<ExploreRoomIcon icon="star" size={20} />}
          title="Explore Rooms"
          desc="Add, rename, recolor, hide, or reorder the rooms students browse. Changes go live instantly."
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          {rooms.map(room => (
            <div
              key={room.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                borderRadius: 14,
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-subtle)',
                opacity: room.is_active ? 1 : 0.55,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  background: room.gradient || 'var(--bg-elevated)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                <ExploreRoomIcon icon={room.icon} id={room.slug} size={19} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 13.5 }}>
                  {room.title}{' '}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: 11.5 }}>
                    · {room.slug}
                  </span>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {room.subtitle || 'No description'} · {room.total_members ?? 0} students · order {room.sort_order}
                </div>
              </div>
              <button className="btn-ghost" style={{ padding: '6px 10px', fontSize: 11.5 }} onClick={() => edit(room)}>
                Edit
              </button>
              <button className="btn-ghost" style={{ padding: '6px 10px', fontSize: 11.5 }} onClick={() => toggle(room)}>
                {room.is_active ? 'Hide' : 'Show'}
              </button>
              <button
                onClick={() => remove(room)}
                style={{
                  padding: 7,
                  borderRadius: 9,
                  border: '1px solid rgba(239,68,68,0.35)',
                  background: 'rgba(239,68,68,0.12)',
                  color: '#f87171',
                  display: 'flex',
                }}
              >
                <TrashIcon size={14} />
              </button>
            </div>
          ))}
          {rooms.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No rooms yet. Create the first one below.
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>
            {form.id ? `Edit “${form.title}”` : 'Create a New Room'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={labelStyle}>Room Name</label>
              <input style={inputStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Coffee Run" />
            </div>
            <div>
              <label style={labelStyle}>Small Tag</label>
              <input style={inputStyle} value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })} placeholder="e.g. CAFFEINE" />
            </div>
          </div>

          <label style={labelStyle}>Description</label>
          <input style={inputStyle} value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} placeholder="Short line shown under the room name" />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <div>
              <label style={labelStyle}>Icon</label>
              <select style={inputStyle} value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })}>
                {icons.map(icon => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Accent Colour</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="color"
                  value={form.accent || '#FF4F5E'}
                  onChange={e => setForm({ ...form, accent: e.target.value })}
                  style={{ width: 44, height: 40, borderRadius: 10, border: '1px solid var(--border-strong)', background: 'transparent' }}
                />
                <input style={inputStyle} value={form.accent} onChange={e => setForm({ ...form, accent: e.target.value })} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Sort Order</label>
              <input
                type="number"
                style={inputStyle}
                value={form.sort_order}
                onChange={e => setForm({ ...form, sort_order: e.target.value })}
              />
            </div>
          </div>

          <label style={labelStyle}>Gradient (optional CSS)</label>
          <input
            style={inputStyle}
            value={form.gradient}
            onChange={e => setForm({ ...form, gradient: e.target.value })}
            placeholder="linear-gradient(150deg, #0EA5E9 0%, #0F2942 100%)"
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700 }}>
              <input
                type="checkbox"
                checked={Boolean(form.is_active)}
                onChange={e => setForm({ ...form, is_active: e.target.checked })}
              />
              Visible to students
            </label>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              {form.id > 0 && (
                <button className="btn-ghost" style={{ padding: '9px 14px', fontSize: 12.5 }} onClick={() => setForm(emptyRoom)}>
                  Cancel
                </button>
              )}
              <button className="btn-brand" style={{ width: 'auto', padding: '9px 18px', fontSize: 12.5 }} disabled={busy} onClick={save}>
                {busy ? 'Saving...' : form.id ? 'Save Changes' : 'Create Room'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* NOTIFICATIONS                                                       */
/* ------------------------------------------------------------------ */

const emptyNotification = {
  title: '',
  body: '',
  flyer_url: '',
  audience: 'all',
  target_school: '',
  target_user_id: '',
  expires_in_days: 14,
}

export function NotificationsAdmin({ token, onNotify }: AdminPanelProps) {
  const [items, setItems] = useState<any[]>([])
  const [form, setForm] = useState<any>(emptyNotification)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    load()
    const id = window.setInterval(load, 10000)
    return () => window.clearInterval(id)
  }, [])

  async function load() {
    const r = await fetch('/api/admin/notifications', { headers: authHeaders(token) })
    if (r.ok) setItems(await r.json())
  }

  async function uploadFlyer(file: File | null) {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/api/admin/notifications/flyer', {
        method: 'POST',
        headers: authHeaders(token),
        body: fd,
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        onNotify(typeof d.detail === 'string' ? d.detail : 'Flyer upload failed.')
        return
      }
      setForm((f: any) => ({ ...f, flyer_url: d.url }))
      onNotify('Flyer uploaded and ready to send.')
    } finally {
      setUploading(false)
    }
  }

  async function send() {
    if (!form.title.trim()) {
      onNotify('Add a notification title first.')
      return
    }
    setBusy(true)
    try {
      const r = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: jsonHeaders(token),
        body: JSON.stringify({
          ...form,
          target_user_id: form.target_user_id ? Number(form.target_user_id) : null,
          expires_in_days: Number(form.expires_in_days) || 0,
        }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        onNotify(typeof d.detail === 'string' ? d.detail : 'Could not send the notification.')
        return
      }
      onNotify('Notification sent to the selected students.')
      setForm(emptyNotification)
      load()
    } finally {
      setBusy(false)
    }
  }

  async function toggle(item: any) {
    const r = await fetch(`/api/admin/notifications/${item.id}`, {
      method: 'PUT',
      headers: jsonHeaders(token),
      body: JSON.stringify({ is_active: !item.is_active }),
    })
    if (r.ok) {
      onNotify(item.is_active ? 'Notification paused.' : 'Notification is live again.')
      load()
    }
  }

  async function remove(item: any) {
    if (!window.confirm(`Delete “${item.title}”?`)) return
    const r = await fetch(`/api/admin/notifications/${item.id}`, { method: 'DELETE', headers: authHeaders(token) })
    if (r.ok) {
      onNotify('Notification deleted.')
      load()
    }
  }

  async function bulkDelete(mode: 'expired' | 'inactive') {
    const label = mode === 'expired' ? 'Delete all expired notifications?' : 'Delete all paused notifications?'
    if (!window.confirm(label)) return
    const r = await fetch('/api/admin/notifications/delete-bulk', {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({ mode }),
    })
    const d = await r.json().catch(() => ({}))
    if (r.ok) {
      onNotify(`${d.deleted || 0} notification(s) deleted.`)
      load()
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
      <div style={cardStyle}>
        <PanelHeader
          icon={<MegaphoneIcon size={20} />}
          title="Send a Notification"
          desc="Publish a flyer image, a text update, or both to all students or a targeted group."
        />

        <label style={labelStyle}>Title</label>
        <input style={inputStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Hall Week Party — Friday 8PM" />

        <label style={labelStyle}>Message</label>
        <textarea
          style={{ ...inputStyle, minHeight: 96, resize: 'vertical' }}
          value={form.body}
          onChange={e => setForm({ ...form, body: e.target.value })}
          placeholder="Write the full update students should see."
        />

        <label style={labelStyle}>Flyer Image (optional)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={e => {
              uploadFlyer(e.target.files?.[0] || null)
              e.target.value = ''
            }}
            style={{ fontSize: 12 }}
          />
          {uploading && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Uploading...</span>}
          {form.flyer_url && (
            <button
              className="btn-ghost"
              style={{ padding: '6px 10px', fontSize: 11.5 }}
              onClick={() => setForm({ ...form, flyer_url: '' })}
            >
              Remove flyer
            </button>
          )}
        </div>
        {form.flyer_url && (
          <img
            src={form.flyer_url}
            alt="Flyer preview"
            style={{ marginTop: 10, width: '100%', height: 'auto', objectFit: 'contain', borderRadius: 12, border: '1px solid var(--border-subtle)' }}
          />
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Audience</label>
            <select style={inputStyle} value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })}>
              <option value="all">Everyone</option>
              <option value="free">Free accounts only</option>
              <option value="plus">Plus subscribers only</option>
              <option value="new">New students (14 days)</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Expires In (days)</label>
            <input
              type="number"
              style={inputStyle}
              value={form.expires_in_days}
              onChange={e => setForm({ ...form, expires_in_days: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>School (optional)</label>
            <input style={inputStyle} value={form.target_school} onChange={e => setForm({ ...form, target_school: e.target.value })} placeholder="e.g. UMaT" />
          </div>
          <div>
            <label style={labelStyle}>User ID (optional)</label>
            <input
              type="number"
              style={inputStyle}
              value={form.target_user_id}
              onChange={e => setForm({ ...form, target_user_id: e.target.value })}
              placeholder="Single student"
            />
          </div>
        </div>

        <button className="btn-brand" style={{ marginTop: 16 }} disabled={busy} onClick={send}>
          {busy ? 'Sending...' : 'Send Notification'}
        </button>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Sent Notifications</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => bulkDelete('expired')}>
              Delete expired
            </button>
            <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => bulkDelete('inactive')}>
              Delete paused
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 640, overflowY: 'auto' }}>
          {items.map(item => (
            <div key={item.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden', opacity: item.is_active ? 1 : 0.6 }}>
              {item.flyer_url && (
                <img src={item.flyer_url} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'contain', display: 'block', background: '#05070c' }} />
              )}
              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 13 }}>{item.title}</div>
                {item.body && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.45 }}>
                    {item.body.length > 160 ? item.body.slice(0, 160) + '…' : item.body}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-muted)' }}>
                  <span>{item.audience}</span>
                  <span>·</span>
                  <span>{item.read_count} read</span>
                  {item.target_school && (
                    <>
                      <span>·</span>
                      <span>{item.target_school}</span>
                    </>
                  )}
                  {item.target_user && (
                    <>
                      <span>·</span>
                      <span>{item.target_user.name || item.target_user.email}</span>
                    </>
                  )}
                  <button className="btn-ghost" style={{ marginLeft: 'auto', padding: '4px 9px', fontSize: 11 }} onClick={() => toggle(item)}>
                    {item.is_active ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    onClick={() => remove(item)}
                    style={{ padding: 5, borderRadius: 8, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.12)', color: '#f87171', display: 'flex' }}
                  >
                    <TrashIcon size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No notifications sent yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* PAYMENT GATEWAY                                                     */
/* ------------------------------------------------------------------ */

export function PaymentGatewayAdmin({ token, onNotify }: AdminPanelProps) {
  const [cfg, setCfg] = useState<any>(null)
  const [form, setForm] = useState<any>({
    enabled: false,
    environment: 'live',
    base_url: '',
    api_user: '',
    public_key: '',
    account_number: '',
    wallet_secret: '',
    merchant_email: '',
    callback_url: '',
  })
  const [busy, setBusy] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const r = await fetch('/api/admin/payment-gateway', { headers: authHeaders(token) })
    if (!r.ok) return
    const d = await r.json()
    setCfg(d)
    setForm({
      enabled: Boolean(d.enabled),
      environment: d.environment || 'live',
      base_url: d.base_url || '',
      api_user: d.api_user || '',
      public_key: '',
      account_number: d.account_number || '',
      wallet_secret: '',
      merchant_email: d.merchant_email || '',
      callback_url: d.callback_url || '',
    })
  }

  async function save() {
    setBusy(true)
    try {
      const payload: any = {
        enabled: form.enabled,
        environment: form.environment,
        base_url: form.base_url,
        api_user: form.api_user,
        account_number: form.account_number,
        merchant_email: form.merchant_email,
        callback_url: form.callback_url,
      }
      if (form.public_key.trim()) payload.public_key = form.public_key.trim()
      if (form.wallet_secret.trim()) payload.wallet_secret = form.wallet_secret.trim()
      const r = await fetch('/api/admin/payment-gateway', {
        method: 'PUT',
        headers: jsonHeaders(token),
        body: JSON.stringify(payload),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        onNotify(typeof d.detail === 'string' ? d.detail : 'Could not save payment settings.')
        return
      }
      onNotify('Moolre payment settings saved.')
      setForm((f: any) => ({ ...f, public_key: '', wallet_secret: '' }))
      load()
    } finally {
      setBusy(false)
    }
  }

  async function test() {
    setTesting(true)
    try {
      const r = await fetch('/api/admin/payment-gateway/test', { method: 'POST', headers: authHeaders(token) })
      const d = await r.json().catch(() => ({}))
      onNotify(d.message || (d.ok ? 'Gateway reachable.' : 'Gateway test failed.'))
    } finally {
      setTesting(false)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16 }}>
      <div style={cardStyle}>
        <PanelHeader
          icon={<CreditCardIcon size={20} />}
          title="Moolre Payment Gateway"
          desc="Connect Mobile Money and hosted checkout. Credentials saved here override the Render environment variables."
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '11px 14px',
            borderRadius: 12,
            background: cfg?.configured ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
            border: cfg?.configured ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(245,158,11,0.3)',
            marginBottom: 8,
          }}
        >
          <div style={{ fontSize: 12.5, fontWeight: 700, color: cfg?.configured ? '#22c55e' : '#f59e0b' }}>
            {cfg?.configured ? 'Credentials saved and gateway enabled.' : 'Gateway not fully configured yet.'}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700 }}>
            <input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} />
            Accept payments
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div>
            <label style={labelStyle}>Environment</label>
            <select style={inputStyle} value={form.environment} onChange={e => setForm({ ...form, environment: e.target.value })}>
              <option value="live">Live</option>
              <option value="sandbox">Sandbox</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>API Base URL (optional)</label>
            <input style={inputStyle} value={form.base_url} onChange={e => setForm({ ...form, base_url: e.target.value })} placeholder="https://api.moolre.com" />
          </div>
          <div>
            <label style={labelStyle}>API User (X-API-USER)</label>
            <input style={inputStyle} value={form.api_user} onChange={e => setForm({ ...form, api_user: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Public Key (X-API-PUBKEY)</label>
            <input
              style={inputStyle}
              value={form.public_key}
              onChange={e => setForm({ ...form, public_key: e.target.value })}
              placeholder={cfg?.public_key_set ? `Saved: ${cfg.public_key_masked} (enter to replace)` : 'Paste public key'}
            />
          </div>
          <div>
            <label style={labelStyle}>Account Number</label>
            <input style={inputStyle} value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Wallet Secret (webhook signing)</label>
            <input
              type="password"
              style={inputStyle}
              value={form.wallet_secret}
              onChange={e => setForm({ ...form, wallet_secret: e.target.value })}
              placeholder={cfg?.wallet_secret_set ? `Saved: ${cfg.wallet_secret_masked} (enter to replace)` : 'Paste wallet secret'}
            />
          </div>
          <div>
            <label style={labelStyle}>Merchant Email</label>
            <input style={inputStyle} value={form.merchant_email} onChange={e => setForm({ ...form, merchant_email: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Callback URL</label>
            <input style={inputStyle} value={form.callback_url} onChange={e => setForm({ ...form, callback_url: e.target.value })} />
          </div>
        </div>

        <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: 'var(--bg-subtle)', fontSize: 11.5, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
          <div><strong>Webhook URL:</strong> {cfg?.webhook_url || '—'}</div>
          <div><strong>Redirect URL:</strong> {cfg?.redirect_url || '—'}</div>
          <div>Paste these into your Moolre dashboard so payments are confirmed automatically.</div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <button className="btn-brand" style={{ width: 'auto', padding: '10px 20px', fontSize: 12.5 }} disabled={busy} onClick={save}>
            {busy ? 'Saving...' : 'Save Gateway Settings'}
          </button>
          <button className="btn-ghost" style={{ padding: '10px 16px', fontSize: 12.5 }} disabled={testing} onClick={test}>
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* AI ASSISTANT                                                        */
/* ------------------------------------------------------------------ */

function RobotIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
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

export function AiAdmin({ token, onNotify }: AdminPanelProps) {
  const [cfg, setCfg] = useState<any>(null)
  const [form, setForm] = useState<any>({
    enabled: true,
    api_key: '',
    model: 'gpt-4o-mini',
    base_url: 'https://api.openai.com/v1',
  })
  const [busy, setBusy] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const r = await fetch('/api/admin/ai-settings', { headers: authHeaders(token) })
    if (!r.ok) return
    const d = await r.json()
    setCfg(d)
    setForm({
      enabled: Boolean(d.enabled),
      api_key: '',
      model: d.model || 'gpt-4o-mini',
      base_url: d.base_url || 'https://api.openai.com/v1',
    })
  }

  async function save() {
    setBusy(true)
    try {
      const payload: any = {
        enabled: form.enabled,
        model: form.model,
        base_url: form.base_url,
      }
      if (form.api_key.trim()) payload.api_key = form.api_key.trim()
      const r = await fetch('/api/admin/ai-settings', {
        method: 'PUT',
        headers: jsonHeaders(token),
        body: JSON.stringify(payload),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        onNotify(typeof d.detail === 'string' ? d.detail : 'Could not save the assistant settings.')
        return
      }
      onNotify('Assistant settings saved.')
      setForm((f: any) => ({ ...f, api_key: '' }))
      load()
    } finally {
      setBusy(false)
    }
  }

  async function clearKey() {
    if (!window.confirm('Remove the saved AI provider key? The assistant will fall back to the built-in knowledge base.')) return
    const r = await fetch('/api/admin/ai-settings', {
      method: 'PUT',
      headers: jsonHeaders(token),
      body: JSON.stringify({ clear_api_key: true }),
    })
    if (r.ok) {
      onNotify('Provider key removed. The assistant will use the built-in knowledge base.')
      load()
    }
  }

  async function test() {
    setTesting(true)
    try {
      const r = await fetch('/api/admin/ai-settings/test', { method: 'POST', headers: authHeaders(token) })
      const d = await r.json().catch(() => ({}))
      onNotify(d.message || (d.ok ? 'Assistant is ready.' : 'Assistant test failed.'))
    } finally {
      setTesting(false)
    }
  }

  const live = cfg?.mode === 'live'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16 }}>
      <div style={cardStyle}>
        <PanelHeader
          icon={<RobotIcon size={20} />}
          title="AI Assistant"
          desc="Connect any OpenAI-compatible provider for real conversational answers. Without a key, the assistant keeps working from the built-in Campmatch knowledge base."
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '11px 14px',
            borderRadius: 12,
            background: live ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
            border: live ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(245,158,11,0.3)',
            marginBottom: 10,
          }}
        >
          <div style={{ fontSize: 12.5, fontWeight: 700, color: live ? '#22c55e' : '#f59e0b' }}>
            {live
              ? `Live AI connected · ${cfg?.model}`
              : cfg?.enabled
                ? 'Knowledge-base mode · add a provider key for full AI replies'
                : 'Assistant disabled'}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700 }}>
            <input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} />
            Enabled
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div>
            <label style={labelStyle}>Provider API Key</label>
            <input
              type="password"
              style={inputStyle}
              value={form.api_key}
              onChange={e => setForm({ ...form, api_key: e.target.value })}
              placeholder={cfg?.api_key_set ? `Saved: ${cfg.api_key_masked} (enter to replace)` : 'sk-...'}
              autoComplete="off"
            />
          </div>
          <div>
            <label style={labelStyle}>Model</label>
            <input style={inputStyle} value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="gpt-4o-mini" />
          </div>
          <div>
            <label style={labelStyle}>Base URL</label>
            <input style={inputStyle} value={form.base_url} onChange={e => setForm({ ...form, base_url: e.target.value })} placeholder="https://api.openai.com/v1" />
          </div>
        </div>

        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: 'var(--bg-subtle)', fontSize: 11.5, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
          Works with OpenAI, Groq, OpenRouter, DeepSeek and other OpenAI-compatible APIs. The assistant
          streams replies in real time, remembers the current conversation, and knows Campmatch features,
          Plus, payments, safety and support. The key is stored server-side and never shown to students.
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <button className="btn-brand" style={{ width: 'auto', padding: '10px 20px', fontSize: 12.5 }} disabled={busy} onClick={save}>
            {busy ? 'Saving...' : 'Save Assistant Settings'}
          </button>
          <button className="btn-ghost" style={{ padding: '10px 16px', fontSize: 12.5 }} disabled={testing} onClick={test}>
            {testing ? 'Testing...' : 'Test Assistant'}
          </button>
          {cfg?.api_key_set && (
            <button className="btn-ghost" style={{ padding: '10px 16px', fontSize: 12.5 }} onClick={clearKey}>
              Remove Key
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* STORAGE & BACKUPS                                                   */
/* ------------------------------------------------------------------ */

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i += 1
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

export function StorageAdmin({ token, onNotify }: AdminPanelProps) {
  const [data, setData] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const r = await fetch('/api/admin/storage', { headers: authHeaders(token) })
    if (r.ok) setData(await r.json())
  }

  async function backup() {
    setBusy(true)
    try {
      const r = await fetch('/api/admin/storage/backup', { method: 'POST', headers: authHeaders(token) })
      const d = await r.json().catch(() => ({}))
      onNotify(d.ok ? 'Fresh database backup created.' : d.result?.reason || 'Backup failed.')
      load()
    } finally {
      setBusy(false)
    }
  }

  async function downloadBackup(filename: string) {
    const r = await fetch(`/api/admin/storage/download/${encodeURIComponent(filename)}`, { headers: authHeaders(token) })
    if (!r.ok) {
      onNotify('Could not download that backup.')
      return
    }
    const blob = await r.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function exportRecords() {
    const r = await fetch('/api/admin/export', { headers: authHeaders(token) })
    if (!r.ok) {
      onNotify('Export failed.')
      return
    }
    const blob = await r.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'campmatch-export.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
      <div style={cardStyle}>
        <PanelHeader
          icon={<DatabaseIcon size={20} />}
          title="Storage & Persistence"
          desc="Your database, uploads, and backups must live on a Render persistent disk to survive redeploys."
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Database', value: data?.engine === 'sqlite' ? 'SQLite' : data?.engine || '—' },
            { label: 'DB Size', value: formatBytes(data?.database_bytes || 0) },
            { label: 'Upload Files', value: data?.upload_files ?? 0 },
            { label: 'Upload Size', value: formatBytes(data?.upload_bytes || 0) },
            { label: 'Users', value: data?.counts?.users ?? 0 },
            { label: 'Matches', value: data?.counts?.matches ?? 0 },
          ].map(stat => (
            <div key={stat.label} style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{stat.label}</div>
              <div style={{ fontSize: 16, fontWeight: 900, marginTop: 3 }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            padding: '11px 13px',
            borderRadius: 12,
            fontSize: 12,
            lineHeight: 1.6,
            fontWeight: 600,
            background: data?.persistent_disk ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.12)',
            border: data?.persistent_disk ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(245,158,11,0.34)',
            color: data?.persistent_disk ? '#22c55e' : '#f59e0b',
            marginBottom: 14,
          }}
        >
          {data?.render_hint || 'Checking storage configuration...'}
        </div>

        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.65, wordBreak: 'break-all', marginBottom: 14 }}>
          <div><strong>Data dir:</strong> {data?.data_dir || '—'}</div>
          <div><strong>Uploads:</strong> {data?.upload_dir || '—'}</div>
          <div><strong>Backups:</strong> {data?.backup_dir || '—'}</div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn-brand" style={{ width: 'auto', padding: '9px 16px', fontSize: 12.5 }} disabled={busy} onClick={backup}>
            {busy ? 'Backing up...' : 'Create Backup Now'}
          </button>
          <button className="btn-ghost" style={{ padding: '9px 14px', fontSize: 12.5 }} onClick={exportRecords}>
            Export JSON Records
          </button>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>Rolling Backups</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 520, overflowY: 'auto' }}>
          {(data?.backups || []).map((b: any) => (
            <div
              key={b.file}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 12,
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.file}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {formatBytes(b.bytes)} · {new Date(b.created_at).toLocaleString()}
                </div>
              </div>
              <button className="btn-ghost" style={{ padding: '6px 10px', fontSize: 11.5 }} onClick={() => downloadBackup(b.file)}>
                Download
              </button>
            </div>
          ))}
          {(data?.backups || []).length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No backups yet. Create one before your next deploy.
            </div>
          )}
        </div>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-muted)' }}>
          <CheckIcon size={13} /> A backup is also created automatically on every server boot.
        </div>
      </div>
    </div>
  )
}

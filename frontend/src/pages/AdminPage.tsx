import React, { useState, useEffect } from 'react'
import { makeAvatarPlaceholder } from '../constants'
import { CloseXIcon, TrashIcon } from '../components/Icons'
import { ExploreRoomsAdmin, NotificationsAdmin, PaymentGatewayAdmin, StorageAdmin } from './AdminAdvanced'

interface AdminPageProps {
  token: string
  onNotify: (msg: string) => void
}

type AdminSection =
  | 'overview'
  | 'controls'
  | 'users'
  | 'reports'
  | 'moderation'
  | 'payments'
  | 'rooms'
  | 'notifications'
  | 'gateway'
  | 'storage'
  | 'vault'
  | 'audit'

export function AdminPage({ token, onNotify }: AdminPageProps) {
  const [section, setSection] = useState<AdminSection>('overview')
  const [statsData, setStatsData] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [userFilter, setUserFilter] = useState('all')
  const [userSearch, setUserSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<any>(null)

  const [reports, setReports] = useState<any[]>([])
  const [reportMessages, setReportMessages] = useState<Record<number, any[]>>({})
  const [modLogs, setModLogs] = useState<any[]>([])
  const [pendingReviews, setPendingReviews] = useState<any[]>([])
  const [rejectedOnly, setRejectedOnly] = useState(false)
  const [payments, setPayments] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [savingSettings, setSavingSettings] = useState(false)

  const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }

  useEffect(() => {
    loadOverviewAndSettings()
  }, [token])

  // Live real-time refresh — the console updates itself as students act.
  useEffect(() => {
    const id = window.setInterval(() => {
      loadOverviewAndSettings()
      if (section === 'users') loadUsers(userFilter, userSearch)
      else if (section === 'vault') loadUsers('deleted', userSearch)
      else if (section === 'reports') loadReports()
      else if (section === 'moderation') {
        loadModLogs(rejectedOnly)
        loadPendingReviews()
      }
      else if (section === 'payments') loadPayments()
      else if (section === 'audit') loadAudit()
    }, 10000)
    return () => window.clearInterval(id)
  }, [section, userFilter, userSearch, rejectedOnly, token])

  useEffect(() => {
    if (section === 'users') loadUsers(userFilter, userSearch)
    else if (section === 'vault') loadUsers('deleted', userSearch)
    else if (section === 'reports') loadReports()
    else if (section === 'moderation') {
      loadModLogs(rejectedOnly)
      loadPendingReviews()
    }
    else if (section === 'payments') loadPayments()
    else if (section === 'audit') loadAudit()
  }, [section, userFilter, rejectedOnly])

  async function loadOverviewAndSettings() {
    const [st, cfg] = await Promise.all([
      fetch('/api/admin/stats', { headers }).then(r => (r.ok ? r.json() : null)),
      fetch('/api/admin/settings', { headers }).then(r => (r.ok ? r.json() : null)),
    ])
    if (st) setStatsData(st)
    if (cfg) setSettings(cfg)
  }

  async function loadUsers(status = 'all', q = '') {
    const qs = new URLSearchParams({ status, q })
    const r = await fetch(`/api/admin/users?${qs.toString()}`, { headers })
    if (r.ok) setUsers(await r.json())
  }

  async function openUserInspector(userId: number) {
    const r = await fetch(`/api/admin/users/${userId}`, { headers })
    if (r.ok) setSelectedUser(await r.json())
  }

  async function loadReports() {
    const r = await fetch('/api/admin/reports', { headers })
    if (r.ok) setReports(await r.json())
  }

  async function loadReportTranscript(reportId: number) {
    const r = await fetch(`/api/admin/reports/${reportId}/messages`, { headers })
    if (r.ok) {
      const msgs = await r.json()
      setReportMessages(prev => ({ ...prev, [reportId]: msgs }))
    }
  }

  async function loadModLogs(onlyRejected: boolean) {
    const r = await fetch(`/api/admin/moderation-logs?rejected_only=${onlyRejected}`, { headers })
    if (r.ok) setModLogs(await r.json())
  }

  async function loadPendingReviews() {
    const r = await fetch('/api/admin/moderation/review', { headers })
    if (r.ok) setPendingReviews(await r.json())
  }

  async function approveReview(id: number) {
    const r = await fetch(`/api/admin/moderation/${id}/approve`, { method: 'POST', headers, body: JSON.stringify({}) })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) {
      onNotify(typeof d.detail === 'string' ? d.detail : 'Could not approve this photo.')
      loadPendingReviews()
      return
    }
    onNotify('Photo approved and added to the student profile.')
    loadPendingReviews()
    loadModLogs(rejectedOnly)
  }

  async function declineReview(id: number) {
    const r = await fetch(`/api/admin/moderation/${id}/decline`, { method: 'POST', headers, body: JSON.stringify({}) })
    if (r.ok) {
      onNotify('Photo declined and removed from review.')
      loadPendingReviews()
      loadModLogs(rejectedOnly)
    }
  }

  async function banUser(userId: number, mode: 'temporary' | 'permanent', days = 7) {
    const reason = window.prompt(mode === 'permanent' ? 'Reason for the permanent ban:' : `Reason for the ${days}-day ban:`) || ''
    if (reason === null) return
    const r = await fetch(`/api/admin/users/${userId}/ban`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ mode, days, reason }),
    })
    if (r.ok) {
      onNotify(mode === 'permanent' ? 'Account permanently banned.' : `Account temporarily banned for ${days} days.`)
      if (selectedUser?.id === userId) openUserInspector(userId)
      loadUsers(section === 'vault' ? 'deleted' : userFilter, userSearch)
      loadOverviewAndSettings()
    }
  }

  async function unbanUser(userId: number) {
    const r = await fetch(`/api/admin/users/${userId}/unban`, { method: 'POST', headers })
    if (r.ok) {
      onNotify('Ban lifted; account restored.')
      if (selectedUser?.id === userId) openUserInspector(userId)
      loadUsers(section === 'vault' ? 'deleted' : userFilter, userSearch)
      loadOverviewAndSettings()
    }
  }

  async function loadPayments() {
    const r = await fetch('/api/admin/payments', { headers })
    if (r.ok) setPayments(await r.json())
  }

  async function loadAudit() {
    const r = await fetch('/api/admin/audit-logs', { headers })
    if (r.ok) setAuditLogs(await r.json())
  }

  async function savePlatformSettings(patch?: Record<string, any>) {
    if (!settings) return
    setSavingSettings(true)
    const payload = patch || {
      plus_enabled: settings.plus_enabled,
      free_daily_swipe_limit: Number(settings.free_daily_swipe_limit),
      plus_price_ghs: Number(settings.plus_price_ghs),
      plus_duration_days: Number(settings.plus_duration_days),
      free_daily_super_likes: Number(settings.free_daily_super_likes),
      plus_daily_super_likes: Number(settings.plus_daily_super_likes),
      umat_only: settings.umat_only,
      allowed_domains: settings.allowed_domains,
      signups_enabled: settings.signups_enabled,
      maintenance_mode: settings.maintenance_mode,
      announcement_banner: settings.announcement_banner,
    }
    try {
      const r = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      })
      if (r.ok) {
        const updated = await r.json()
        setSettings(updated)
        onNotify('Platform configuration saved and broadcast live.')
      }
    } finally {
      setSavingSettings(false)
    }
  }

  async function updateUserAction(userId: number, body: Record<string, any>, msg = 'User updated.') {
    const r = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    })
    if (r.ok) {
      onNotify(msg)
      if (selectedUser?.id === userId) openUserInspector(userId)
      loadUsers(section === 'vault' ? 'deleted' : userFilter, userSearch)
      loadOverviewAndSettings()
    }
  }

  async function removeUserPhoto(userId: number, url: string) {
    const r = await fetch(`/api/admin/users/${userId}/photos?url=${encodeURIComponent(url)}`, {
      method: 'DELETE',
      headers,
    })
    if (r.ok) {
      onNotify('Photo removed from user profile.')
      openUserInspector(userId)
    }
  }

  async function softDeleteUser(userId: number) {
    const r = await fetch(`/api/admin/users/${userId}/soft-delete`, { method: 'POST', headers })
    if (r.ok) {
      onNotify('Account moved to Deleted Vault (all records preserved).')
      setSelectedUser(null)
      loadUsers(userFilter, userSearch)
      loadOverviewAndSettings()
    }
  }

  async function restoreUser(userId: number) {
    const r = await fetch(`/api/admin/users/${userId}/restore`, { method: 'POST', headers })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) {
      onNotify(d.detail || 'Could not restore account.')
      return
    }
    onNotify('Account restored.')
    setSelectedUser(null)
    loadUsers('deleted', userSearch)
    loadOverviewAndSettings()
  }

  async function forceLogout(userId: number) {
    const r = await fetch(`/api/admin/users/${userId}/force-logout`, { method: 'POST', headers })
    if (r.ok) onNotify('Active sessions invalidated.')
  }

  async function handleReportAction(reportId: number, action: 'resolve' | 'dismiss' | 'suspend_user' | 'ban_temporary' | 'ban_permanent', days = 7) {
    let reason = ''
    if (action === 'ban_temporary' || action === 'ban_permanent') {
      const label = action === 'ban_permanent' ? 'Reason for permanent ban' : `Reason for ${days}-day ban`
      const input = window.prompt(label)
      if (input === null) return
      reason = input
    }
    const r = await fetch(`/api/admin/reports/${reportId}/action`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, days, reason }),
    })
    if (r.ok) {
      onNotify('Report updated.')
      loadReports()
      loadOverviewAndSettings()
    }
  }

  async function approvePayment(paymentId: number) {
    const r = await fetch(`/api/admin/payments/${paymentId}/approve`, { method: 'POST', headers })
    if (r.ok) {
      onNotify('Payment approved and Plus activated.')
      loadPayments()
      loadOverviewAndSettings()
    }
  }

  const ov = statsData?.overview || {}

  const navItems: { id: AdminSection; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'controls', label: 'Controls & Limits' },
    { id: 'users', label: 'Users' },
    { id: 'reports', label: `Reports (${ov.open_reports || 0})` },
    { id: 'moderation', label: 'Image Guard' },
    { id: 'payments', label: 'Revenue' },
    { id: 'rooms', label: 'Explore Rooms' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'gateway', label: 'Payment Gateway' },
    { id: 'storage', label: 'Storage & Backups' },
    { id: 'vault', label: `Deleted Vault (${ov.deleted_vault || 0})` },
    { id: 'audit', label: 'Audit Trail' },
  ]

  return (
    <div className="scroll-pane" style={{ padding: '20px 16px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Administration Console</h2>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            Real-time platform metrics, subscription rules, moderation, and preserved records.
          </div>
        </div>
        <button className="btn-ghost" style={{ padding: '8px 14px', fontSize: 12.5 }} onClick={loadOverviewAndSettings}>
          Refresh Metrics
        </button>
      </div>

      {/* Section Tabs */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, marginBottom: 18, borderBottom: '1px solid var(--border-subtle)' }}>
        {navItems.map(item => (
          <button
            key={item.id}
            className={`selectable-chip ${section === item.id ? 'selected' : ''}`}
            style={{ whiteSpace: 'nowrap', fontSize: 12.5, padding: '7px 13px' }}
            onClick={() => setSection(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 1. OVERVIEW */}
      {section === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: 10, marginBottom: 22 }}>
            {[
              { label: 'Active Accounts', value: ov.active_users ?? 0 },
              { label: 'Online Right Now', value: ov.online_now ?? 0, accent: '#22c55e' },
              { label: 'Completed Profiles', value: ov.complete_profiles ?? 0 },
              { label: 'Plus Subscribers', value: ov.premium_users ?? 0, accent: '#f59e0b' },
              { label: 'Swipes (24h / Total)', value: `${ov.swipes_today ?? 0} / ${ov.swipes_total ?? 0}` },
              { label: 'Matches (24h / Active)', value: `${ov.matches_today ?? 0} / ${ov.matches_active ?? 0}` },
              { label: 'Messages (24h / Total)', value: `${ov.messages_today ?? 0} / ${ov.messages_total ?? 0}` },
              { label: 'Revenue Collected', value: `GHS ${(ov.revenue_ghs ?? 0).toFixed(2)}`, accent: '#22c55e' },
              { label: 'Open Safety Reports', value: ov.open_reports ?? 0, accent: ov.open_reports ? '#ff5a67' : undefined },
              { label: 'Blocked Photo Uploads', value: ov.rejected_uploads ?? 0 },
              { label: 'Suspended Users', value: ov.suspended_users ?? 0 },
              { label: 'Deleted Records Vault', value: ov.deleted_vault ?? 0 },
            ].map(card => (
              <div
                key={card.label}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 16,
                  padding: '14px 16px',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {card.label}
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, marginTop: 5, color: card.accent || 'var(--text-primary)' }}>
                  {card.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: 18 }}>
              <div style={{ fontWeight: 800, fontSize: 14.5, marginBottom: 12 }}>7-Day Activity</div>
              {(statsData?.daily_series || []).map((d: any) => (
                <div
                  key={d.date}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '70px 1fr',
                    alignItems: 'center',
                    gap: 10,
                    padding: '7px 0',
                    borderBottom: '1px solid var(--border-subtle)',
                    fontSize: 12.5,
                  }}
                >
                  <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{d.date}</span>
                  <div style={{ display: 'flex', gap: 14 }}>
                    <span><strong>{d.signups}</strong> signups</span>
                    <span><strong>{d.swipes}</strong> swipes</span>
                    <span><strong>{d.messages}</strong> msgs</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: 18 }}>
              <div style={{ fontWeight: 800, fontSize: 14.5, marginBottom: 12 }}>Campus Distribution</div>
              {(statsData?.schools || []).map((s: any) => {
                const maxC = Math.max(1, statsData?.schools?.[0]?.count || 1)
                const widthPct = Math.max(6, Math.round((s.count / maxC) * 100))
                return (
                  <div key={s.school} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700 }}>{s.school}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{s.count} students</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: 'var(--bg-subtle)', overflow: 'hidden' }}>
                      <div style={{ width: `${widthPct}%`, height: '100%', background: 'var(--brand-grad)' }} />
                    </div>
                  </div>
                )
              })}
              {(statsData?.schools || []).length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No registered student profiles yet.</div>
              )}
            </div>
          </div>
        </>
      )}

      {/* 2. CONTROLS & ECONOMY LIMITS */}
      {section === 'controls' && settings && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 16 }}>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: 18 }}>
            <div style={{ fontWeight: 800, fontSize: 15.5, marginBottom: 12 }}>Subscription & Swipe Rules</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Enable Campmatch Plus</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Enforces daily swipe cap & Beeline blur on free accounts
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !settings.plus_enabled
                  setSettings({ ...settings, plus_enabled: next })
                  savePlatformSettings({ plus_enabled: next })
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  border: 'none',
                  fontWeight: 800,
                  fontSize: 12.5,
                  background: settings.plus_enabled ? '#22c55e' : 'var(--bg-subtle)',
                  color: settings.plus_enabled ? '#052e16' : 'var(--text-primary)',
                }}
              >
                {settings.plus_enabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="field-label">Free Daily Swipe Cap</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  className="modern-input"
                  value={settings.free_daily_swipe_limit}
                  onChange={e => setSettings({ ...settings, free_daily_swipe_limit: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">Plus Price (GHS)</label>
                <input
                  type="number"
                  step="0.5"
                  min={1}
                  className="modern-input"
                  value={settings.plus_price_ghs}
                  onChange={e => setSettings({ ...settings, plus_price_ghs: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <div>
                <label className="field-label">Plan Days</label>
                <input
                  type="number"
                  min={1}
                  className="modern-input"
                  value={settings.plus_duration_days}
                  onChange={e => setSettings({ ...settings, plus_duration_days: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">Free Super/Day</label>
                <input
                  type="number"
                  min={0}
                  className="modern-input"
                  value={settings.free_daily_super_likes}
                  onChange={e => setSettings({ ...settings, free_daily_super_likes: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">Plus Super/Day</label>
                <input
                  type="number"
                  min={1}
                  className="modern-input"
                  value={settings.plus_daily_super_likes}
                  onChange={e => setSettings({ ...settings, plus_daily_super_likes: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: 18 }}>
            <div style={{ fontWeight: 800, fontSize: 15.5, marginBottom: 12 }}>Access, Domains & Broadcast</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>University Scope</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {settings.umat_only ? 'Restricted to @st.umat.edu.gh' : 'All listed .edu.gh domains allowed'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, umat_only: !settings.umat_only })}
                className="btn-ghost"
                style={{ padding: '7px 13px', fontSize: 12 }}
              >
                {settings.umat_only ? 'UMaT Only' : 'All Approved'}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Allow New Registrations</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {settings.signups_enabled ? 'Open to eligible students' : 'Signups paused'}
                </div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(settings.signups_enabled)}
                onChange={e => setSettings({ ...settings, signups_enabled: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: '#FD267A' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Maintenance Mode</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Temporarily restrict non-admin access
                </div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(settings.maintenance_mode)}
                onChange={e => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: '#FD267A' }}
              />
            </div>

            <label className="field-label">Allowed University Domains (Comma-separated)</label>
            <textarea
              className="modern-textarea"
              rows={3}
              value={settings.allowed_domains || ''}
              onChange={e => setSettings({ ...settings, allowed_domains: e.target.value })}
            />

            <label className="field-label">Live Campus Announcement Banner (Blank = Hidden)</label>
            <input
              className="modern-input"
              placeholder="e.g. Welcome back for Semester 2 — verify your Hall in Profile!"
              value={settings.announcement_banner || ''}
              onChange={e => setSettings({ ...settings, announcement_banner: e.target.value })}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <button className="btn-brand" disabled={savingSettings} onClick={() => savePlatformSettings()}>
              {savingSettings ? 'Saving Configuration...' : 'Save All Platform Settings'}
            </button>
          </div>
        </div>
      )}

      {/* 3. USERS DIRECTORY & 7. DELETED VAULT */}
      {(section === 'users' || section === 'vault') && (
        <div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <input
              className="modern-input"
              style={{ flex: 1, minWidth: 220 }}
              placeholder="Search name, student email, or programme..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadUsers(section === 'vault' ? 'deleted' : userFilter, userSearch)}
            />
            <button
              className="btn-ghost"
              onClick={() => loadUsers(section === 'vault' ? 'deleted' : userFilter, userSearch)}
            >
              Search
            </button>
          </div>

          {section === 'users' && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {[
                { id: 'all', label: 'All Active' },
                { id: 'plus', label: 'Plus Members' },
                { id: 'suspended', label: 'Suspended' },
                { id: 'incomplete', label: 'Incomplete' },
                { id: 'admin', label: 'Admins' },
              ].map(f => (
                <button
                  key={f.id}
                  className={`selectable-chip ${userFilter === f.id ? 'selected' : ''}`}
                  style={{ fontSize: 12, padding: '6px 12px' }}
                  onClick={() => setUserFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {section === 'vault' && (
            <div
              style={{
                marginBottom: 14,
                padding: '12px 14px',
                borderRadius: 14,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                fontSize: 13,
                color: 'var(--text-secondary)',
              }}
            >
              Deleted Accounts Vault: Accounts listed here deleted their profile and are hidden from all public feeds and chats, while every historical swipe, match, message, and payment record remains preserved.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {users.map(u => (
              <div
                key={u.id}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 15,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <img
                    src={u.photo_url || makeAvatarPlaceholder(u.name || u.email)}
                    alt=""
                    style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontWeight: 800, fontSize: 14.5 }}>
                      <span>{u.name || 'Unnamed Student'}</span>
                      {u.online && <span className="active-dot" title="Online now" />}
                      {u.is_admin && (
                        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: 'rgba(56,189,248,0.18)', color: '#38bdf8' }}>
                          ADMIN
                        </span>
                      )}
                      {u.is_premium && (
                        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: 'rgba(245,158,11,0.18)', color: '#f59e0b' }}>
                          PLUS
                        </span>
                      )}
                      {!u.is_active && !u.is_deleted && (
                        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: 'rgba(255,68,88,0.18)', color: '#ff5a67' }}>
                          SUSPENDED
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {u.email} · {u.school || 'Campus'} · L{u.level || '-'} · {u.course || 'No course'}
                    </div>
                    {u.is_deleted && (
                      <div style={{ fontSize: 11.5, color: '#f59e0b', marginTop: 3 }}>
                        Deleted {u.deleted_at?.slice(0, 16)} · Reason: {u.deletion_reason || 'Unspecified'}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    className="btn-ghost"
                    style={{ padding: '6px 12px', fontSize: 12 }}
                    onClick={() => openUserInspector(u.id)}
                  >
                    Inspect
                  </button>
                  {u.is_deleted ? (
                    <button
                      onClick={() => restoreUser(u.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 99,
                        border: 'none',
                        background: 'rgba(34,197,94,0.18)',
                        color: '#22c55e',
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      Restore Account
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => updateUserAction(u.id, { is_premium: !u.is_premium }, 'Plus status updated.')}
                        style={{
                          padding: '6px 11px',
                          borderRadius: 99,
                          border: 'none',
                          background: 'rgba(245,158,11,0.16)',
                          color: '#f59e0b',
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >
                        {u.is_premium ? 'Revoke Plus' : 'Grant Plus'}
                      </button>
                      <button
                        onClick={() => updateUserAction(u.id, { is_active: !u.is_active }, 'Account status updated.')}
                        style={{
                          padding: '6px 11px',
                          borderRadius: 99,
                          border: 'none',
                          background: u.is_active ? 'rgba(255,68,88,0.15)' : 'rgba(34,197,94,0.16)',
                          color: u.is_active ? '#ff5a67' : '#22c55e',
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >
                        {u.is_active ? 'Suspend' : 'Unsuspend'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)' }}>
                No records match this filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. REPORTS & CONVERSATION AUDIT */}
      {section === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reports.map(r => (
            <div
              key={r.id}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 16,
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>
                  #{r.id} · {r.reason}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '3px 9px',
                    borderRadius: 99,
                    background: r.resolved ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.16)',
                    color: r.resolved ? '#22c55e' : '#f59e0b',
                    textTransform: 'uppercase',
                  }}
                >
                  {r.status}
                </span>
              </div>

              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 6 }}>
                Reported User:{' '}
                <strong
                  style={{ cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => r.reported_user && openUserInspector(r.reported_user.id)}
                >
                  {r.reported_user?.name || 'User'} ({r.reported_user?.email})
                </strong>{' '}
                · Reported by {r.reporter?.email} · {r.created_at?.slice(0, 16)}
              </div>

              {r.details && (
                <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 10, background: 'var(--bg-app)', fontSize: 13 }}>
                  {r.details}
                </div>
              )}

              {reportMessages[r.id] && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 12,
                    borderRadius: 12,
                    background: 'var(--bg-app)',
                    maxHeight: 200,
                    overflowY: 'auto',
                    fontSize: 12.5,
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: 6, color: 'var(--text-muted)' }}>
                    Preserved Match Transcript ({reportMessages[r.id].length} messages)
                  </div>
                  {reportMessages[r.id].map((m: any) => (
                    <div key={m.id} style={{ marginBottom: 4 }}>
                      <strong>[User #{m.sender_id}]:</strong> {m.content}
                    </div>
                  ))}
                  {reportMessages[r.id].length === 0 && <div>No messages exchanged between these users.</div>}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <button
                  className="btn-ghost"
                  style={{ padding: '6px 12px', fontSize: 12 }}
                  onClick={() => loadReportTranscript(r.id)}
                >
                  View Chat Context
                </button>
                {!r.resolved && (
                  <>
                    <button
                      className="btn-ghost"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                      onClick={() => handleReportAction(r.id, 'resolve')}
                    >
                      Mark Resolved
                    </button>
                    <button
                      className="btn-ghost"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                      onClick={() => handleReportAction(r.id, 'dismiss')}
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleReportAction(r.id, 'suspend_user')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 99,
                        border: 'none',
                        background: 'rgba(255,68,88,0.18)',
                        color: '#ff5a67',
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      Suspend Reported User
                    </button>
                    <button
                      className="btn-ghost"
                      style={{ padding: '6px 12px', fontSize: 12, color: '#ffb15c' }}
                      onClick={() => handleReportAction(r.id, 'ban_temporary', 7)}
                    >
                      Ban 7 Days
                    </button>
                    <button
                      className="btn-ghost"
                      style={{ padding: '6px 12px', fontSize: 12, color: '#ff8f5c' }}
                      onClick={() => handleReportAction(r.id, 'ban_temporary', 30)}
                    >
                      Ban 30 Days
                    </button>
                    <button
                      className="btn-ghost"
                      style={{ padding: '6px 12px', fontSize: 12, color: '#ff5a67' }}
                      onClick={() => handleReportAction(r.id, 'ban_permanent')}
                    >
                      Ban Permanently
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {reports.length === 0 && (
            <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)' }}>
              No user reports submitted.
            </div>
          )}
        </div>
      )}

      {/* 5. IMAGE MODERATION LOGS */}
      {section === 'moderation' && (
        <div>
          {pendingReviews.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                Pending Photo Review
                <span style={{ fontSize: 11, fontWeight: 800, background: 'rgba(245,158,11,0.16)', color: '#f59e0b', padding: '2px 9px', borderRadius: 99 }}>
                  {pendingReviews.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pendingReviews.map(m => (
                  <div
                    key={m.id}
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 16,
                      padding: 14,
                      display: 'flex',
                      gap: 14,
                      flexWrap: 'wrap',
                    }}
                  >
                    <img
                      src={m.image_url}
                      alt="Pending review"
                      style={{ width: 120, height: 150, objectFit: 'cover', borderRadius: 12, background: '#05070c' }}
                    />
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div style={{ fontWeight: 800, fontSize: 13.5 }}>
                        {m.user_name || m.user_email || `User #${m.user_id}`}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {m.filename}
                      </div>
                      <div style={{ fontSize: 12, color: '#ff8f5c', marginTop: 4, fontWeight: 600 }}>
                        Auto-rejected: {m.reject_code}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.45 }}>
                        {m.reason}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        Faces: {m.metrics?.faces_detected ?? '-'} · Skin: {m.metrics?.body_skin_ratio ?? '-'} · {m.created_at?.slice(0, 16)}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => approveReview(m.id)}
                          style={{
                            padding: '7px 14px',
                            borderRadius: 99,
                            border: 'none',
                            background: 'rgba(34,197,94,0.18)',
                            color: '#22c55e',
                            fontWeight: 800,
                            fontSize: 12,
                          }}
                        >
                          Accept & Add
                        </button>
                        <button
                          onClick={() => declineReview(m.id)}
                          style={{
                            padding: '7px 14px',
                            borderRadius: 99,
                            border: 'none',
                            background: 'rgba(255,68,88,0.16)',
                            color: '#ff5a67',
                            fontWeight: 800,
                            fontSize: 12,
                          }}
                        >
                          Decline
                        </button>
                        <button className="btn-ghost" style={{ padding: '7px 12px', fontSize: 12 }} onClick={() => openUserInspector(m.user_id)}>
                          Inspect User
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Automated human presence, blank/black/white, and explicit skin-exposure checks.
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={rejectedOnly}
                onChange={e => setRejectedOnly(e.target.checked)}
              />
              Rejected only
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {modLogs.map(m => (
              <div
                key={m.id}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 14,
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13.5 }}>
                    {m.user_name || m.user_email || `User #${m.user_id}`} · <span style={{ fontWeight: 500 }}>{m.filename}</span>
                  </div>
                  <div style={{ fontSize: 12, color: m.accepted ? '#22c55e' : '#ff6b7a', marginTop: 2, fontWeight: 600 }}>
                    {m.accepted ? 'Accepted' : `Blocked (${m.reject_code}): ${m.reason}`}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                    Faces: {m.metrics?.faces_detected ?? '-'} · Body skin: {m.metrics?.body_skin_ratio ?? '-'} · Lum: {m.metrics?.mean_lum ?? '-'} · {m.created_at?.slice(0, 16)}
                  </div>
                </div>
                <button
                  className="btn-ghost"
                  style={{ padding: '6px 11px', fontSize: 11.5 }}
                  onClick={() => openUserInspector(m.user_id)}
                >
                  Inspect User
                </button>
              </div>
            ))}
            {modLogs.length === 0 && (
              <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)' }}>
                No image moderation events recorded yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. REVENUE & PAYMENTS */}
      {section === 'payments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {payments.map(p => (
            <div
              key={p.id}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 14,
                padding: '13px 15px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>
                  {p.currency} {Number(p.amount).toFixed(2)} · {p.description}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {p.user_email} · Ref: {p.reference} · {p.created_at?.slice(0, 16)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 800,
                    color: p.status === 'success' ? '#22c55e' : '#f59e0b',
                    textTransform: 'uppercase',
                  }}
                >
                  {p.status}
                </span>
                {p.status !== 'success' && (
                  <button
                    className="btn-ghost"
                    style={{ padding: '6px 11px', fontSize: 11.5 }}
                    onClick={() => approvePayment(p.id)}
                  >
                    Approve & Grant Plus
                  </button>
                )}
              </div>
            </div>
          ))}
          {payments.length === 0 && (
            <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)' }}>
              No payment records yet.
            </div>
          )}
        </div>
      )}

      {/* 8. AUDIT LOGS */}
      {section === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {auditLogs.map(a => (
            <div
              key={a.id}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 13,
                padding: '11px 14px',
                fontSize: 13,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>{a.action} {a.target_user_id ? `→ User #${a.target_user_id}` : ''}</span>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{a.created_at?.slice(0, 16)}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                By {a.admin_email} {a.details ? `· ${a.details}` : ''}
              </div>
            </div>
          ))}
          {auditLogs.length === 0 && (
            <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)' }}>
              No administrative actions logged yet.
            </div>
          )}
        </div>
      )}

      {/* FULL USER DOSSIER MODAL */}
      {selectedUser && (
        <div className="sheet-backdrop" onClick={() => setSelectedUser(null)}>
          <div className="modal-card" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 19, fontWeight: 900 }}>
                  User #{selectedUser.id} · {selectedUser.name || 'Unnamed'}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  {selectedUser.email} · {selectedUser.school} · Level {selectedUser.level}
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                style={{ border: 'none', background: 'none', color: 'var(--text-secondary)', padding: 4 }}
              >
                <CloseXIcon size={20} />
              </button>
            </div>

            {selectedUser.ban_type && (
              <div
                style={{
                  marginBottom: 14,
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: 'rgba(255,68,88,0.1)',
                  border: '1px solid rgba(255,68,88,0.3)',
                  color: '#ff7b88',
                  fontSize: 12.5,
                  lineHeight: 1.5,
                }}
              >
                <strong>Banned</strong> ({selectedUser.ban_type})
                {selectedUser.banned_until ? ` until ${String(selectedUser.banned_until).slice(0, 16)}` : ' — permanent'}
                {selectedUser.ban_reason ? <div style={{ marginTop: 2, color: 'var(--text-secondary)' }}>Reason: {selectedUser.ban_reason}</div> : null}
              </div>
            )}

            {/* Activity Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(84px, 1fr))', gap: 8, marginBottom: 16 }}>
              {[
                { k: 'Swipes', v: selectedUser.activity?.swipes_made ?? 0 },
                { k: 'Liked By', v: selectedUser.activity?.likes_received ?? 0 },
                { k: 'Matches', v: selectedUser.activity?.matches_total ?? 0 },
                { k: 'Msgs', v: selectedUser.activity?.messages_sent ?? 0 },
                { k: 'Reports', v: selectedUser.activity?.reports_against ?? 0 },
              ].map(x => (
                <div key={x.k} style={{ background: 'var(--bg-elevated)', padding: 10, borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 900 }}>{x.v}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700 }}>{x.k}</div>
                </div>
              ))}
            </div>

            {/* Photo Moderation Strip */}
            <div className="field-label" style={{ marginTop: 0 }}>Uploaded Photos ({selectedUser.photo_urls?.length || 0})</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
              {(selectedUser.photo_urls || []).map((url: string) => (
                <div key={url} style={{ position: 'relative', aspectRatio: '3 / 4', borderRadius: 12, overflow: 'hidden' }}>
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={() => removeUserPhoto(selectedUser.id, url)}
                    title="Delete inappropriate photo"
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: 'none',
                      background: 'rgba(239,68,68,0.9)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              ))}
              {(selectedUser.photo_urls || []).length === 0 && (
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>No photos on profile.</div>
              )}
            </div>

            {selectedUser.bio && (
              <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: 12, borderRadius: 12 }}>
                <strong>Bio:</strong> {selectedUser.bio}
              </div>
            )}

            {/* Admin Controls on User */}
            <div className="field-label">Administrative Actions</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {selectedUser.is_deleted ? (
                <button className="btn-brand" onClick={() => restoreUser(selectedUser.id)}>
                  Restore Deleted Account
                </button>
              ) : (
                <>
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 12, padding: '8px 12px' }}
                    onClick={() => updateUserAction(selectedUser.id, { is_premium: !selectedUser.is_premium, plus_days: 30 })}
                  >
                    {selectedUser.is_premium ? 'Revoke Plus' : 'Grant 30d Plus'}
                  </button>
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 12, padding: '8px 12px' }}
                    onClick={() => updateUserAction(selectedUser.id, { boost_minutes: 30 }, 'Granted 30m Spotlight.')}
                  >
                    Grant 30m Spotlight
                  </button>
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 12, padding: '8px 12px' }}
                    onClick={() => updateUserAction(selectedUser.id, { is_admin: !selectedUser.is_admin }, 'Admin role updated.')}
                  >
                    {selectedUser.is_admin ? 'Demote Admin' : 'Make Admin'}
                  </button>
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 12, padding: '8px 12px' }}
                    onClick={() => forceLogout(selectedUser.id)}
                  >
                    Force Logout
                  </button>
                  {selectedUser.ban_type ? (
                    <>
                      <button
                        onClick={() => unbanUser(selectedUser.id)}
                        style={{
                          padding: '8px 13px',
                          borderRadius: 99,
                          border: 'none',
                          background: 'rgba(34,197,94,0.16)',
                          color: '#22c55e',
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >
                        Lift Ban
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn-ghost"
                        style={{ fontSize: 12, padding: '8px 12px', color: '#ffb15c' }}
                        onClick={() => banUser(selectedUser.id, 'temporary', 7)}
                      >
                        Ban 7 Days
                      </button>
                      <button
                        className="btn-ghost"
                        style={{ fontSize: 12, padding: '8px 12px', color: '#ff8f5c' }}
                        onClick={() => banUser(selectedUser.id, 'temporary', 30)}
                      >
                        Ban 30 Days
                      </button>
                      <button
                        className="btn-ghost"
                        style={{ fontSize: 12, padding: '8px 12px', color: '#ff5a67' }}
                        onClick={() => banUser(selectedUser.id, 'permanent')}
                      >
                        Ban Permanently
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => updateUserAction(selectedUser.id, { is_active: !selectedUser.is_active })}
                    style={{
                      padding: '8px 13px',
                      borderRadius: 99,
                      border: 'none',
                      background: selectedUser.is_active ? 'rgba(255,68,88,0.16)' : 'rgba(34,197,94,0.16)',
                      color: selectedUser.is_active ? '#ff5a67' : '#22c55e',
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    {selectedUser.is_active ? 'Suspend Account' : 'Unsuspend Account'}
                  </button>
                  <button
                    onClick={() => softDeleteUser(selectedUser.id)}
                    style={{
                      padding: '8px 13px',
                      borderRadius: 99,
                      border: 'none',
                      background: '#ef4444',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    Move to Deleted Vault
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {section === 'rooms' && <ExploreRoomsAdmin token={token} onNotify={onNotify} />}
      {section === 'notifications' && <NotificationsAdmin token={token} onNotify={onNotify} />}
      {section === 'gateway' && <PaymentGatewayAdmin token={token} onNotify={onNotify} />}
      {section === 'storage' && <StorageAdmin token={token} onNotify={onNotify} />}
    </div>
  )
}

import React, { useMemo, useState } from 'react'
import { coursesForSchool } from '../courses'

interface CourseSelectProps {
  value: string
  onChange: (value: string) => void
  school?: string | null
  placeholder?: string
  className?: string
}

/**
 * School-aware programme picker. Shows a searchable dropdown of the courses
 * offered at the student's institution, and falls back to a free-text input
 * when the institution is unknown or has no curated list.
 */
export function CourseSelect({ value, onChange, school, placeholder, className }: CourseSelectProps) {
  const options = useMemo(() => coursesForSchool(school), [school])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options.slice(0, 200)
    return options.filter(c => c.toLowerCase().includes(q)).slice(0, 100)
  }, [options, query])

  const inputClass = className || 'modern-input'

  if (options.length === 0) {
    return (
      <input
        className={inputClass}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        className={inputClass}
        value={value}
        placeholder={placeholder || `Select your programme at ${school || 'your school'}`}
        autoComplete="off"
        onFocus={() => {
          setOpen(true)
          setQuery('')
        }}
        onBlur={() => setOpen(false)}
        onChange={e => {
          onChange(e.target.value)
          setQuery(e.target.value)
          setOpen(true)
        }}
      />
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 40,
            maxHeight: 264,
            overflowY: 'auto',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-card)',
            padding: 4,
          }}
        >
          {filtered.length === 0 && (
            <div style={{ padding: '10px 12px', fontSize: 12.5, color: 'var(--text-muted)' }}>
              No programme matches “{query}”.
            </div>
          )}
          {filtered.map(c => (
            <button
              key={c}
              type="button"
              onMouseDown={e => {
                e.preventDefault()
                onChange(c)
                setOpen(false)
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '9px 12px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: 13.5,
                borderRadius: 8,
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-subtle)'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              }}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

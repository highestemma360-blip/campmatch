import { useCallback, useEffect, useRef, useState } from 'react'
import {
  autoShownThisSession,
  canInstallNatively,
  deferInstall,
  detectPlatform,
  installEligible,
  isMobileInstallContext,
  markAutoShown,
  promptNativeInstall,
  subscribeInstall,
  type InstallPlatform,
} from './pwa'

interface UseInstallPromptOptions {
  /** Only prompt once the student is signed in and the app is usable. */
  enabled: boolean
  /** Hold the automatic prompt while a sheet, chat or celebration is open. */
  blocked: boolean
  /** Give the student time to settle in before asking. */
  delayMs?: number
}

export interface InstallPromptController {
  visible: boolean
  platform: InstallPlatform
  canPrompt: boolean
  open: () => void
  close: () => void
  install: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
  /** Seconds remaining before the next automatic reminder (0 if not scheduled). */
  nextReminderSeconds: number
}

const RETRY_MS = 15000
const MAX_RETRIES = 8
const REMINDER_DAYS = 3 // Show install reminder every 3 days

/**
 * Surfaces a calm install invitation on phones. Android uses the browser's
 * native install prompt when Chrome offers it; iOS and browsers without a
 * prompt fall back to clear Add to Home Screen guidance.
 *
 * The prompt shows automatically once per session, then re-appears every
 * REMINDER_DAYS days until the student installs or dismisses it long-term.
 */
export function useInstallPrompt({
  enabled,
  blocked,
  delayMs = 18000,
}: UseInstallPromptOptions): InstallPromptController {
  const [visible, setVisible] = useState(false)
  const [platform, setPlatform] = useState<InstallPlatform>(() => detectPlatform())
  const [canPrompt, setCanPrompt] = useState(() => canInstallNatively())
  const [nextReminderSeconds, setNextReminderSeconds] = useState(0)
  const blockedRef = useRef(blocked)
  blockedRef.current = blocked
  const visibleRef = useRef(visible)
  visibleRef.current = visible

  useEffect(
    () =>
      subscribeInstall(() => {
        setCanPrompt(canInstallNatively())
        setPlatform(detectPlatform())
      }),
    []
  )

  // Auto-show logic with periodic reminders
  useEffect(() => {
    if (!enabled) return
    if (!isMobileInstallContext()) return

    const now = Date.now()
    const deferred = Number(localStorage.getItem('campmatch_install_deferred_until') || '0')
    const alreadyInstalled = localStorage.getItem('campmatch_install_installed') === '1'

    // Don't show if already installed or deferred until future
    if (alreadyInstalled || now < deferred) return
    if (blockedRef.current) return

    // Check last auto-show time; re-show every REMINDER_DAYS days
    const lastShown = Number(localStorage.getItem('campmatch_install_last_shown') || '0')
    const daysSinceLast = (now - lastShown) / 86400000
    if (daysSinceLast < 1) return // At least 1 day between shows

    let retries = 0
    let timer = 0

    const attempt = () => {
      if (!installEligible()) return
      if (blockedRef.current) {
        retries += 1
        if (retries <= MAX_RETRIES) timer = window.setTimeout(attempt, RETRY_MS)
        return
      }
      localStorage.setItem('campmatch_install_last_shown', String(Date.now()))
      setPlatform(detectPlatform())
      setCanPrompt(canInstallNatively())
      setVisible(true)
    }

    timer = window.setTimeout(attempt, delayMs)
    return () => window.clearTimeout(timer)
  }, [enabled, delayMs])

  // Countdown to next reminder
  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      const deferred = Number(localStorage.getItem('campmatch_install_deferred_until') || '0')
      const lastShown = Number(localStorage.getItem('campmatch_install_last_shown') || '0')
      const nextShow = lastShown + REMINDER_DAYS * 86400000
      let seconds = 0
      if (now < deferred) {
        seconds = Math.max(0, Math.floor((deferred - now) / 1000))
      } else if (now < nextShow) {
        seconds = Math.max(0, Math.floor((nextShow - now) / 1000))
      }
      setNextReminderSeconds(seconds)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const open = useCallback(() => {
    setPlatform(detectPlatform())
    setCanPrompt(canInstallNatively())
    setVisible(true)
  }, [])

  const close = useCallback(() => {
    setVisible(false)
    deferInstall() // Defer for default period when manually closed
  }, [])

  const install = useCallback(async () => {
    const outcome = await promptNativeInstall()
    setCanPrompt(canInstallNatively())
    if (outcome === 'accepted') {
      localStorage.setItem('campmatch_install_installed', '1')
      deferInstall(180)
      setVisible(false)
    } else if (outcome === 'dismissed') {
      localStorage.setItem('campmatch_install_last_shown', String(Date.now()))
      deferInstall()
      setVisible(false)
    }
    return outcome
  }, [])

  return { visible, platform, canPrompt, open, close, install, nextReminderSeconds }
}

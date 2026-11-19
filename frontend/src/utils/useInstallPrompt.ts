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
}

const RETRY_MS = 15000
const MAX_RETRIES = 8

/**
 * Surfaces a single, calm install invitation per session on phones. Android
 * uses the native install prompt when Chrome offers it; iOS and browsers
 * without a prompt fall back to clear Add to Home Screen guidance.
 */
export function useInstallPrompt({
  enabled,
  blocked,
  delayMs = 18000,
}: UseInstallPromptOptions): InstallPromptController {
  const [visible, setVisible] = useState(false)
  const [platform, setPlatform] = useState<InstallPlatform>(() => detectPlatform())
  const [canPrompt, setCanPrompt] = useState(() => canInstallNatively())
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

  useEffect(() => {
    if (!enabled) return
    if (!isMobileInstallContext()) return
    if (!installEligible() || autoShownThisSession()) return

    let retries = 0
    let timer = 0

    const attempt = () => {
      if (!installEligible()) return
      if (blockedRef.current) {
        retries += 1
        if (retries <= MAX_RETRIES) timer = window.setTimeout(attempt, RETRY_MS)
        return
      }
      markAutoShown()
      setPlatform(detectPlatform())
      setCanPrompt(canInstallNatively())
      setVisible(true)
    }

    timer = window.setTimeout(attempt, delayMs)
    return () => window.clearTimeout(timer)
  }, [enabled, delayMs])

  const open = useCallback(() => {
    setPlatform(detectPlatform())
    setCanPrompt(canInstallNatively())
    setVisible(true)
  }, [])

  const close = useCallback(() => {
    setVisible(false)
    // Respect the dismissal for both automatic invitations and the settings
    // entry. Students can still install from Settings whenever they want.
    deferInstall()
  }, [])

  const install = useCallback(async () => {
    const outcome = await promptNativeInstall()
    setCanPrompt(canInstallNatively())
    if (outcome === 'accepted') {
      deferInstall(180)
      setVisible(false)
    } else if (outcome === 'dismissed') {
      deferInstall()
      setVisible(false)
    }
    return outcome
  }, [])

  return { visible, platform, canPrompt, open, close, install }
}

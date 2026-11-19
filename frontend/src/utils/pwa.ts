/**
 * PWA install helpers.
 *
 * The `beforeinstallprompt` event can fire before React mounts, so this module
 * attaches its listeners at import time (see main.tsx) and keeps the deferred
 * event for the install UI.
 */

export type InstallPlatform = 'ios' | 'android' | 'other'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const DEFER_KEY = 'campmatch_install_deferred_until'
const AUTO_SHOWN_KEY = 'campmatch_install_auto_shown'
const DEFER_DAYS = 7

let deferredPrompt: BeforeInstallPromptEvent | null = null
let installedThisSession = false
let installJustHappened = false
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach(fn => {
    try {
      fn()
    } catch {
      /* A listener must never break install state updates. */
    }
  })
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', event => {
    // Keep the event so the app can offer a branded prompt at a calm moment.
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    emit()
  })

  window.addEventListener('appinstalled', () => {
    installedThisSession = true
    installJustHappened = true
    deferredPrompt = null
    // Long cooldown: if the app is later uninstalled, the prompt can return
    // eventually instead of being suppressed forever.
    deferInstall(180)
    emit()
  })

  const standaloneQuery = window.matchMedia?.('(display-mode: standalone)')
  standaloneQuery?.addEventListener?.('change', emit)
}

export function subscribeInstall(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const modes = ['standalone', 'fullscreen', 'minimal-ui']
  if (modes.some(mode => window.matchMedia?.(`(display-mode: ${mode})`).matches)) return true
  return (navigator as unknown as { standalone?: boolean }).standalone === true
}

/** True once, right after the app is installed to the home screen. */
export function wasJustInstalled(): boolean {
  const just = installJustHappened
  installJustHappened = false
  return just
}

export function detectPlatform(): InstallPlatform {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent || ''
  if (/Android/i.test(ua)) return 'android'
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  if (/iPad|iPhone|iPod/i.test(ua) || iPadOS) return 'ios'
  return 'other'
}

export function isIOSNonSafari(): boolean {
  if (detectPlatform() !== 'ios') return false
  // CriOS, FxiOS, EdgiOS, OPiOS, DuckDuckGo and in-app webviews cannot add
  // web apps to the Home Screen — only Safari can.
  return /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA|FBAN|FBAV|Instagram|Line\//i.test(
    navigator.userAgent || ''
  )
}

/** Phones and tablets only; desktop browsers keep the settings entry. */
export function isMobileInstallContext(): boolean {
  if (typeof window === 'undefined') return false
  if (detectPlatform() !== 'other') return true
  // Some touch laptops report a coarse pointer at narrow widths, so the
  // viewport query alone is not trustworthy. Chromium exposes a real mobile
  // hint; everything else stays a desktop context.
  const uaData = (navigator as unknown as { userAgentData?: { mobile?: boolean } }).userAgentData
  return uaData?.mobile === true
}

export function canInstallNatively(): boolean {
  return deferredPrompt !== null
}

export function installDeferredUntil(): number {
  try {
    const raw = Number(localStorage.getItem(DEFER_KEY) || '0')
    return Number.isFinite(raw) ? raw : 0
  } catch {
    return 0
  }
}

export function deferInstall(days = DEFER_DAYS) {
  try {
    localStorage.setItem(DEFER_KEY, String(Date.now() + days * 86400000))
  } catch {
    /* Storage can be unavailable in private modes. */
  }
}

export function installEligible(): boolean {
  return !isStandalone() && !installedThisSession && Date.now() >= installDeferredUntil()
}

export function autoShownThisSession(): boolean {
  try {
    return sessionStorage.getItem(AUTO_SHOWN_KEY) === '1'
  } catch {
    return false
  }
}

export function markAutoShown() {
  try {
    sessionStorage.setItem(AUTO_SHOWN_KEY, '1')
  } catch {
    /* best effort */
  }
}

export async function promptNativeInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const event = deferredPrompt
  if (!event) return 'unavailable'
  // The event is single-use; consume it before prompting.
  deferredPrompt = null
  emit()
  try {
    await event.prompt()
    const choice = await event.userChoice
    return choice?.outcome === 'accepted' ? 'accepted' : 'dismissed'
  } catch {
    return 'unavailable'
  }
}

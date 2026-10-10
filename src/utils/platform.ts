import { Capacitor } from '@capacitor/core';

/**
 * Returns true if running natively on an Android device via Capacitor.
 */
export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

/**
 * Returns true if running natively on iOS via Capacitor.
 */
export function isIOS(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

/**
 * Returns true if running in a native mobile wrapper (Android / iOS).
 */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Returns true if running on a mobile device (Android, iOS, or phone/tablet browser).
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  if (isNative() || isAndroid() || isIOS()) return true;
  if (typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    return true;
  }
  return window.innerWidth < 768;
}

/**
 * Returns true if running inside Electron desktop shell.
 * Guaranteed to return false on Android and native mobile.
 */
export function isElectron(): boolean {
  if (isNative() || isAndroid()) {
    return false;
  }
  if (typeof window === 'undefined') {
    return false;
  }
  const win = window as unknown as {
    electron?: unknown;
    process?: { versions?: { electron?: string }; type?: string };
  };
  return Boolean(
    win.electron ||
    win.process?.versions?.electron ||
    win.process?.type === 'renderer' ||
    (typeof navigator !== 'undefined' &&
      navigator.userAgent &&
      navigator.userAgent.toLowerCase().includes(' electron/'))
  );
}

/**
 * Safely executes a function only if running in Electron desktop.
 * Never executes on Android or mobile platforms.
 */
export function runElectronOnly<T>(action: () => T, fallback?: () => T): T | undefined {
  if (isAndroid() || isNative() || !isElectron()) {
    return fallback ? fallback() : undefined;
  }
  try {
    return action();
  } catch (err) {
    console.warn('[Platform] Electron-only action skipped:', err);
    return fallback ? fallback() : undefined;
  }
}

/**
 * Returns current platform name.
 */
export function getAppPlatform(): 'android' | 'ios' | 'electron' | 'web' {
  if (isAndroid()) return 'android';
  if (isIOS()) return 'ios';
  if (isElectron()) return 'electron';
  return 'web';
}

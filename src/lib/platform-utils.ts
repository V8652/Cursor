
/**
 * Check if the current device is running Android
 */
export function isAndroidDevice(): boolean {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
}

/**
 * Check if the app is running in a Capacitor environment
 */
export function isCapacitorApp(): boolean {
  return typeof (window as any)?.Capacitor !== 'undefined' && 
         typeof (window as any).Capacitor.isNativePlatform === 'function' && 
         (window as any).Capacitor.isNativePlatform();
}

/**
 * Get Android API level from user agent
 */
export function getAndroidApiLevel(): number {
  try {
    const match = navigator.userAgent.match(/Android\s([0-9]+)/);
    return match ? parseInt(match[1], 10) : 0;
  } catch (error) {
    console.error('Error determining Android API level:', error);
    return 0;
  }
}

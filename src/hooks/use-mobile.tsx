
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

/**
 * Reliably detects if the application is running in a Capacitor native environment.
 * This function ensures type safety with optional chaining.
 * @returns boolean True if running in a Capacitor native app, false otherwise
 */
export function isNativeApp(): boolean {
  try {
    // Check for Capacitor object first
    if (typeof window === 'undefined' || !window.Capacitor) {
      return false;
    }
    
    // Check if we have the isNativePlatform function
    if (typeof window.Capacitor.isNativePlatform === 'function') {
      return !!window.Capacitor.isNativePlatform();
    }
    
    // Fallback to platform property if isNativePlatform isn't available
    if (window.Capacitor.platform && window.Capacitor.platform !== 'web') {
      return true;
    }
    
    // Check for isNative property (which might be used in some versions)
    if (window.Capacitor.isNative === true) {
      return true;
    }
    
    // Final fallback - check for Capacitor plugins
    if (window.Capacitor.Plugins && Object.keys(window.Capacitor.Plugins).length > 0) {
      // Having Capacitor plugins typically means we're on a native platform
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error detecting platform:", error);
    return false; // Default to false on error
  }
}

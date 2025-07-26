import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatCurrency as formatCurrencyFromUtil } from "./utils/formatCurrency"
import { toast } from 'sonner'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'INR'): string {
  return formatCurrencyFromUtil(amount, currency);
}

// Enhanced function to detect if device is running Android
export function isAndroidDevice(): boolean {
  if (typeof navigator !== 'undefined' && typeof window !== 'undefined') {
    const isAndroid = /Android/i.test(navigator.userAgent);
    console.log('isAndroidDevice check:', isAndroid, 'user agent:', navigator.userAgent);
    return isAndroid;
  }
  return false;
}

// Request storage permissions for Android (web fallback only)
export async function requestStoragePermissions(): Promise<boolean> {
  // On web, permissions are managed by the browser. Assume granted.
  return true;
}

// Enhanced function for Android file download with improved error handling
export async function triggerDownload(url: string, filename: string): Promise<{ success: boolean, path?: string }> {
  console.log(`Triggering download for ${filename}, is Android:`, isAndroidDevice());

  // For Android, first check permissions (web fallback)
  if (isAndroidDevice()) {
    const hasPermissions = await requestStoragePermissions();
    if (!hasPermissions) {
      toast('Permission Denied', { description: 'Storage permission is required to save files.' });
      return { success: false };
    }
  }

  // Try standard HTML5 download as fallback
  try {
    console.log('Using standard download approach');
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    toast('Downloading File', { description: `Saving ${filename} to your device` });
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
    return { success: true };
  } catch (standardError) {
    console.error('Standard download approach failed:', standardError);
    toast('Download Failed', { description: 'Could not download the file. Please try again.' });
    throw standardError;
  }
}

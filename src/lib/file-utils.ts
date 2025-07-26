/**
 * Check if we have storage permissions and request them if needed
 * @returns Promise resolving to boolean indicating if permission is granted
 */
export const checkAndRequestStoragePermissions = async (): Promise<boolean> => {
  // Always return true for web platforms
  return true;
};

/**
 * Function to pick a file using the native file picker
 * @param mimeTypes Array of allowed MIME types or file extensions
 * @returns Promise resolving to the selected File object or null if canceled
 */
export const pickFile = async (mimeTypes: string[] = ['*/*']): Promise<File | null> => {
  try {
    // For web platforms, use the standard file input
    console.log('Using web file picker');
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = mimeTypes.join(',');
      input.onchange = () => {
        if (input.files && input.files.length > 0) {
          resolve(input.files[0]);
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  } catch (error) {
    console.error('Error picking file:', error);
    throw error;
  }
};

/**
 * Function to download a file (used by csv-utils)
 */
export const downloadFile = async (
  content: string | Blob, 
  filename: string, 
  mimeType: string = 'text/plain'
): Promise<string> => {
  try {
    console.log(`Downloading file: ${filename}`);
    // Create a blob if content is a string
    const blob = typeof content === 'string' 
      ? new Blob([content], { type: mimeType })
      : content;
    // For web platform
    console.log('Using browser download');
    // Create a download URL
    const url = URL.createObjectURL(blob);
    // Create and trigger a download link
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    return filename;
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};

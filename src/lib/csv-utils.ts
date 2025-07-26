import Papa from 'papaparse';
import { downloadFile } from './file-utils';
import { toast } from 'sonner';
import { isAndroidDevice, isCapacitorApp } from '@/lib/platform-utils';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import { Share } from '@capacitor/share';

/**
 * Convert data to CSV and trigger download
 */
export function exportDataToCSV<T>(data: T[], filename: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      if (data.length === 0) {
        toast.error('No Data to Export');
        reject(new Error('No data to export'));
        return;
      }
      
      // Convert data to CSV using PapaParse
      console.log(`Converting ${data.length} items to CSV format`);
      const csv = Papa.unparse(data, {
        header: true,
        skipEmptyLines: true
      });
      
      console.log(`CSV generation complete, size: ${csv.length} bytes`);
      
      // Trigger download and resolve with filename on success
      downloadFile(csv, filename, 'text/csv')
        .then(() => {
          console.log(`File download successful: ${filename}`);
          resolve(filename);
        })
        .catch(error => {
          console.error('Error during file download:', error);
          reject(error);
        });
    } catch (error) {
      console.error('Error exporting data to CSV:', error);
      reject(error);
    }
  });
}

/**
 * Parse CSV data from a file with enhanced error handling
 */
export async function parseCSVFile<T>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    console.log(`Parsing CSV file: ${file.name}, size: ${file.size} bytes`);
    
    // For very small files, they might be empty or corrupted
    if (file.size < 10) {
      reject(new Error('The file is too small or empty'));
      return;
    }
    
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log('CSV parsing complete, error count:', results.errors.length);
        console.log('Data rows:', results.data.length);
        
        if (results.errors && results.errors.length > 0) {
          console.error('CSV parsing errors:', results.errors);
          
          // If we have some data despite errors, we might want to continue
          if (results.data && results.data.length > 0) {
            console.log(`Continuing with ${results.data.length} rows despite ${results.errors.length} errors`);
            toast('Warning', { description: `${results.errors.length} errors found during parsing, but some data was recovered.` });
            resolve(results.data as T[]);
          } else {
            reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
          }
        } else if (!results.data || results.data.length === 0) {
          console.error('CSV file is empty or has invalid format');
          reject(new Error('CSV file is empty or has invalid format'));
        } else {
          console.log(`Successfully parsed ${results.data.length} rows from CSV`);
          resolve(results.data as T[]);
        }
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        reject(error);
      }
    });
  });
}

/**
 * Convert blob to base64 string safely
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        const base64data = reader.result as string;
        // Extract just the base64 part without the data URL prefix
        const base64Content = base64data.split(',')[1];
        resolve(base64Content);
      } catch (error) {
        console.error('Error processing base64 data:', error);
        reject(error);
      }
    };
    reader.onerror = (event) => {
      console.error('FileReader error:', event);
      reject(new Error('Failed to convert blob to base64'));
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Helper to check if file is likely CSV
 */
export function isLikelyCSV(file: File): boolean {
  return file.name.toLowerCase().endsWith('.csv') || 
         file.type === 'text/csv' || 
         file.type === 'application/csv' ||
         file.type === 'application/vnd.ms-excel';
}

/**
 * Force CSV file download with proper handling for all platforms
 */
export async function forceDownloadCSV(
  csvContent: string,
  filename: string,
  shareText?: string
): Promise<string> {
  try {
    // Ensure filename has .csv extension
    if (!filename.toLowerCase().endsWith('.csv')) {
      filename = `${filename}.csv`;
    }

    // Android (Capacitor) handling
    if (isAndroidDevice() && isCapacitorApp()) {
      try {
        // Write CSV file
        await Filesystem.writeFile({
          path: filename,
          data: csvContent,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
          recursive: true,
        });

        const fileInfo = await Filesystem.getUri({
          path: filename,
          directory: Directory.Documents
        });

        // Share CSV file
        await Share.share({
          title: filename,
          text: shareText || `${filename} in CSV format`,
          files: [fileInfo.uri],
          dialogTitle: `Share ${filename}`
        });

        // Workaround: Open the file with the correct MIME type to help Android recognize it as CSV
        try {
          await FileOpener.open({
            filePath: fileInfo.uri,
            contentType: 'text/csv',
            openWithDefault: false
          });
        } catch (openError) {
          // Ignore if open fails, as sharing already happened
        }

        toast('Export Complete', { description: 'CSV file saved and share dialog opened', duration: 5000 });
      } catch (shareError) {
        console.warn('Could not share file, trying to open:', shareError);
        try {
          await FileOpener.open({
            filePath: filename,
            contentType: 'text/csv',
            openWithDefault: true
          });
        } catch (openError) {
          console.error('Could not open file:', openError);
          throw openError;
        }
      }
    } else {
      // Web/desktop handling
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Show success message
      toast('Export Complete', { description: 'CSV file downloaded successfully', duration: 3000 });
    }
    return filename;
  } catch (error) {
    console.error('Error downloading CSV:', error);
    toast.error('Export Failed', { description: `Failed to export CSV: ${(error as Error).message || 'Unknown error'}` });
    throw error;
  }
}

import { triggerServerAutoSync } from './api';
import { getGoogleAccessToken } from './google-auth';

export interface AutoSyncParams {
  type: 'inventory' | 'po' | 'preloved';
  action: 'add' | 'edit' | 'delete';
  itemName: string;
  onToast?: (text: string, type: 'success' | 'error' | 'info') => void;
}

let isAutoSyncing = false;

/**
 * Automatically triggers synchronization with Google Spreadsheet & Google Drive
 * whenever data is inputted (added, edited, or deleted).
 */
export async function triggerLiveAutoSync({
  type,
  action,
  itemName,
  onToast
}: AutoSyncParams): Promise<void> {
  const typeLabel = type === 'inventory' ? 'Inventaris' : type === 'po' ? 'Purchase Order' : 'Preloved';
  const actionLabel = action === 'add' ? 'menambahkan' : action === 'edit' ? 'memperbarui' : 'menghapus';
  const reason = `Auto-sync setelah ${actionLabel} ${typeLabel}: ${itemName}`;

  try {
    isAutoSyncing = true;
    const token = getGoogleAccessToken();

    // Call server to execute live background sync
    const res = await triggerServerAutoSync({
      accessToken: token || undefined,
      reason
    });

    if (res.success && onToast) {
      onToast(`[Auto-Sync] Data ${typeLabel} "${itemName}" otomatis tersinkron ke Google Spreadsheet!`, 'info');
    }
  } catch (err: any) {
    console.warn('Live auto-sync error:', err);
  } finally {
    isAutoSyncing = false;
  }
}

export function getIsAutoSyncing(): boolean {
  return isAutoSyncing;
}

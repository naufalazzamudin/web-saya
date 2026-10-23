export type Category = 'PC ITEMS' | 'NETWORK ITEMS' | 'CCTV & TV ITEMS';

export const CATEGORIES: Category[] = [
  'PC ITEMS',
  'NETWORK ITEMS',
  'CCTV & TV ITEMS'
];

export interface InventoryItem {
  id: string;
  itemName: string;
  photoUrl: string;
  category: Category;
  dateRepaired: string; // YYYY-MM-DD (Tanggal Rekap)
  quantity?: number; // Jumlah unit (opsional, default 1)
  serialNumber?: string | null;
  remark?: string | null; // Kolom "remark" (ex Front Office, ex Room)
  createdAt: string; // ISO 8601
  createdBy: string;
  updatedAt: string; // ISO 8601
  updatedBy: string;
}

export interface PrelovedItem {
  id: string;
  itemName: string;
  photoUrl: string;
  category: Category;
  dateRepaired: string; // YYYY-MM-DD (Tanggal dibereskan)
  quantity?: number; // Jumlah unit (opsional, default 1)
  serialNumber?: string | null;
  remark?: string | null; // Kolom "remark" (ex Front Office, ex Room)
  createdAt: string; // ISO 8601
  createdBy: string;
  updatedAt: string; // ISO 8601
  updatedBy: string;
}

export type POStatus = 'BELUM DATANG' | 'SUDAH DATANG';

export interface PurchaseOrderItem {
  id: string;
  itemName: string;
  photoUrl: string;
  dateOrder: string; // YYYY-MM-DD
  dateArrival?: string | null; // YYYY-MM-DD
  quantity: number; // Jumlah unit
  forUse: string; // Peruntukan / For use
  remarks?: string | null; // Catatan
  status: POStatus; // 'BELUM DATANG' | 'SUDAH DATANG'
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface UserAccount {
  id: string;
  username: string;
  role: 'IT MANAGER' | 'IT ASSIST' | 'IT TRAINEE' | string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityRecord {
  id: string;
  targetId?: string;
  inventoryId?: string;
  itemName: string;
  category?: string;
  type?: 'INVENTORY' | 'PURCHASE ORDER' | 'PRELOVED';
  action: 'Added' | 'Edited' | 'Deleted';
  username: string;
  timestamp: string;
}

export interface InventoryStats {
  total: number;
  pcCount: number;
  networkCount: number;
  cctvCount: number;
  addedThisMonth: number;
}

export interface PrelovedStats {
  total: number;
  pcCount: number;
  networkCount: number;
  cctvCount: number;
  addedThisMonth: number;
}

export interface POStats {
  total: number;
  pendingCount: number; // Menunggu Datang / Belum Datang
  arrivedCount: number; // Sudah Datang
  orderedThisMonth: number;
}

export interface FilterOptions {
  search?: string;
  category?: string;
  month?: string; // e.g. "2026-08" or "AUGUST 2026" or "8"
  year?: number;
  user?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'name-asc' | 'name-desc' | 'date-newest' | 'date-oldest' | 'updated-newest' | 'category' | 'user';
}

export type PrelovedFilterOptions = FilterOptions;

export interface POFilterOptions {
  search?: string;
  status?: 'ALL' | 'BELUM DATANG' | 'SUDAH DATANG';
  month?: string;
  user?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'name-asc' | 'name-desc' | 'order-newest' | 'order-oldest' | 'arrival-newest' | 'updated-newest' | 'quantity-desc';
}

export type RecentItem = {
  type: 'INVENTORY' | 'PURCHASE ORDER' | 'PRELOVED';
  item: InventoryItem | PurchaseOrderItem | PrelovedItem;
};

export interface GoogleAccountInfo {
  email: string;
  name: string;
  photoUrl?: string;
  connectedAt: string;
  connectedBy: string;
}

export interface GoogleIntegrationSettings {
  spreadsheetUrl: string;
  spreadsheetId: string;
  driveFolderUrl: string;
  driveFolderId: string;
  connectedAccount: GoogleAccountInfo | null;
  lastSyncedAt?: string | null;
  lastSyncStatus?: 'idle' | 'success' | 'failed' | 'in_progress' | null;
  lastSyncMessage?: string | null;
  syncedInventoryCount?: number;
  syncedPOCount?: number;
  syncedPrelovedCount?: number;
  autoSyncEnabled?: boolean;
}


import type { InventoryItem, PurchaseOrderItem, PrelovedItem } from './types';

/**
 * Extracts Google Spreadsheet ID from various Google Sheet URL patterns.
 * e.g.:
 * - https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing
 * - https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
 * - https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
 * - 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms (raw ID)
 */
export function extractGoogleSpreadsheetId(urlOrId: string | null | undefined): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;

  // Check URL pattern
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  // If it's already an ID (alphanumeric, dashes, underscores, length >= 20)
  if (/^[a-zA-Z0-9-_]{20,70}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Extracts Google Drive Folder ID from various Google Drive folder URL patterns.
 * e.g.:
 * - https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j_KLMNOPQRSTUV
 * - https://drive.google.com/drive/u/0/folders/1a2b3c4d5e6f7g8h9i0j_KLMNOPQRSTUV?usp=sharing
 * - 1a2b3c4d5e6f7g8h9i0j_KLMNOPQRSTUV (raw ID)
 */
export function extractGoogleDriveFolderId(urlOrId: string | null | undefined): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;

  // Check URL pattern
  const urlMatch = trimmed.match(/\/folders\/([a-zA-Z0-9-_]+)/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  // If it's already an ID (alphanumeric, dashes, underscores, length >= 20)
  if (/^[a-zA-Z0-9-_]{15,70}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export interface ValidationResult {
  valid: boolean;
  spreadsheetId: string | null;
  driveFolderId: string | null;
  errors: {
    spreadsheetUrl?: string;
    driveFolderUrl?: string;
  };
}

export function validateGoogleConfig(spreadsheetUrl: string, driveFolderUrl: string): ValidationResult {
  const spreadsheetId = extractGoogleSpreadsheetId(spreadsheetUrl);
  const driveFolderId = extractGoogleDriveFolderId(driveFolderUrl);

  const errors: { spreadsheetUrl?: string; driveFolderUrl?: string } = {};

  if (!spreadsheetUrl || !spreadsheetUrl.trim()) {
    errors.spreadsheetUrl = 'URL Google Spreadsheet wajib diisi.';
  } else if (!spreadsheetId) {
    errors.spreadsheetUrl = 'Format URL Google Spreadsheet tidak valid. Contoh: https://docs.google.com/spreadsheets/d/...';
  }

  if (!driveFolderUrl || !driveFolderUrl.trim()) {
    errors.driveFolderUrl = 'URL Folder Google Drive wajib diisi.';
  } else if (!driveFolderId) {
    errors.driveFolderUrl = 'Format URL Folder Google Drive tidak valid. Contoh: https://drive.google.com/drive/folders/...';
  }

  return {
    valid: Object.keys(errors).length === 0,
    spreadsheetId,
    driveFolderId,
    errors
  };
}

/**
 * Standard headers for Google Spreadsheet Inventory Table
 */
export const SPREADSHEET_HEADERS = [
  'NO',
  'ID BARANG',
  'FOTO BARANG (DRIVE URL)',
  'NAMA BARANG',
  'KATEGORI',
  'TANGGAL REKAP',
  'JUMLAH UNIT',
  'SERIAL NUMBER',
  'REMARK / KETERANGAN',
  'DITAMBAHKAN OLEH',
  'DIUBAH OLEH',
  'TERAKHIR DIUPDATE'
];

/**
 * Convert an inventory item into a row for the Google Spreadsheet
 */
export function formatInventoryRowForSheet(item: InventoryItem, index: number): (string | number)[] {
  // If photo is already a Google Drive URL or other URL, include it directly
  const photoDriveUrl = item.photoUrl || '-';

  return [
    index + 1,
    item.id,
    photoDriveUrl,
    item.itemName,
    item.category,
    item.dateRepaired,
    item.quantity ?? 1,
    item.serialNumber || '-',
    item.remark || '-',
    item.createdBy,
    item.updatedBy,
    item.updatedAt
  ];
}

/**
 * Format all inventory items for Google Sheets batch update values
 */
export function buildSpreadsheetValues(items: InventoryItem[]): (string | number)[][] {
  const rows: (string | number)[][] = [SPREADSHEET_HEADERS];
  items.forEach((item, index) => {
    rows.push(formatInventoryRowForSheet(item, index));
  });
  return rows;
}

/**
 * Standard headers for Google Spreadsheet Purchase Order Table
 */
export const PO_SPREADSHEET_HEADERS = [
  'NO',
  'ID PO',
  'FOTO BARANG (DRIVE URL)',
  'NAMA BARANG',
  'STATUS',
  'TANGGAL ORDER',
  'TANGGAL KEDATANGAN',
  'JUMLAH UNIT',
  'PERUNTUKAN / FOR USE',
  'CATATAN / REMARKS',
  'DIBUAT OLEH',
  'DIUBAH OLEH',
  'TERAKHIR DIUPDATE'
];

/**
 * Convert a Purchase Order item into a row for the Google Spreadsheet
 */
export function formatPurchaseOrderRowForSheet(po: PurchaseOrderItem, index: number): (string | number)[] {
  const photoDriveUrl = po.photoUrl || '-';

  return [
    index + 1,
    po.id,
    photoDriveUrl,
    po.itemName,
    po.status,
    po.dateOrder,
    po.dateArrival || '-',
    po.quantity,
    po.forUse,
    po.remarks || '-',
    po.createdBy,
    po.updatedBy,
    po.updatedAt
  ];
}

/**
 * Format all Purchase Orders for Google Sheets batch update values
 */
export function buildPOSpreadsheetValues(items: PurchaseOrderItem[]): (string | number)[][] {
  const rows: (string | number)[][] = [PO_SPREADSHEET_HEADERS];
  items.forEach((po, index) => {
    rows.push(formatPurchaseOrderRowForSheet(po, index));
  });
  return rows;
}

/**
 * Standard headers for Google Spreadsheet Preloved Table
 */
export const PRELOVED_SPREADSHEET_HEADERS = [
  'NO',
  'ID PRELOVED',
  'FOTO BARANG (DRIVE URL)',
  'NAMA BARANG',
  'KATEGORI',
  'TANGGAL DIBERESKAN',
  'JUMLAH UNIT',
  'SERIAL NUMBER',
  'REMARK / KETERANGAN',
  'DITAMBAHKAN OLEH',
  'DIUBAH OLEH',
  'TERAKHIR DIUPDATE'
];

/**
 * Convert a Preloved item into a row for the Google Spreadsheet
 */
export function formatPrelovedRowForSheet(item: PrelovedItem, index: number): (string | number)[] {
  const photoDriveUrl = item.photoUrl || '-';

  return [
    index + 1,
    item.id,
    photoDriveUrl,
    item.itemName,
    item.category,
    item.dateRepaired,
    item.quantity ?? 1,
    item.serialNumber || '-',
    item.remark || '-',
    item.createdBy,
    item.updatedBy,
    item.updatedAt
  ];
}

/**
 * Format all Preloved items for Google Sheets batch update values
 */
export function buildPrelovedSpreadsheetValues(items: PrelovedItem[]): (string | number)[][] {
  const rows: (string | number)[][] = [PRELOVED_SPREADSHEET_HEADERS];
  items.forEach((item, index) => {
    rows.push(formatPrelovedRowForSheet(item, index));
  });
  return rows;
}



import fs from 'fs';
import path from 'path';
import type { InventoryItem, PurchaseOrderItem, Category, POStatus } from './types';

export interface ServerSheetConfig {
  spreadsheetUrl?: string;
  spreadsheetId?: string;
  spreadsheetTitle?: string;
  isEnabled: boolean;
  lastSyncTime?: string | null;
  syncStatus?: 'synced' | 'syncing' | 'pending' | 'failed';
  syncError?: string | null;
  connectedGoogleEmail?: string | null;
  connectedGoogleName?: string | null;
  connectedGooglePhoto?: string | null;
  googleAccessToken?: string | null;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

export const REQUIRED_SPREADSHEET_NAME = 'DATABASE WEB IT';

export const INVENTORY_HEADERS = [
  'ID',
  'Nama Barang',
  'Foto',
  'Kategori',
  'Tanggal Dibereskan',
  'Serial Number',
  'Remark',
  'Ditambahkan Oleh',
  'Terakhir Diedit Oleh',
  'Dibuat Pada',
  'Terakhir Diperbarui'
];

export const PO_HEADERS = [
  'ID',
  'Nama Barang',
  'Foto',
  'Tanggal Order',
  'Tanggal Datang',
  'Jumlah Unit',
  'For Use',
  'Status',
  'Remarks',
  'Ditambahkan Oleh',
  'Terakhir Diedit Oleh',
  'Dibuat Pada',
  'Terakhir Diperbarui'
];

/**
 * Extract spreadsheet ID from link or raw ID
 */
export function extractSpreadsheetId(urlOrId: string | undefined | null): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const trimmed = urlOrId.trim();

  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }

  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Format photo URL as Google Sheets =IMAGE formula so it renders as photo (PNG/JPG)
 */
export function formatPhotoFormula(photoUrl: string | undefined | null): string {
  if (!photoUrl || !photoUrl.trim()) return '';
  const trimmed = photoUrl.trim();

  if (trimmed.startsWith('=IMAGE(') || trimmed.startsWith('=image(')) {
    return trimmed;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return `=IMAGE("${trimmed}", 1)`;
  }

  return trimmed;
}

/**
 * Parse cell value from Google Sheets to retrieve image URL from =IMAGE formula
 */
export function parsePhotoFormula(cellValue: any): string {
  if (!cellValue) return '';
  const str = String(cellValue).trim();

  const match = str.match(/=IMAGE\(\s*["']([^"']+)["']/i);
  if (match && match[1]) {
    return match[1];
  }

  return str;
}

/**
 * Upload a local image or base64 to Google Drive from the server and make it viewable
 */
export async function uploadImageToDriveServer(
  accessToken: string,
  photoSource: string,
  itemName: string,
  uploadsDir?: string
): Promise<string> {
  if (!photoSource || !photoSource.trim()) return '';
  const trimmed = photoSource.trim();

  // If already a Google Drive direct image or external image
  if (
    trimmed.startsWith('https://lh3.googleusercontent.com/') ||
    trimmed.startsWith('https://drive.google.com/')
  ) {
    return trimmed;
  }

  if (trimmed.startsWith('https://') && !trimmed.includes('localhost') && !trimmed.includes('127.0.0.1')) {
    return trimmed;
  }

  try {
    let mimeType = 'image/jpeg';
    let buffer: Buffer | null = null;

    if (trimmed.startsWith('/uploads/') && uploadsDir) {
      const diskPath = path.join(uploadsDir, path.basename(trimmed));
      if (fs.existsSync(diskPath)) {
        buffer = fs.readFileSync(diskPath);
        mimeType = diskPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
      }
    } else if (trimmed.startsWith('data:image/')) {
      const parts = trimmed.split(',');
      const matchMime = parts[0].match(/:(.*?);/);
      if (matchMime) mimeType = matchMime[1];
      buffer = Buffer.from(parts[1] || '', 'base64');
    }

    if (buffer && buffer.length > 0) {
      const cleanName = itemName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
      const ext = mimeType.includes('png') ? 'png' : 'jpg';
      const filename = `${cleanName}_${Date.now()}.${ext}`;

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const metadata = {
        name: filename,
        mimeType
      };

      const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
      const mediaHeader = `${delimiter}Content-Type: ${mimeType}\r\n\r\n`;

      const p1 = Buffer.from(metadataPart, 'utf-8');
      const p2 = Buffer.from(mediaHeader, 'utf-8');
      const p3 = Buffer.from(closeDelimiter, 'utf-8');

      const fullPayload = Buffer.concat([p1, p2, buffer, p3]);

      const driveRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body: fullPayload
        }
      );

      if (driveRes.ok) {
        const driveJson = await driveRes.json();
        const fileId = driveJson.id;

        // Set permission to anyone with link can view
        await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            role: 'reader',
            type: 'anyone'
          })
        }).catch(err => console.warn('Drive permission error:', err));

        return `https://lh3.googleusercontent.com/d/${fileId}`;
      }
    }
  } catch (err) {
    console.warn('Server Drive upload error:', err);
  }

  return trimmed;
}

/**
 * Fetch spreadsheet metadata from Google Sheets API
 */
export async function getSpreadsheetDetailsServer(
  spreadsheetId: string,
  accessToken: string
): Promise<{ title: string; sheets: { id: number; title: string; index: number }[] }> {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok) {
    let errMsg = 'Gagal mengakses Google Spreadsheet';
    try {
      const errJson = await res.json();
      errMsg = errJson.error?.message || errMsg;
    } catch {
      errMsg = `${res.status} ${res.statusText}`;
    }
    throw new Error(errMsg);
  }

  const data = await res.json();
  const title: string = data.properties?.title || '';
  const sheets = (data.sheets || []).map((s: any) => ({
    id: s.properties?.sheetId,
    title: s.properties?.title || '',
    index: s.properties?.index ?? 0
  }));

  return { title, sheets };
}

/**
 * Resolve sheet names for Inventory and PO
 */
export function resolveServerSheetNames(sheets: { id?: number; title: string; index: number }[]): {
  invSheet: string;
  poSheet: string;
} {
  const invSheetObj = sheets.find(
    s => s.title.toLowerCase().includes('inventory') || s.index === 0
  );
  const poSheetObj = sheets.find(
    s => s.title.toLowerCase().includes('purchase') || s.title.toLowerCase().includes('po') || s.index === 1
  );

  return {
    invSheet: invSheetObj?.title || sheets[0]?.title || 'Inventory',
    poSheet: poSheetObj?.title || sheets[1]?.title || 'Purchase Order'
  };
}

/**
 * Upsert single Inventory item to Google Sheets by unique ID
 */
export async function upsertInventoryItemServer(
  spreadsheetId: string,
  accessToken: string,
  item: InventoryItem,
  sheetName: string = 'Inventory',
  uploadsDir?: string
): Promise<void> {
  const drivePhotoUrl = await uploadImageToDriveServer(accessToken, item.photoUrl, item.itemName, uploadsDir);
  const photoCell = formatPhotoFormula(drivePhotoUrl);

  const range = encodeURIComponent(`'${sheetName}'!A2:A`);
  const getRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  const rowData = [
    item.id,
    item.itemName,
    photoCell,
    item.category,
    item.dateRepaired,
    item.serialNumber || '',
    item.remark || '',
    item.createdBy,
    item.updatedBy,
    item.createdAt,
    item.updatedAt
  ];

  if (getRes.ok) {
    const data = await getRes.json();
    const rows: any[][] = data.values || [];
    const index = rows.findIndex((r: any[]) => r && r[0] === item.id);

    if (index !== -1) {
      // Row exists: update exact row by row index
      const rowIndex = index + 2;
      const updateRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetName}'!A${rowIndex}:K${rowIndex}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            range: `'${sheetName}'!A${rowIndex}:K${rowIndex}`,
            values: [rowData]
          })
        }
      );
      if (!updateRes.ok) {
        throw new Error(`Google Sheets API update error: ${updateRes.statusText}`);
      }
      return;
    }
  }

  // Row does not exist: append new row
  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetName}'!A:K:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [rowData]
      })
    }
  );
  if (!appendRes.ok) {
    throw new Error(`Google Sheets API append error: ${appendRes.statusText}`);
  }
}

/**
 * Delete single Inventory item from Google Sheets by unique ID
 */
export async function deleteInventoryItemServer(
  spreadsheetId: string,
  accessToken: string,
  itemId: string,
  sheetName: string = 'Inventory'
): Promise<void> {
  const range = encodeURIComponent(`'${sheetName}'!A2:A`);
  const getRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  if (!getRes.ok) return;
  const data = await getRes.json();
  const rows = data.values || [];
  const index = rows.findIndex((r: any[]) => r && r[0] === itemId);

  if (index !== -1) {
    const rowIndex = index + 2;
    try {
      const meta = await getSpreadsheetDetailsServer(spreadsheetId, accessToken);
      const targetSheet = meta.sheets.find(s => s.title.toLowerCase() === sheetName.toLowerCase());
      if (targetSheet && targetSheet.id !== undefined) {
        const delRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              requests: [
                {
                  deleteDimension: {
                    range: {
                      sheetId: targetSheet.id,
                      dimension: 'ROWS',
                      startIndex: index + 1,
                      endIndex: index + 2
                    }
                  }
                }
              ]
            })
          }
        );
        if (delRes.ok) return;
      }
    } catch {
      // Fallback to clear
    }

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetName}'!A${rowIndex}:K${rowIndex}:clear`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
  }
}

/**
 * Upsert single Purchase Order item to Google Sheets by unique ID
 */
export async function upsertPOItemServer(
  spreadsheetId: string,
  accessToken: string,
  po: PurchaseOrderItem,
  sheetName: string = 'Purchase Order',
  uploadsDir?: string
): Promise<void> {
  const drivePhotoUrl = await uploadImageToDriveServer(accessToken, po.photoUrl, po.itemName, uploadsDir);
  const photoCell = formatPhotoFormula(drivePhotoUrl);

  const range = encodeURIComponent(`'${sheetName}'!A2:A`);
  const getRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  const rowData = [
    po.id,
    po.itemName,
    photoCell,
    po.dateOrder,
    po.dateArrival || '',
    po.quantity,
    po.forUse,
    po.status,
    po.remarks || '',
    po.createdBy,
    po.updatedBy,
    po.createdAt,
    po.updatedAt
  ];

  if (getRes.ok) {
    const data = await getRes.json();
    const rows: any[][] = data.values || [];
    const index = rows.findIndex((r: any[]) => r && r[0] === po.id);

    if (index !== -1) {
      const rowIndex = index + 2;
      const updateRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetName}'!A${rowIndex}:M${rowIndex}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            range: `'${sheetName}'!A${rowIndex}:M${rowIndex}`,
            values: [rowData]
          })
        }
      );
      if (!updateRes.ok) {
        throw new Error(`Google Sheets API PO update error: ${updateRes.statusText}`);
      }
      return;
    }
  }

  // Row does not exist: append
  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetName}'!A:M:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [rowData]
      })
    }
  );
  if (!appendRes.ok) {
    throw new Error(`Google Sheets API PO append error: ${appendRes.statusText}`);
  }
}

/**
 * Delete single Purchase Order item from Google Sheets by unique ID
 */
export async function deletePOItemServer(
  spreadsheetId: string,
  accessToken: string,
  poId: string,
  sheetName: string = 'Purchase Order'
): Promise<void> {
  const range = encodeURIComponent(`'${sheetName}'!A2:A`);
  const getRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  if (!getRes.ok) return;
  const data = await getRes.json();
  const rows = data.values || [];
  const index = rows.findIndex((r: any[]) => r && r[0] === poId);

  if (index !== -1) {
    const rowIndex = index + 2;
    try {
      const meta = await getSpreadsheetDetailsServer(spreadsheetId, accessToken);
      const targetSheet = meta.sheets.find(s => s.title.toLowerCase() === sheetName.toLowerCase());
      if (targetSheet && targetSheet.id !== undefined) {
        const delRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              requests: [
                {
                  deleteDimension: {
                    range: {
                      sheetId: targetSheet.id,
                      dimension: 'ROWS',
                      startIndex: index + 1,
                      endIndex: index + 2
                    }
                  }
                }
              ]
            })
          }
        );
        if (delRes.ok) return;
      }
    } catch {
      // Fallback to clear
    }

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetName}'!A${rowIndex}:M${rowIndex}:clear`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
  }
}

/**
 * Pull all rows from Google Sheets (uses valueRenderOption=FORMULA so =IMAGE is parsed)
 */
export async function pullAllFromGoogleSheetsServer(
  spreadsheetId: string,
  accessToken: string,
  invSheet: string = 'Inventory',
  poSheet: string = 'Purchase Order'
): Promise<{ inventory: InventoryItem[]; purchaseOrders: PurchaseOrderItem[] }> {
  const invRange = encodeURIComponent(`'${invSheet}'!A2:K1000`);
  const poRange = encodeURIComponent(`'${poSheet}'!A2:M1000`);

  const [invRes, poRes] = await Promise.all([
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${invRange}?valueRenderOption=FORMULA`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    }),
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${poRange}?valueRenderOption=FORMULA`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
  ]);

  const inventory: InventoryItem[] = [];
  if (invRes.ok) {
    const invJson = await invRes.json();
    const rows: any[][] = invJson.values || [];
    for (const r of rows) {
      if (r && r[0] && r[1]) {
        inventory.push({
          id: String(r[0]).trim(),
          itemName: String(r[1]).trim(),
          photoUrl: parsePhotoFormula(r[2]),
          category: (r[3] || 'PC ITEMS') as Category,
          dateRepaired: String(r[4] || '').trim(),
          serialNumber: r[5] ? String(r[5]).trim() : null,
          remark: r[6] ? String(r[6]).trim() : null,
          createdBy: r[7] ? String(r[7]).trim() : 'ITASSIST',
          updatedBy: r[8] ? String(r[8]).trim() : 'ITASSIST',
          createdAt: r[9] ? String(r[9]).trim() : new Date().toISOString(),
          updatedAt: r[10] ? String(r[10]).trim() : new Date().toISOString()
        });
      }
    }
  }

  const purchaseOrders: PurchaseOrderItem[] = [];
  if (poRes.ok) {
    const poJson = await poRes.json();
    const rows: any[][] = poJson.values || [];
    for (const r of rows) {
      if (r && r[0] && r[1]) {
        purchaseOrders.push({
          id: String(r[0]).trim(),
          itemName: String(r[1]).trim(),
          photoUrl: parsePhotoFormula(r[2]),
          dateOrder: String(r[3] || '').trim(),
          dateArrival: r[4] && String(r[4]).trim() !== '-' ? String(r[4]).trim() : null,
          quantity: parseInt(String(r[5] || '1'), 10) || 1,
          forUse: String(r[6] || '').trim(),
          status: (r[7] === 'SUDAH DATANG' ? 'SUDAH DATANG' : 'BELUM DATANG') as POStatus,
          remarks: r[8] ? String(r[8]).trim() : null,
          createdBy: r[9] ? String(r[9]).trim() : 'ITASSIST',
          updatedBy: r[10] ? String(r[10]).trim() : 'ITASSIST',
          createdAt: r[11] ? String(r[11]).trim() : new Date().toISOString(),
          updatedAt: r[12] ? String(r[12]).trim() : new Date().toISOString()
        });
      }
    }
  }

  return { inventory, purchaseOrders };
}

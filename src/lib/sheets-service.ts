import type { InventoryItem, PurchaseOrderItem, Category, POStatus } from './types';

export interface SpreadsheetDetails {
  spreadsheetId: string;
  title: string;
  url: string;
  sheets: { id: number; title: string; index: number }[];
  isNamedCorrectly: boolean;
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
 * Extracts Google Spreadsheet ID from either a full URL or direct ID.
 */
export function extractSpreadsheetId(urlOrId: string): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const trimmed = urlOrId.trim();

  // Pattern for /spreadsheets/d/SPREADSHEET_ID
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }

  // If already pure alphanumeric/dashes/underscore ID
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Formats a photo URL as a Google Sheets formula that renders the actual photo (PNG/JPG)
 * directly in the cell, rather than plain text URL.
 */
export function formatPhotoFormula(photoUrl: string): string {
  if (!photoUrl || !photoUrl.trim()) return '';
  const trimmed = photoUrl.trim();

  // If already an =IMAGE formula
  if (trimmed.startsWith('=IMAGE(') || trimmed.startsWith('=image(')) {
    return trimmed;
  }

  // If it's a web URL (http/https), wrap with =IMAGE("...", 1)
  // mode 1: Resizes the image to fit inside the cell, maintaining aspect ratio.
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return `=IMAGE("${trimmed}", 1)`;
  }

  return trimmed;
}

/**
 * Parses a photo cell value from Google Sheets.
 * Extracts the inner image URL from =IMAGE("...") formulas.
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
 * Converts an SVG data URL to a PNG Blob using HTML Canvas
 */
export async function svgToPngBlob(svgDataUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      reject(new Error('Canvas conversion only available in browser environment'));
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 400;
        canvas.height = img.height || 300;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create PNG blob'));
        }, 'image/png');
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = e => reject(e);
    img.src = svgDataUrl;
  });
}

/**
 * Uploads an image (base64, SVG, or /uploads/ path) as an actual PNG/JPG file to Google Drive.
 * Returns a direct image URL accessible by Google Sheets =IMAGE(...) formula.
 */
export async function ensureDrivePhotoUrl(
  accessToken: string,
  photoSource: string,
  itemTitle: string
): Promise<string> {
  if (!photoSource || !photoSource.trim()) return '';
  const trimmed = photoSource.trim();

  // If already a Google Drive direct image
  if (
    trimmed.startsWith('https://lh3.googleusercontent.com/') ||
    trimmed.startsWith('https://drive.google.com/')
  ) {
    return trimmed;
  }

  // If already an external https link (not localhost or data:)
  if (trimmed.startsWith('https://') && !trimmed.includes('localhost') && !trimmed.includes('127.0.0.1')) {
    return trimmed;
  }

  try {
    let mimeType = 'image/jpeg';
    let binaryData: Uint8Array | null = null;

    if (trimmed.startsWith('data:image/svg+xml')) {
      // Rasterize SVG into real PNG file
      try {
        const pngBlob = await svgToPngBlob(trimmed);
        mimeType = 'image/png';
        const buffer = await pngBlob.arrayBuffer();
        binaryData = new Uint8Array(buffer);
      } catch {
        const parts = trimmed.split(',');
        const decoded = atob(parts[1] || '');
        binaryData = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) binaryData[i] = decoded.charCodeAt(i);
        mimeType = 'image/svg+xml';
      }
    } else if (trimmed.startsWith('data:image/')) {
      const parts = trimmed.split(',');
      const matchMime = parts[0].match(/:(.*?);/);
      if (matchMime) mimeType = matchMime[1];
      const decoded = atob(parts[1] || '');
      binaryData = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) binaryData[i] = decoded.charCodeAt(i);
    } else if (trimmed.startsWith('/uploads/') || (typeof window !== 'undefined' && trimmed.startsWith(window.location.origin + '/uploads/'))) {
      const res = await fetch(trimmed);
      const blob = await res.blob();
      mimeType = blob.type || 'image/jpeg';
      const buffer = await blob.arrayBuffer();
      binaryData = new Uint8Array(buffer);
    }

    if (binaryData && binaryData.length > 0) {
      const cleanTitle = itemTitle.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
      const ext = mimeType.includes('png') ? 'png' : mimeType.includes('svg') ? 'svg' : 'jpg';
      const filename = `${cleanTitle}_${Date.now()}.${ext}`;

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const metadata = {
        name: filename,
        mimeType
      };

      const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
      const mediaHeader = `${delimiter}Content-Type: ${mimeType}\r\n\r\n`;

      const enc = new TextEncoder();
      const p1 = enc.encode(metadataPart);
      const p2 = enc.encode(mediaHeader);
      const p3 = enc.encode(closeDelimiter);

      const fullPayload = new Uint8Array(p1.length + p2.length + binaryData.length + p3.length);
      fullPayload.set(p1, 0);
      fullPayload.set(p2, p1.length);
      fullPayload.set(binaryData, p1.length + p2.length);
      fullPayload.set(p3, p1.length + p2.length + binaryData.length);

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

        // Set public view permission so Google Sheets =IMAGE() formula can render the photo
        try {
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
          });
        } catch (permErr) {
          console.warn('Set photo permission error:', permErr);
        }

        return `https://lh3.googleusercontent.com/d/${fileId}`;
      }
    }
  } catch (err) {
    console.warn('Could not upload photo to Drive, fallback to original:', err);
  }

  // Fallback to absolute HTTPS URL if on a public applet domain
  if (typeof window !== 'undefined' && window.location.origin.startsWith('https://')) {
    if (trimmed.startsWith('/uploads/')) {
      return `${window.location.origin}${trimmed}`;
    }
  }

  return trimmed;
}

/**
 * Fetch spreadsheet metadata (title, sheet names).
 */
export async function getSpreadsheetDetails(
  spreadsheetId: string,
  accessToken: string
): Promise<SpreadsheetDetails> {
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

  return {
    spreadsheetId,
    title,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    sheets,
    isNamedCorrectly: title.trim().toUpperCase() === REQUIRED_SPREADSHEET_NAME.toUpperCase()
  };
}

/**
 * Format row heights and column widths so photos are clear and sharp in the spreadsheet.
 */
export async function formatSheetDimensions(
  spreadsheetId: string,
  accessToken: string,
  sheetId: number
): Promise<void> {
  try {
    const requests = [
      // Set row height to 65px for data rows
      {
        updateDimensionProperties: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: 1,
            endIndex: 250
          },
          properties: {
            pixelSize: 65
          },
          fields: 'pixelSize'
        }
      },
      // Set column width for Foto (column index 2) to 110px
      {
        updateDimensionProperties: {
          range: {
            sheetId,
            dimension: 'COLUMNS',
            startIndex: 2,
            endIndex: 3
          },
          properties: {
            pixelSize: 110
          },
          fields: 'pixelSize'
        }
      }
    ];

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });
  } catch (err) {
    console.warn('Could not format sheet row heights:', err);
  }
}

/**
 * Create a new spreadsheet named 'DATABASE WEB IT' with Sheet1 (Inventory) and Sheet2 (Purchase Order).
 * Also sets Drive sharing permission so anyone with the link can edit.
 */
export async function createDatabaseWebItSpreadsheet(accessToken: string): Promise<SpreadsheetDetails> {
  const createPayload = {
    properties: {
      title: REQUIRED_SPREADSHEET_NAME
    },
    sheets: [
      {
        properties: {
          title: 'Inventory',
          index: 0,
          gridProperties: {
            frozenRowCount: 1,
            columnCount: 15
          }
        }
      },
      {
        properties: {
          title: 'Purchase Order',
          index: 1,
          gridProperties: {
            frozenRowCount: 1,
            columnCount: 15
          }
        }
      }
    ]
  };

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(createPayload)
  });

  if (!res.ok) {
    let errMsg = 'Gagal membuat Google Spreadsheet baru';
    try {
      const errJson = await res.json();
      errMsg = errJson.error?.message || errMsg;
    } catch {
      errMsg = `${res.status} ${res.statusText}`;
    }
    throw new Error(errMsg);
  }

  const created = await res.json();
  const spreadsheetId = created.spreadsheetId;

  // Insert headers for both sheets
  await initializeHeaders(spreadsheetId, accessToken, 'Inventory', 'Purchase Order');

  // Format dimensions (65px row height & 110px photo column)
  const details = await getSpreadsheetDetails(spreadsheetId, accessToken);
  for (const s of details.sheets) {
    if (s.id !== undefined) {
      await formatSheetDimensions(spreadsheetId, accessToken, s.id);
    }
  }

  // Set file permission to 'anyone with the link can edit'
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'writer',
        type: 'anyone'
      })
    });
  } catch (permErr) {
    console.warn('Could not set public edit permission automatically, user can share manually:', permErr);
  }

  return details;
}

/**
 * Initialize headers in the given sheets
 */
export async function initializeHeaders(
  spreadsheetId: string,
  accessToken: string,
  inventorySheetName: string = 'Inventory',
  poSheetName: string = 'Purchase Order'
): Promise<void> {
  const batchBody = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: `'${inventorySheetName}'!A1:K1`,
        values: [INVENTORY_HEADERS]
      },
      {
        range: `'${poSheetName}'!A1:M1`,
        values: [PO_HEADERS]
      }
    ]
  };

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(batchBody)
    }
  );

  if (!updateRes.ok) {
    console.error('Failed to write headers to spreadsheet');
  }
}

/**
 * Find the sheet names to use for Inventory (Sheet1 or 'Inventory') and Purchase Order (Sheet2 or 'Purchase Order')
 */
export function resolveSheetNames(details: SpreadsheetDetails): {
  invSheet: string;
  poSheet: string;
  invSheetId?: number;
  poSheetId?: number;
} {
  const invSheetObj = details.sheets.find(
    s => s.title.toLowerCase().includes('inventory') || s.index === 0
  );
  const poSheetObj = details.sheets.find(
    s => s.title.toLowerCase().includes('purchase') || s.title.toLowerCase().includes('po') || s.index === 1
  );

  return {
    invSheet: invSheetObj?.title || details.sheets[0]?.title || 'Sheet1',
    poSheet: poSheetObj?.title || details.sheets[1]?.title || 'Sheet2',
    invSheetId: invSheetObj?.id,
    poSheetId: poSheetObj?.id
  };
}

/**
 * Fetch all inventory items from Google Sheets.
 * Uses valueRenderOption=FORMULA so photo formulas like =IMAGE(...) can be parsed into image URLs.
 */
export async function fetchInventoryFromSheets(
  spreadsheetId: string,
  accessToken: string,
  sheetName: string = 'Inventory'
): Promise<InventoryItem[]> {
  const range = encodeURIComponent(`'${sheetName}'!A2:K1000`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueRenderOption=FORMULA`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!res.ok) {
    throw new Error('Gagal mengambil data Inventory dari Google Sheets');
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  return rows
    .filter(r => r && r[0] && r[1]) // Must have ID and Item Name
    .map(row => {
      const [
        id,
        itemName,
        photoRaw,
        category,
        dateRepaired,
        serialNumber,
        remark,
        createdBy,
        updatedBy,
        createdAt,
        updatedAt
      ] = row;

      const photoUrl = parsePhotoFormula(photoRaw);

      return {
        id: String(id || '').trim(),
        itemName: String(itemName || '').trim(),
        photoUrl,
        category: (category || 'PC ITEMS') as Category,
        dateRepaired: String(dateRepaired || '').trim(),
        serialNumber: serialNumber ? String(serialNumber).trim() : null,
        remark: remark ? String(remark).trim() : null,
        createdBy: createdBy ? String(createdBy).trim() : 'ITASSIST',
        updatedBy: updatedBy ? String(updatedBy).trim() : 'ITASSIST',
        createdAt: createdAt ? String(createdAt).trim() : new Date().toISOString(),
        updatedAt: updatedAt ? String(updatedAt).trim() : new Date().toISOString()
      };
    });
}

/**
 * Fetch all Purchase Orders from Google Sheets.
 * Uses valueRenderOption=FORMULA so photo formulas like =IMAGE(...) can be parsed into image URLs.
 */
export async function fetchPOFromSheets(
  spreadsheetId: string,
  accessToken: string,
  sheetName: string = 'Purchase Order'
): Promise<PurchaseOrderItem[]> {
  const range = encodeURIComponent(`'${sheetName}'!A2:M1000`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueRenderOption=FORMULA`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!res.ok) {
    throw new Error('Gagal mengambil data Purchase Order dari Google Sheets');
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  return rows
    .filter(r => r && r[0] && r[1]) // Must have ID and Item Name
    .map(row => {
      const [
        id,
        itemName,
        photoRaw,
        dateOrder,
        dateArrival,
        quantity,
        forUse,
        status,
        remarks,
        createdBy,
        updatedBy,
        createdAt,
        updatedAt
      ] = row;

      const photoUrl = parsePhotoFormula(photoRaw);

      return {
        id: String(id || '').trim(),
        itemName: String(itemName || '').trim(),
        photoUrl,
        dateOrder: String(dateOrder || '').trim(),
        dateArrival: dateArrival && String(dateArrival).trim() !== '-' ? String(dateArrival).trim() : null,
        quantity: parseInt(String(quantity || '1'), 10) || 1,
        forUse: String(forUse || '').trim(),
        status: (status === 'SUDAH DATANG' ? 'SUDAH DATANG' : 'BELUM DATANG') as POStatus,
        remarks: remarks ? String(remarks).trim() : null,
        createdBy: createdBy ? String(createdBy).trim() : 'ITASSIST',
        updatedBy: updatedBy ? String(updatedBy).trim() : 'ITASSIST',
        createdAt: createdAt ? String(createdAt).trim() : new Date().toISOString(),
        updatedAt: updatedAt ? String(updatedAt).trim() : new Date().toISOString()
      };
    });
}

/**
 * Push all inventory & PO items into Google Sheets.
 * Uploads photos to Google Drive and sets =IMAGE("...", 1) so cells display the actual photo (PNG/JPG).
 */
export async function pushAllToSheets(
  spreadsheetId: string,
  accessToken: string,
  inventoryItems: InventoryItem[],
  poItems: PurchaseOrderItem[],
  invSheetName: string = 'Inventory',
  poSheetName: string = 'Purchase Order',
  invSheetId?: number,
  poSheetId?: number
): Promise<void> {
  // Clear old data first
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${invSheetName}'!A2:K1000:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${poSheetName}'!A2:M1000:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  // Process inventory rows with actual photo formulas
  const invRows: any[][] = [];
  for (const item of inventoryItems) {
    const directPhotoUrl = await ensureDrivePhotoUrl(accessToken, item.photoUrl, item.itemName);
    const photoCell = formatPhotoFormula(directPhotoUrl);

    invRows.push([
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
    ]);
  }

  // Process PO rows with actual photo formulas
  const poRows: any[][] = [];
  for (const po of poItems) {
    const directPhotoUrl = await ensureDrivePhotoUrl(accessToken, po.photoUrl, po.itemName);
    const photoCell = formatPhotoFormula(directPhotoUrl);

    poRows.push([
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
    ]);
  }

  const batchData: any[] = [
    {
      range: `'${invSheetName}'!A1:K1`,
      values: [INVENTORY_HEADERS]
    },
    {
      range: `'${poSheetName}'!A1:M1`,
      values: [PO_HEADERS]
    }
  ];

  if (invRows.length > 0) {
    batchData.push({
      range: `'${invSheetName}'!A2:K${invRows.length + 1}`,
      values: invRows
    });
  }

  if (poRows.length > 0) {
    batchData.push({
      range: `'${poSheetName}'!A2:M${poRows.length + 1}`,
      values: poRows
    });
  }

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: batchData
      })
    }
  );

  if (!res.ok) {
    throw new Error('Gagal menulis data ke Google Sheets');
  }

  // Format dimensions (row heights 65px for clear photo view)
  if (invSheetId !== undefined) {
    await formatSheetDimensions(spreadsheetId, accessToken, invSheetId);
  }
  if (poSheetId !== undefined) {
    await formatSheetDimensions(spreadsheetId, accessToken, poSheetId);
  }
}

/**
 * Upsert a single inventory item to Google Sheets in Real-time with actual photo formula
 */
export async function syncInventoryItemToSheets(
  spreadsheetId: string,
  accessToken: string,
  item: InventoryItem,
  sheetName: string = 'Inventory'
): Promise<void> {
  const directPhotoUrl = await ensureDrivePhotoUrl(accessToken, item.photoUrl, item.itemName);
  const photoCell = formatPhotoFormula(directPhotoUrl);

  const range = encodeURIComponent(`'${sheetName}'!A2:A1000`);
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
    const rows = data.values || [];
    const index = rows.findIndex((r: any[]) => r && r[0] === item.id);

    if (index !== -1) {
      const rowIndex = index + 2;
      await fetch(
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
      return;
    }
  }

  // Row does not exist: append new row
  await fetch(
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
}

/**
 * Delete an inventory item row from Google Sheets in Real-time
 */
export async function deleteInventoryItemFromSheets(
  spreadsheetId: string,
  accessToken: string,
  itemId: string,
  sheetName: string = 'Inventory'
): Promise<void> {
  const range = encodeURIComponent(`'${sheetName}'!A2:A1000`);
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
 * Upsert a single Purchase Order item to Google Sheets in Real-time with actual photo formula
 */
export async function syncPOItemToSheets(
  spreadsheetId: string,
  accessToken: string,
  po: PurchaseOrderItem,
  sheetName: string = 'Purchase Order'
): Promise<void> {
  const directPhotoUrl = await ensureDrivePhotoUrl(accessToken, po.photoUrl, po.itemName);
  const photoCell = formatPhotoFormula(directPhotoUrl);

  const range = encodeURIComponent(`'${sheetName}'!A2:A1000`);
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
    const rows = data.values || [];
    const index = rows.findIndex((r: any[]) => r && r[0] === po.id);

    if (index !== -1) {
      const rowIndex = index + 2;
      await fetch(
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
      return;
    }
  }

  // Row does not exist: append
  await fetch(
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
}

/**
 * Delete a Purchase Order item row from Google Sheets in Real-time
 */
export async function deletePOItemFromSheets(
  spreadsheetId: string,
  accessToken: string,
  poId: string,
  sheetName: string = 'Purchase Order'
): Promise<void> {
  const range = encodeURIComponent(`'${sheetName}'!A2:A1000`);
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
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetName}'!A${rowIndex}:M${rowIndex}:clear`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
  }
}

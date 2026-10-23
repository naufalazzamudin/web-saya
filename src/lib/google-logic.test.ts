import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractGoogleSpreadsheetId,
  extractGoogleDriveFolderId,
  validateGoogleConfig,
  formatInventoryRowForSheet,
  buildSpreadsheetValues,
  SPREADSHEET_HEADERS,
  formatPurchaseOrderRowForSheet,
  buildPOSpreadsheetValues,
  PO_SPREADSHEET_HEADERS,
  PRELOVED_SPREADSHEET_HEADERS,
  formatPrelovedRowForSheet,
  buildPrelovedSpreadsheetValues
} from './google-logic.ts';
import type { InventoryItem, PurchaseOrderItem, PrelovedItem } from './types';


test('extractGoogleSpreadsheetId correctly extracts ID from various Google Sheet URLs', () => {
  const url1 = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing';
  assert.equal(extractGoogleSpreadsheetId(url1), '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');

  const url2 = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0';
  assert.equal(extractGoogleSpreadsheetId(url2), '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');

  const url3 = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
  assert.equal(extractGoogleSpreadsheetId(url3), '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');

  const rawId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
  assert.equal(extractGoogleSpreadsheetId(rawId), '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');

  assert.equal(extractGoogleSpreadsheetId('invalid-url'), null);
  assert.equal(extractGoogleSpreadsheetId(''), null);
  assert.equal(extractGoogleSpreadsheetId(null), null);
});

test('extractGoogleDriveFolderId correctly extracts folder ID from various Google Drive URLs', () => {
  const url1 = 'https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j_KLMNOPQRSTUV';
  assert.equal(extractGoogleDriveFolderId(url1), '1a2b3c4d5e6f7g8h9i0j_KLMNOPQRSTUV');

  const url2 = 'https://drive.google.com/drive/u/0/folders/1a2b3c4d5e6f7g8h9i0j_KLMNOPQRSTUV?usp=sharing';
  assert.equal(extractGoogleDriveFolderId(url2), '1a2b3c4d5e6f7g8h9i0j_KLMNOPQRSTUV');

  const rawId = '1a2b3c4d5e6f7g8h9i0j_KLMNOPQRSTUV';
  assert.equal(extractGoogleDriveFolderId(rawId), '1a2b3c4d5e6f7g8h9i0j_KLMNOPQRSTUV');

  assert.equal(extractGoogleDriveFolderId('invalid-folder'), null);
  assert.equal(extractGoogleDriveFolderId(''), null);
  assert.equal(extractGoogleDriveFolderId(undefined), null);
});

test('validateGoogleConfig validates correct and incorrect URLs', () => {
  const resValid = validateGoogleConfig(
    'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
    'https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j_KLMNOPQRSTUV'
  );
  assert.equal(resValid.valid, true);
  assert.equal(resValid.spreadsheetId, '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
  assert.equal(resValid.driveFolderId, '1a2b3c4d5e6f7g8h9i0j_KLMNOPQRSTUV');
  assert.equal(Object.keys(resValid.errors).length, 0);

  const resInvalid = validateGoogleConfig('', 'https://random-site.com');
  assert.equal(resInvalid.valid, false);
  assert.ok(resInvalid.errors.spreadsheetUrl);
  assert.ok(resInvalid.errors.driveFolderUrl);
});

test('formatInventoryRowForSheet formats row neatly with Drive photo URL', () => {
  const item: InventoryItem = {
    id: 'inv-101',
    itemName: 'Dell OptiPlex 7090 Micro PC',
    photoUrl: 'https://drive.google.com/file/d/1Fk_DrivePhotoId/view',
    category: 'PC ITEMS',
    dateRepaired: '2026-10-05',
    serialNumber: 'SN-DELL-7090-X1',
    remark: 'ex Front Office',
    createdAt: '2026-10-05T08:30:00Z',
    createdBy: 'ITMANAGER',
    updatedAt: '2026-10-08T14:35:00Z',
    updatedBy: 'ITASSIST'
  };

  const row = formatInventoryRowForSheet(item, 0);
  assert.equal(row[0], 1); // NO
  assert.equal(row[1], 'inv-101'); // ID
  assert.equal(row[2], 'https://drive.google.com/file/d/1Fk_DrivePhotoId/view'); // FOTO DRIVE
  assert.equal(row[3], 'Dell OptiPlex 7090 Micro PC'); // NAMA
  assert.equal(row[4], 'PC ITEMS'); // KATEGORI
  assert.equal(row[5], '2026-10-05'); // TANGGAL REKAP
  assert.equal(row[6], 1); // JUMLAH UNIT
  assert.equal(row[7], 'SN-DELL-7090-X1'); // SN
  assert.equal(row[8], 'ex Front Office'); // REMARK
  assert.equal(row[9], 'ITMANAGER'); // CREATED BY
  assert.equal(row[10], 'ITASSIST'); // UPDATED BY
});

test('buildSpreadsheetValues outputs header and items rows correctly', () => {
  const sampleItems: InventoryItem[] = [
    {
      id: 'inv-1',
      itemName: 'Switch Cisco',
      photoUrl: 'https://drive.google.com/file/d/123/view',
      category: 'NETWORK ITEMS',
      dateRepaired: '2026-10-01',
      serialNumber: null,
      remark: null,
      createdAt: '2026-10-01T00:00:00Z',
      createdBy: 'ITMANAGER',
      updatedAt: '2026-10-01T00:00:00Z',
      updatedBy: 'ITMANAGER'
    }
  ];

  const values = buildSpreadsheetValues(sampleItems);
  assert.equal(values.length, 2);
  assert.deepEqual(values[0], SPREADSHEET_HEADERS);
  assert.equal(values[1][0], 1);
  assert.equal(values[1][3], 'Switch Cisco');
  assert.equal(values[1][6], 1); // default quantity
});

test('formatPurchaseOrderRowForSheet and buildPOSpreadsheetValues format PO rows correctly', () => {
  const samplePOs: PurchaseOrderItem[] = [
    {
      id: 'po-101',
      itemName: 'MikroTik Cloud Core Router',
      photoUrl: 'https://drive.google.com/file/d/123PO/view',
      dateOrder: '2026-10-15',
      dateArrival: '2026-10-18',
      quantity: 2,
      forUse: 'Core Gateway Redundancy',
      remarks: 'Ordered via distributor',
      status: 'SUDAH DATANG',
      createdAt: '2026-10-15T09:00:00Z',
      createdBy: 'ITMANAGER',
      updatedAt: '2026-10-18T10:00:00Z',
      updatedBy: 'ITASSIST'
    }
  ];

  const row = formatPurchaseOrderRowForSheet(samplePOs[0], 0);
  assert.equal(row[0], 1); // NO
  assert.equal(row[1], 'po-101'); // ID PO
  assert.equal(row[2], 'https://drive.google.com/file/d/123PO/view'); // FOTO
  assert.equal(row[3], 'MikroTik Cloud Core Router'); // NAMA
  assert.equal(row[4], 'SUDAH DATANG'); // STATUS
  assert.equal(row[5], '2026-10-15'); // TGL ORDER
  assert.equal(row[6], '2026-10-18'); // TGL ARRIVAL
  assert.equal(row[7], 2); // QTY
  assert.equal(row[8], 'Core Gateway Redundancy'); // FOR USE

  const values = buildPOSpreadsheetValues(samplePOs);
  assert.equal(values.length, 2);
  assert.deepEqual(values[0], PO_SPREADSHEET_HEADERS);
  assert.equal(values[1][1], 'po-101');
});

test('formatPrelovedRowForSheet and buildPrelovedSpreadsheetValues format Preloved rows correctly', () => {
  const samplePreloved: PrelovedItem[] = [
    {
      id: 'prev-101',
      itemName: 'HP ProDesk 400 G6 Micro PC',
      photoUrl: 'https://drive.google.com/file/d/123Pre/view',
      category: 'PC ITEMS',
      dateRepaired: '2026-10-10',
      quantity: 3,
      serialNumber: 'HP-SN-001',
      remark: 'Ex Front Office',
      createdAt: '2026-10-10T10:00:00Z',
      createdBy: 'ITMANAGER',
      updatedAt: '2026-10-10T10:00:00Z',
      updatedBy: 'ITMANAGER'
    }
  ];

  const row = formatPrelovedRowForSheet(samplePreloved[0], 0);
  assert.equal(row[0], 1); // NO
  assert.equal(row[1], 'prev-101'); // ID PRELOVED
  assert.equal(row[2], 'https://drive.google.com/file/d/123Pre/view'); // FOTO
  assert.equal(row[3], 'HP ProDesk 400 G6 Micro PC'); // NAMA
  assert.equal(row[4], 'PC ITEMS'); // KATEGORI
  assert.equal(row[5], '2026-10-10'); // TANGGAL DIBERESKAN
  assert.equal(row[6], 3); // JUMLAH UNIT
  assert.equal(row[7], 'HP-SN-001'); // SN
  assert.equal(row[8], 'Ex Front Office'); // REMARK

  const values = buildPrelovedSpreadsheetValues(samplePreloved);
  assert.equal(values.length, 2);
  assert.deepEqual(values[0], PRELOVED_SPREADSHEET_HEADERS);
  assert.equal(values[1][1], 'prev-101');
  assert.equal(values[1][6], 3);
});



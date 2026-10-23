import test from 'node:test';
import assert from 'node:assert';
import {
  extractSpreadsheetId,
  resolveSheetNames,
  formatPhotoFormula,
  parsePhotoFormula,
  INVENTORY_HEADERS,
  PO_HEADERS,
  REQUIRED_SPREADSHEET_NAME
} from './sheets-service.ts';
import type { SpreadsheetDetails } from './sheets-service.ts';

test('extractSpreadsheetId handles full Google Sheets URLs', () => {
  const url1 = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0';
  assert.strictEqual(extractSpreadsheetId(url1), '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');

  const url2 = 'https://docs.google.com/spreadsheets/d/1_a-b_c1234567890XYZ/edit?usp=sharing';
  assert.strictEqual(extractSpreadsheetId(url2), '1_a-b_c1234567890XYZ');
});

test('extractSpreadsheetId handles raw spreadsheet IDs', () => {
  const rawId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
  assert.strictEqual(extractSpreadsheetId(rawId), '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
});

test('extractSpreadsheetId returns null for invalid inputs', () => {
  assert.strictEqual(extractSpreadsheetId(''), null);
  assert.strictEqual(extractSpreadsheetId('not-a-valid-id'), null);
});

test('resolveSheetNames identifies Inventory and Purchase Order sheets', () => {
  const details1: SpreadsheetDetails = {
    spreadsheetId: 'abc12345678901234567890',
    title: 'DATABASE WEB IT',
    url: 'https://docs.google.com/spreadsheets/d/abc/edit',
    sheets: [
      { id: 0, title: 'Inventory', index: 0 },
      { id: 1, title: 'Purchase Order', index: 1 }
    ],
    isNamedCorrectly: true
  };

  const resolved = resolveSheetNames(details1);
  assert.strictEqual(resolved.invSheet, 'Inventory');
  assert.strictEqual(resolved.poSheet, 'Purchase Order');
});

test('resolveSheetNames falls back to Sheet1 and Sheet2 if default names', () => {
  const details2: SpreadsheetDetails = {
    spreadsheetId: 'abc12345678901234567890',
    title: 'DATABASE WEB IT',
    url: 'https://docs.google.com/spreadsheets/d/abc/edit',
    sheets: [
      { id: 0, title: 'Sheet1', index: 0 },
      { id: 1, title: 'Sheet2', index: 1 }
    ],
    isNamedCorrectly: true
  };

  const resolved = resolveSheetNames(details2);
  assert.strictEqual(resolved.invSheet, 'Sheet1');
  assert.strictEqual(resolved.poSheet, 'Sheet2');
});

test('formatPhotoFormula converts web image URLs to Google Sheets =IMAGE formulas', () => {
  const driveUrl = 'https://lh3.googleusercontent.com/d/1A2B3C4D5E';
  assert.strictEqual(formatPhotoFormula(driveUrl), '=IMAGE("https://lh3.googleusercontent.com/d/1A2B3C4D5E", 1)');

  const httpsUrl = 'https://example.com/item.jpg';
  assert.strictEqual(formatPhotoFormula(httpsUrl), '=IMAGE("https://example.com/item.jpg", 1)');

  // If already formula, preserves it
  const existing = '=IMAGE("https://example.com/test.png", 1)';
  assert.strictEqual(formatPhotoFormula(existing), existing);
});

test('parsePhotoFormula extracts image URL from Google Sheets =IMAGE formulas', () => {
  const formula = '=IMAGE("https://lh3.googleusercontent.com/d/1A2B3C4D5E", 1)';
  assert.strictEqual(parsePhotoFormula(formula), 'https://lh3.googleusercontent.com/d/1A2B3C4D5E');

  const formulaSingleQuote = "=IMAGE('https://example.com/image.png', 1)";
  assert.strictEqual(parsePhotoFormula(formulaSingleQuote), 'https://example.com/image.png');

  const plainUrl = 'https://example.com/item.jpg';
  assert.strictEqual(parsePhotoFormula(plainUrl), 'https://example.com/item.jpg');
});

test('Spreadsheet headers have required fields including remark, foto, and user tracking', () => {
  assert.strictEqual(REQUIRED_SPREADSHEET_NAME, 'DATABASE WEB IT');
  assert.ok(INVENTORY_HEADERS.includes('Foto'));
  assert.ok(INVENTORY_HEADERS.includes('Remark'));
  assert.ok(INVENTORY_HEADERS.includes('Ditambahkan Oleh'));
  assert.ok(INVENTORY_HEADERS.includes('Terakhir Diedit Oleh'));
  assert.ok(PO_HEADERS.includes('Foto'));
  assert.ok(PO_HEADERS.includes('Remarks'));
  assert.ok(PO_HEADERS.includes('Ditambahkan Oleh'));
  assert.ok(PO_HEADERS.includes('Terakhir Diedit Oleh'));
});

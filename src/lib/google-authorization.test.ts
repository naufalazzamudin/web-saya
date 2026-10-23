import test from 'node:test';
import assert from 'node:assert/strict';
import { extractGoogleSpreadsheetId, extractGoogleDriveFolderId } from './google-logic.ts';

function checkCanEditGoogleSettings(role: string): boolean {
  return role === 'IT MANAGER';
}

test('authorization logic permits only IT MANAGER to edit Google settings', () => {
  assert.equal(checkCanEditGoogleSettings('IT MANAGER'), true);
  assert.equal(checkCanEditGoogleSettings('IT ASSIST'), false);
  assert.equal(checkCanEditGoogleSettings('IT TRAINEE'), false);
  assert.equal(checkCanEditGoogleSettings('GUEST'), false);
});

test('Google IDs extraction persists valid spreadsheet and folder IDs', () => {
  const sheetUrl = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0';
  const folderUrl = 'https://drive.google.com/drive/folders/1wXyZaBcDeFgHiJkLmNoPqRsTuVwXyZaB';

  const sheetId = extractGoogleSpreadsheetId(sheetUrl);
  const folderId = extractGoogleDriveFolderId(folderUrl);

  assert.equal(sheetId, '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
  assert.equal(folderId, '1wXyZaBcDeFgHiJkLmNoPqRsTuVwXyZaB');
});

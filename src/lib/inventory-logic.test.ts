import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isDateRepairedInMonth,
  parseMonthFilter,
  filterInventory,
  sortInventory,
  computeStats
} from './inventory-logic.ts';
import type { InventoryItem } from './types.ts';

const mockItems: InventoryItem[] = [
  {
    id: 'item-1',
    itemName: 'Dell OptiPlex 7090 Micro',
    photoUrl: '/uploads/sample1.jpg',
    category: 'PC ITEMS',
    dateRepaired: '2026-08-15',
    serialNumber: 'SN-DELL-001',
    remark: 'ex Front Office',
    createdAt: '2026-09-01T10:00:00Z',
    createdBy: 'ITMANAGER',
    updatedAt: '2026-09-02T14:30:00Z',
    updatedBy: 'ITASSIST'
  },
  {
    id: 'item-2',
    itemName: 'Cisco Catalyst 2960-X Switch',
    photoUrl: '/uploads/sample2.jpg',
    category: 'NETWORK ITEMS',
    dateRepaired: '2026-08-31',
    serialNumber: 'FOC21345678',
    remark: 'ex Room 301',
    createdAt: '2026-08-31T08:00:00Z',
    createdBy: 'ITASSIST',
    updatedAt: '2026-08-31T08:00:00Z',
    updatedBy: 'ITASSIST'
  },
  {
    id: 'item-3',
    itemName: 'Hikvision 4K Dome CCTV Camera',
    photoUrl: '/uploads/sample3.jpg',
    category: 'CCTV & TV ITEMS',
    dateRepaired: '2026-10-05',
    serialNumber: null,
    remark: 'ex Resto Lobby',
    createdAt: '2026-10-05T09:00:00Z',
    createdBy: 'ITTRAINEE',
    updatedAt: '2026-10-10T12:00:00Z',
    updatedBy: 'ITMANAGER'
  }
];

test('isDateRepairedInMonth correctly checks month and year', () => {
  assert.equal(isDateRepairedInMonth('2026-08-15', 8, 2026), true);
  assert.equal(isDateRepairedInMonth('2026-08-31', 8, 2026), true);
  assert.equal(isDateRepairedInMonth('2026-09-01', 8, 2026), false);
  assert.equal(isDateRepairedInMonth('2025-08-15', 8, 2026), false);
});

test('parseMonthFilter handles multiple representations', () => {
  assert.deepEqual(parseMonthFilter('AUGUST 2026'), { month: 8, year: 2026 });
  assert.deepEqual(parseMonthFilter('2026-08'), { month: 8, year: 2026 });
  assert.deepEqual(parseMonthFilter('8'), { month: 8, year: 2026 });
  assert.equal(parseMonthFilter('ALL'), null);
});

test('filterInventory filters strictly by dateRepaired for month', () => {
  // item-1 was created in Sept 2026, but dateRepaired is 2026-08-15 -> MUST be in August!
  const augustItems = filterInventory(mockItems, { month: 'AUGUST 2026' });
  assert.equal(augustItems.length, 2);
  assert.ok(augustItems.some(i => i.id === 'item-1'));
  assert.ok(augustItems.some(i => i.id === 'item-2'));
});

test('filterInventory supports search across name, SN, remark, category, and user', () => {
  const byName = filterInventory(mockItems, { search: 'OptiPlex' });
  assert.equal(byName.length, 1);
  assert.equal(byName[0].id, 'item-1');

  const bySN = filterInventory(mockItems, { search: 'FOC21345678' });
  assert.equal(bySN.length, 1);
  assert.equal(bySN[0].id, 'item-2');

  const byRemark = filterInventory(mockItems, { search: 'Front Office' });
  assert.equal(byRemark.length, 1);
  assert.equal(byRemark[0].id, 'item-1');

  const byUser = filterInventory(mockItems, { search: 'ITTRAINEE' });
  assert.equal(byUser.length, 1);
  assert.equal(byUser[0].id, 'item-3');
});

test('filterInventory filters by category', () => {
  const pcOnly = filterInventory(mockItems, { category: 'PC ITEMS' });
  assert.equal(pcOnly.length, 1);
  assert.equal(pcOnly[0].category, 'PC ITEMS');
});

test('sortInventory correctly sorts by name and updated date', () => {
  const sortedByName = sortInventory(mockItems, 'name-asc');
  assert.equal(sortedByName[0].itemName, 'Cisco Catalyst 2960-X Switch');
  assert.equal(sortedByName[2].itemName, 'Hikvision 4K Dome CCTV Camera');

  const sortedByUpdated = sortInventory(mockItems, 'updated-newest');
  assert.equal(sortedByUpdated[0].id, 'item-3'); // updated Oct 10
});

test('computeStats counts categories and items added this month', () => {
  const stats = computeStats(mockItems, new Date('2026-10-15T00:00:00Z'));
  assert.equal(stats.total, 3);
  assert.equal(stats.pcCount, 1);
  assert.equal(stats.networkCount, 1);
  assert.equal(stats.cctvCount, 1);
  assert.equal(stats.addedThisMonth, 1); // Only item-3 created in Oct 2026
});

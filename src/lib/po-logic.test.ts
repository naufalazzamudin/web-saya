import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isDateOrderInMonth,
  filterPurchaseOrders,
  sortPurchaseOrders,
  computePOStats
} from './po-logic.ts';
import type { PurchaseOrderItem } from './types.ts';

const mockPOs: PurchaseOrderItem[] = [
  {
    id: 'po-1',
    itemName: 'Patch Cord Cat6 2M (50 pcs)',
    photoUrl: '/uploads/sample-cat6.jpg',
    dateOrder: '2026-10-02',
    dateArrival: '2026-10-06',
    quantity: 50,
    forUse: 'Housekeeping & Guest Rooms AP Replacement',
    remarks: 'Ready stock at supplier',
    status: 'SUDAH DATANG',
    createdAt: '2026-10-02T08:00:00Z',
    createdBy: 'ITASSIST',
    updatedAt: '2026-10-06T11:00:00Z',
    updatedBy: 'ITMANAGER'
  },
  {
    id: 'po-2',
    itemName: 'Dell Wireless Keyboard & Mouse Combo (10 sets)',
    photoUrl: '/uploads/sample-km.jpg',
    dateOrder: '2026-10-10',
    dateArrival: null,
    quantity: 10,
    forUse: 'Front Office Reception & Sales Office',
    remarks: 'PO approved by GM, waiting shipment from distributor',
    status: 'BELUM DATANG',
    createdAt: '2026-10-10T09:30:00Z',
    createdBy: 'ITMANAGER',
    updatedAt: '2026-10-10T09:30:00Z',
    updatedBy: 'ITMANAGER'
  },
  {
    id: 'po-3',
    itemName: 'Ubiquiti UniFi U6-Pro Access Point (4 units)',
    photoUrl: '/uploads/sample-ap.jpg',
    dateOrder: '2026-08-18',
    dateArrival: '2026-08-25',
    quantity: 4,
    forUse: 'Grand Ballroom Wi-Fi Density Upgrade',
    remarks: 'Installed and configured on controller',
    status: 'SUDAH DATANG',
    createdAt: '2026-08-18T14:00:00Z',
    createdBy: 'ITTRAINEE',
    updatedAt: '2026-08-25T16:00:00Z',
    updatedBy: 'ITASSIST'
  }
];

test('isDateOrderInMonth correctly matches order date to month and year', () => {
  assert.equal(isDateOrderInMonth('2026-10-02', 10, 2026), true);
  assert.equal(isDateOrderInMonth('2026-08-18', 8, 2026), true);
  assert.equal(isDateOrderInMonth('2026-10-02', 9, 2026), false);
});

test('filterPurchaseOrders filters by status (BELUM DATANG vs SUDAH DATANG)', () => {
  const pending = filterPurchaseOrders(mockPOs, { status: 'BELUM DATANG' });
  assert.equal(pending.length, 1);
  assert.equal(pending[0].id, 'po-2');

  const arrived = filterPurchaseOrders(mockPOs, { status: 'SUDAH DATANG' });
  assert.equal(arrived.length, 2);
});

test('filterPurchaseOrders searches across itemName, forUse, and remarks', () => {
  const searchName = filterPurchaseOrders(mockPOs, { search: 'Keyboard' });
  assert.equal(searchName.length, 1);
  assert.equal(searchName[0].id, 'po-2');

  const searchForUse = filterPurchaseOrders(mockPOs, { search: 'Ballroom' });
  assert.equal(searchForUse.length, 1);
  assert.equal(searchForUse[0].id, 'po-3');
});

test('filterPurchaseOrders filters by month based on dateOrder', () => {
  const augustOrders = filterPurchaseOrders(mockPOs, { month: 'AUGUST 2026' });
  assert.equal(augustOrders.length, 1);
  assert.equal(augustOrders[0].id, 'po-3');

  const octoberOrders = filterPurchaseOrders(mockPOs, { month: 'OCTOBER 2026' });
  assert.equal(octoberOrders.length, 2);
});

test('computePOStats computes pending, arrived, and monthly counts correctly', () => {
  const stats = computePOStats(mockPOs, new Date('2026-10-15T00:00:00Z'));
  assert.equal(stats.total, 3);
  assert.equal(stats.pendingCount, 1); // po-2 is BELUM DATANG
  assert.equal(stats.arrivedCount, 2);  // po-1 and po-3 are SUDAH DATANG
  assert.equal(stats.orderedThisMonth, 2); // po-1 and po-2 ordered in Oct 2026
});

test('sortPurchaseOrders sorts by quantity and order date', () => {
  const sortedByQty = sortPurchaseOrders(mockPOs, 'quantity-desc');
  assert.equal(sortedByQty[0].quantity, 50); // po-1

  const sortedByOrderNewest = sortPurchaseOrders(mockPOs, 'order-newest');
  assert.equal(sortedByOrderNewest[0].id, 'po-2'); // 2026-10-10
});

import test from 'node:test';
import assert from 'node:assert/strict';
import type { PrelovedItem } from './types';
import { filterPreloved, sortPreloved, computePrelovedStats } from './preloved-logic';

const samplePreloved: PrelovedItem[] = [
  {
    id: 'prev-1',
    itemName: 'HP ProDesk 400 G6 Micro PC',
    photoUrl: 'data:image/svg+xml;base64,sample',
    category: 'PC ITEMS',
    dateRepaired: '2026-10-05',
    serialNumber: 'HP400-PRE-01',
    remark: 'ex Front Desk Backoffice',
    createdAt: '2026-10-05T10:00:00Z',
    createdBy: 'ITMANAGER',
    updatedAt: '2026-10-05T10:00:00Z',
    updatedBy: 'ITMANAGER'
  },
  {
    id: 'prev-2',
    itemName: 'Cisco SG300 28-Port Gigabit Switch',
    photoUrl: 'data:image/svg+xml;base64,sample',
    category: 'NETWORK ITEMS',
    dateRepaired: '2026-09-15',
    serialNumber: 'CSCO-SG300-88',
    remark: 'ex Server Room 2nd Floor',
    createdAt: '2026-09-15T14:30:00Z',
    createdBy: 'ITASSIST',
    updatedAt: '2026-09-16T08:00:00Z',
    updatedBy: 'ITASSIST'
  },
  {
    id: 'prev-3',
    itemName: 'Hikvision Bullet IP Camera 2MP',
    photoUrl: 'data:image/svg+xml;base64,sample',
    category: 'CCTV & TV ITEMS',
    dateRepaired: '2026-10-12',
    serialNumber: 'HK-BULLET-221',
    remark: 'ex Kitchen Area, cleaned & tested',
    createdAt: '2026-10-12T09:00:00Z',
    createdBy: 'ITTRAINEE',
    updatedAt: '2026-10-12T09:00:00Z',
    updatedBy: 'ITTRAINEE'
  }
];

test('computePrelovedStats calculates counts correctly', () => {
  const stats = computePrelovedStats(samplePreloved, new Date('2026-10-20'));
  assert.equal(stats.total, 3);
  assert.equal(stats.pcCount, 1);
  assert.equal(stats.networkCount, 1);
  assert.equal(stats.cctvCount, 1);
  assert.equal(stats.addedThisMonth, 2);
});

test('filterPreloved filters by search term', () => {
  const res = filterPreloved(samplePreloved, { search: 'Cisco' });
  assert.equal(res.length, 1);
  assert.equal(res[0].id, 'prev-2');
});

test('filterPreloved filters by category', () => {
  const res = filterPreloved(samplePreloved, { category: 'PC ITEMS' });
  assert.equal(res.length, 1);
  assert.equal(res[0].id, 'prev-1');
});

test('sortPreloved sorts correctly by name-asc', () => {
  const sorted = sortPreloved(samplePreloved, 'name-asc');
  assert.equal(sorted[0].itemName, 'Cisco SG300 28-Port Gigabit Switch');
});

import type { PurchaseOrderItem, POFilterOptions, POStats } from './types.ts';
import { parseMonthFilter } from './inventory-logic.ts';

export function isDateOrderInMonth(dateOrder: string, month: number, year: number): boolean {
  if (!dateOrder) return false;
  const parts = dateOrder.split('T')[0].split('-');
  if (parts.length >= 2) {
    const itemYear = parseInt(parts[0], 10);
    const itemMonth = parseInt(parts[1], 10);
    return itemYear === year && itemMonth === month;
  }
  const d = new Date(dateOrder);
  if (isNaN(d.getTime())) return false;
  return d.getFullYear() === year && (d.getMonth() + 1) === month;
}

export function filterPurchaseOrders(items: PurchaseOrderItem[], filters: POFilterOptions): PurchaseOrderItem[] {
  return items.filter((po) => {
    // 1. Search filter across itemName, forUse, remarks, createdBy, updatedBy
    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.toLowerCase().trim();
      const matchName = po.itemName.toLowerCase().includes(q);
      const matchForUse = po.forUse ? po.forUse.toLowerCase().includes(q) : false;
      const matchRemarks = po.remarks ? po.remarks.toLowerCase().includes(q) : false;
      const matchCreator = po.createdBy.toLowerCase().includes(q);
      const matchUpdater = po.updatedBy.toLowerCase().includes(q);
      if (!matchName && !matchForUse && !matchRemarks && !matchCreator && !matchUpdater) {
        return false;
      }
    }

    // 2. Status filter
    if (filters.status && filters.status !== 'ALL') {
      if (po.status !== filters.status) {
        return false;
      }
    }

    // 3. Month filter (based on dateOrder)
    if (filters.month) {
      const parsed = parseMonthFilter(filters.month);
      if (parsed) {
        if (!isDateOrderInMonth(po.dateOrder, parsed.month, parsed.year)) {
          return false;
        }
      }
    }

    // 4. User filter
    if (filters.user && filters.user !== 'All Users' && filters.user !== 'ALL') {
      const target = filters.user.toLowerCase();
      const matchCreated = po.createdBy.toLowerCase() === target;
      const matchUpdated = po.updatedBy.toLowerCase() === target;
      if (!matchCreated && !matchUpdated) {
        return false;
      }
    }

    // 5. Date Range (from dateOrder)
    if (filters.dateFrom) {
      const d = po.dateOrder.split('T')[0];
      if (d < filters.dateFrom) return false;
    }
    if (filters.dateTo) {
      const d = po.dateOrder.split('T')[0];
      if (d > filters.dateTo) return false;
    }

    return true;
  });
}

export function sortPurchaseOrders(
  items: PurchaseOrderItem[],
  sortBy: POFilterOptions['sortBy'] = 'updated-newest'
): PurchaseOrderItem[] {
  const sorted = [...items];
  switch (sortBy) {
    case 'name-asc':
      return sorted.sort((a, b) => a.itemName.localeCompare(b.itemName));
    case 'name-desc':
      return sorted.sort((a, b) => b.itemName.localeCompare(a.itemName));
    case 'order-newest':
      return sorted.sort((a, b) => new Date(b.dateOrder).getTime() - new Date(a.dateOrder).getTime());
    case 'order-oldest':
      return sorted.sort((a, b) => new Date(a.dateOrder).getTime() - new Date(b.dateOrder).getTime());
    case 'arrival-newest':
      return sorted.sort((a, b) => {
        const da = a.dateArrival ? new Date(a.dateArrival).getTime() : 0;
        const db = b.dateArrival ? new Date(b.dateArrival).getTime() : 0;
        return db - da;
      });
    case 'quantity-desc':
      return sorted.sort((a, b) => b.quantity - a.quantity);
    case 'updated-newest':
    default:
      return sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
}

export function computePOStats(items: PurchaseOrderItem[], referenceDate = new Date()): POStats {
  let pendingCount = 0;
  let arrivedCount = 0;
  let orderedThisMonth = 0;

  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1;

  for (const po of items) {
    if (po.status === 'BELUM DATANG') {
      pendingCount++;
    } else if (po.status === 'SUDAH DATANG') {
      arrivedCount++;
    }

    if (isDateOrderInMonth(po.dateOrder, currentMonth, currentYear)) {
      orderedThisMonth++;
    }
  }

  return {
    total: items.length,
    pendingCount,
    arrivedCount,
    orderedThisMonth
  };
}

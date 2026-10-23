import type { PrelovedItem, FilterOptions, PrelovedStats, Category } from './types';
import { MONTH_NAMES, isDateRepairedInMonth, parseMonthFilter, formatDate, formatDateTime } from './inventory-logic';

export { MONTH_NAMES, isDateRepairedInMonth, parseMonthFilter, formatDate, formatDateTime };

/**
 * Pure function to filter preloved items
 */
export function filterPreloved(items: PrelovedItem[], filters: FilterOptions): PrelovedItem[] {
  return items.filter(item => {
    // 1. Search across Item Name, Serial Number, Remark, Category, CreatedBy, UpdatedBy
    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.toLowerCase().trim();
      const matchName = item.itemName.toLowerCase().includes(q);
      const matchSN = item.serialNumber ? item.serialNumber.toLowerCase().includes(q) : false;
      const matchRemark = item.remark ? item.remark.toLowerCase().includes(q) : false;
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchCreator = item.createdBy.toLowerCase().includes(q);
      const matchUpdater = item.updatedBy.toLowerCase().includes(q);
      if (!matchName && !matchSN && !matchRemark && !matchCategory && !matchCreator && !matchUpdater) {
        return false;
      }
    }

    // 2. Category Filter
    if (filters.category && filters.category !== 'All' && filters.category !== 'ALL') {
      if (item.category !== filters.category) {
        return false;
      }
    }

    // 3. Month Filter (based on dateRepaired)
    if (filters.month) {
      const parsed = parseMonthFilter(filters.month);
      if (parsed) {
        if (!isDateRepairedInMonth(item.dateRepaired, parsed.month, parsed.year)) {
          return false;
        }
      }
    }

    // 4. User Filter (Added or Edited by)
    if (filters.user && filters.user !== 'All Users' && filters.user !== 'ALL') {
      const targetUser = filters.user.toLowerCase();
      const matchCreated = item.createdBy.toLowerCase() === targetUser;
      const matchUpdated = item.updatedBy.toLowerCase() === targetUser;
      if (!matchCreated && !matchUpdated) {
        return false;
      }
    }

    // 5. Date Range (from / to based on dateRepaired)
    if (filters.dateFrom) {
      const itemDate = item.dateRepaired.split('T')[0];
      if (itemDate < filters.dateFrom) return false;
    }
    if (filters.dateTo) {
      const itemDate = item.dateRepaired.split('T')[0];
      if (itemDate > filters.dateTo) return false;
    }

    return true;
  });
}

/**
 * Pure function to sort preloved items
 */
export function sortPreloved(items: PrelovedItem[], sortBy: FilterOptions['sortBy'] = 'updated-newest'): PrelovedItem[] {
  const sorted = [...items];
  switch (sortBy) {
    case 'name-asc':
      return sorted.sort((a, b) => a.itemName.localeCompare(b.itemName));
    case 'name-desc':
      return sorted.sort((a, b) => b.itemName.localeCompare(a.itemName));
    case 'date-newest':
      return sorted.sort((a, b) => new Date(b.dateRepaired).getTime() - new Date(a.dateRepaired).getTime());
    case 'date-oldest':
      return sorted.sort((a, b) => new Date(a.dateRepaired).getTime() - new Date(b.dateRepaired).getTime());
    case 'category':
      return sorted.sort((a, b) => a.category.localeCompare(b.category));
    case 'user':
      return sorted.sort((a, b) => a.createdBy.localeCompare(b.createdBy));
    case 'updated-newest':
    default:
      return sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
}

/**
 * Compute dashboard stats from preloved items
 */
export function computePrelovedStats(items: PrelovedItem[], referenceDate = new Date()): PrelovedStats {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1;

  let pcCount = 0;
  let networkCount = 0;
  let cctvCount = 0;
  let addedThisMonth = 0;

  for (const item of items) {
    if (item.category === 'PC ITEMS') pcCount++;
    else if (item.category === 'NETWORK ITEMS') networkCount++;
    else if (item.category === 'CCTV & TV ITEMS') cctvCount++;

    const created = new Date(item.createdAt);
    if (!isNaN(created.getTime())) {
      if (created.getFullYear() === currentYear && (created.getMonth() + 1) === currentMonth) {
        addedThisMonth++;
      }
    }
  }

  return {
    total: items.length,
    pcCount,
    networkCount,
    cctvCount,
    addedThisMonth
  };
}

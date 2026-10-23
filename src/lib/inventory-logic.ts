import type { InventoryItem, FilterOptions, InventoryStats, Category } from './types';

export const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

/**
 * Checks if a given dateRepaired string (YYYY-MM-DD or ISO) belongs to a specific month (1-12) and year.
 */
export function isDateRepairedInMonth(dateRepaired: string, month: number, year: number): boolean {
  if (!dateRepaired) return false;
  const parts = dateRepaired.split('T')[0].split('-');
  if (parts.length >= 2) {
    const itemYear = parseInt(parts[0], 10);
    const itemMonth = parseInt(parts[1], 10);
    return itemYear === year && itemMonth === month;
  }
  const d = new Date(dateRepaired);
  if (isNaN(d.getTime())) return false;
  return d.getFullYear() === year && (d.getMonth() + 1) === month;
}

/**
 * Parses month string like "2026-08", "AUGUST 2026", or month index.
 */
export function parseMonthFilter(monthFilter?: string): { month: number; year: number } | null {
  if (!monthFilter || monthFilter.toLowerCase() === 'all') return null;

  // Format "2026-08" or "2026-8"
  if (/^\d{4}-\d{1,2}$/.test(monthFilter)) {
    const [y, m] = monthFilter.split('-').map(Number);
    return { year: y, month: m };
  }

  // Format "AUGUST 2026" or "AUGUST"
  const upper = monthFilter.toUpperCase().trim();
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    const mName = MONTH_NAMES[i];
    if (upper.includes(mName)) {
      const yearMatch = upper.match(/\b(20\d{2})\b/);
      const year = yearMatch ? parseInt(yearMatch[1], 10) : 2026;
      return { month: i + 1, year };
    }
  }

  // Pure month number 1-12
  const num = parseInt(monthFilter, 10);
  if (!isNaN(num) && num >= 1 && num <= 12) {
    return { month: num, year: 2026 };
  }

  return null;
}

/**
 * Pure function to filter inventory items
 */
export function filterInventory(items: InventoryItem[], filters: FilterOptions): InventoryItem[] {
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

    // 3. Month Filter (based on dateRepaired strictly)
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
 * Pure function to sort inventory items
 */
export function sortInventory(items: InventoryItem[], sortBy: FilterOptions['sortBy'] = 'updated-newest'): InventoryItem[] {
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
 * Compute dashboard stats from inventory items
 */
export function computeStats(items: InventoryItem[], referenceDate = new Date()): InventoryStats {
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

    // Added this month is based on createdAt
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

/**
 * Format date for display: "08 October 2026"
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Format datetime for display: "08 October 2026, 17:03"
 */
export function formatDateTime(isoString: string): string {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const datePart = d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const timePart = d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return `${datePart}, ${timePart}`;
}

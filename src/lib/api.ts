import type {
  InventoryItem,
  UserAccount,
  ActivityRecord,
  InventoryStats,
  FilterOptions,
  PurchaseOrderItem,
  POFilterOptions,
  POStats,
  PrelovedItem,
  PrelovedStats,
  GoogleIntegrationSettings,
  GoogleAccountInfo
} from './types';

const TOKEN_KEY = 'hotel_it_token';
const SECRET_TOKEN_KEY = 'hotel_it_secret_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getStoredSecretToken(): string | null {
  return sessionStorage.getItem(SECRET_TOKEN_KEY);
}

export function setStoredSecretToken(token: string | null) {
  if (token) {
    sessionStorage.setItem(SECRET_TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(SECRET_TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  const token = getStoredToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const secretToken = getStoredSecretToken();
  if (secretToken) {
    headers.set('x-secret-token', secretToken);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errData = await response.json();
      errorMsg = errData.error || errData.message || errorMsg;
    } catch {
      errorMsg = response.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

// Authentication
export async function loginUser(username: string, password: string): Promise<{ token: string; user: UserAccount }> {
  const res = await request<{ token: string; user: UserAccount }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  setStoredToken(res.token);
  return res;
}

export async function getCurrentUser(): Promise<UserAccount> {
  const res = await request<{ user: UserAccount }>('/api/auth/me');
  return res.user;
}

export async function logoutUser(): Promise<void> {
  try {
    await request('/api/auth/logout', { method: 'POST' });
  } catch {
    // continue cleanup
  }
  setStoredToken(null);
  setStoredSecretToken(null);
}

// Secret Code & User Management
export async function verifySecretCode(secretCode: string): Promise<string> {
  const res = await request<{ success: boolean; secretToken: string }>('/api/auth/verify-secret', {
    method: 'POST',
    body: JSON.stringify({ secretCode })
  });
  setStoredSecretToken(res.secretToken);
  return res.secretToken;
}

export async function getUsersList(): Promise<UserAccount[]> {
  const res = await request<{ users: UserAccount[] }>('/api/users');
  return res.users;
}

export async function updateUserCredentials(id: string, username?: string, password?: string): Promise<{ message: string; user: UserAccount }> {
  return request<{ message: string; user: UserAccount }>(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ username, password })
  });
}

// Inventory
export interface InventoryResponse {
  data: InventoryItem[];
  total: number;
  page: number;
  totalPages: number;
}

export async function fetchInventory(filters: FilterOptions = {}, page = 1, limit = 50): Promise<InventoryResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.category && filters.category !== 'All') params.set('category', filters.category);
  if (filters.month && filters.month !== 'All') params.set('month', filters.month);
  if (filters.user && filters.user !== 'All Users') params.set('user', filters.user);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  params.set('page', page.toString());
  params.set('limit', limit.toString());

  return request<InventoryResponse>(`/api/inventory?${params.toString()}`);
}

export async function fetchRecentlyEdited(): Promise<InventoryItem[]> {
  const res = await request<{ data: InventoryItem[] }>('/api/inventory/recently-edited');
  return res.data;
}

export async function fetchStats(): Promise<InventoryStats> {
  return request<InventoryStats>('/api/inventory/stats');
}

export async function fetchRecentActivity(): Promise<ActivityRecord[]> {
  const res = await request<{ data: ActivityRecord[] }>('/api/inventory/recent-activity');
  return res.data;
}

export async function fetchInventoryItem(id: string): Promise<InventoryItem> {
  const res = await request<{ data: InventoryItem }>(`/api/inventory/${id}`);
  return res.data;
}

export async function createInventory(item: Partial<InventoryItem>): Promise<{ message: string; data: InventoryItem }> {
  return request<{ message: string; data: InventoryItem }>('/api/inventory', {
    method: 'POST',
    body: JSON.stringify(item)
  });
}

export async function updateInventory(id: string, item: Partial<InventoryItem>): Promise<{ message: string; data: InventoryItem }> {
  return request<{ message: string; data: InventoryItem }>(`/api/inventory/${id}`, {
    method: 'PUT',
    body: JSON.stringify(item)
  });
}

export async function deleteInventory(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/inventory/${id}`, {
    method: 'DELETE'
  });
}

// Upload photo
export async function uploadImageBase64(imageBase64: string): Promise<string> {
  const res = await request<{ url: string }>('/api/upload', {
    method: 'POST',
    body: JSON.stringify({ imageBase64 })
  });
  return res.url;
}

// Trigger Excel download
export async function downloadExcel(filters: FilterOptions = {}): Promise<void> {
  const params = new URLSearchParams();
  if (filters.month) params.set('month', filters.month);
  if (filters.category && filters.category !== 'All') params.set('category', filters.category);
  if (filters.user && filters.user !== 'All Users') params.set('user', filters.user);
  if (filters.search) params.set('search', filters.search);

  const token = getStoredToken();
  const url = `/api/export/excel?${params.toString()}`;

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  if (!res.ok) {
    throw new Error('Failed to generate Excel file.');
  }

  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;

  const contentDisposition = res.headers.get('content-disposition');
  let filename = 'HOTEL_IT_INVENTORY.xlsx';
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

// Purchase Orders API
export interface POResponse {
  data: PurchaseOrderItem[];
  total: number;
  page: number;
  totalPages: number;
}

export async function fetchPurchaseOrders(filters: POFilterOptions = {}, page = 1, limit = 50): Promise<POResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status && filters.status !== 'ALL') params.set('status', filters.status);
  if (filters.month && filters.month !== 'All') params.set('month', filters.month);
  if (filters.user && filters.user !== 'All Users') params.set('user', filters.user);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  params.set('page', page.toString());
  params.set('limit', limit.toString());

  return request<POResponse>(`/api/po?${params.toString()}`);
}

export async function fetchPOStats(): Promise<POStats> {
  return request<POStats>('/api/po/stats');
}

export async function fetchPurchaseOrderItem(id: string): Promise<PurchaseOrderItem> {
  const res = await request<{ data: PurchaseOrderItem }>(`/api/po/${id}`);
  return res.data;
}

export async function createPurchaseOrder(item: Partial<PurchaseOrderItem>): Promise<{ message: string; data: PurchaseOrderItem }> {
  return request<{ message: string; data: PurchaseOrderItem }>('/api/po', {
    method: 'POST',
    body: JSON.stringify(item)
  });
}

export async function updatePurchaseOrder(id: string, item: Partial<PurchaseOrderItem>): Promise<{ message: string; data: PurchaseOrderItem }> {
  return request<{ message: string; data: PurchaseOrderItem }>(`/api/po/${id}`, {
    method: 'PUT',
    body: JSON.stringify(item)
  });
}

export async function deletePurchaseOrder(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/po/${id}`, {
    method: 'DELETE'
  });
}

export async function downloadPOExcel(filters: POFilterOptions = {}): Promise<void> {
  const params = new URLSearchParams();
  if (filters.month) params.set('month', filters.month);
  if (filters.status && filters.status !== 'ALL') params.set('status', filters.status);
  if (filters.user && filters.user !== 'All Users') params.set('user', filters.user);
  if (filters.search) params.set('search', filters.search);

  const token = getStoredToken();
  const url = `/api/export/excel-po?${params.toString()}`;

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  if (!res.ok) {
    throw new Error('Failed to generate Purchase Order Excel file.');
  }

  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;

  const contentDisposition = res.headers.get('content-disposition');
  let filename = 'HOTEL_IT_PURCHASE_ORDER.xlsx';
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

// ==========================================
// Preloved API
// ==========================================

export interface PrelovedResponse {
  data: PrelovedItem[];
  total: number;
  page: number;
  totalPages: number;
}

export async function fetchPreloved(filters: FilterOptions = {}, page = 1, limit = 50): Promise<PrelovedResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.category && filters.category !== 'All') params.set('category', filters.category);
  if (filters.month && filters.month !== 'All') params.set('month', filters.month);
  if (filters.user && filters.user !== 'All Users') params.set('user', filters.user);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  params.set('page', page.toString());
  params.set('limit', limit.toString());

  return request<PrelovedResponse>(`/api/preloved?${params.toString()}`);
}

export async function fetchPrelovedStats(): Promise<PrelovedStats> {
  return request<PrelovedStats>('/api/preloved/stats');
}

export async function fetchPrelovedItem(id: string): Promise<PrelovedItem> {
  const res = await request<{ data: PrelovedItem }>(`/api/preloved/${id}`);
  return res.data;
}

export async function createPreloved(item: Partial<PrelovedItem>): Promise<{ message: string; data: PrelovedItem }> {
  return request<{ message: string; data: PrelovedItem }>('/api/preloved', {
    method: 'POST',
    body: JSON.stringify(item)
  });
}

export async function updatePreloved(id: string, item: Partial<PrelovedItem>): Promise<{ message: string; data: PrelovedItem }> {
  return request<{ message: string; data: PrelovedItem }>(`/api/preloved/${id}`, {
    method: 'PUT',
    body: JSON.stringify(item)
  });
}

export async function deletePreloved(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/preloved/${id}`, {
    method: 'DELETE'
  });
}

export async function downloadPrelovedExcel(filters: FilterOptions = {}): Promise<void> {
  const params = new URLSearchParams();
  if (filters.month) params.set('month', filters.month);
  if (filters.category && filters.category !== 'All') params.set('category', filters.category);
  if (filters.user && filters.user !== 'All Users') params.set('user', filters.user);
  if (filters.search) params.set('search', filters.search);

  const token = getStoredToken();
  const url = `/api/export/excel-preloved?${params.toString()}`;

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  if (!res.ok) {
    throw new Error('Failed to generate Preloved Excel file.');
  }

  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;

  const contentDisposition = res.headers.get('content-disposition');
  let filename = 'HOTEL_IT_PRELOVED.xlsx';
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

// ==========================================
// Google Spreadsheet & Drive Integration API
// ==========================================

export async function fetchGoogleSettings(): Promise<GoogleIntegrationSettings> {
  const res = await request<{ data: GoogleIntegrationSettings }>('/api/settings/google');
  return res.data;
}

export async function saveGoogleSettings(payload: {
  spreadsheetUrl: string;
  driveFolderUrl: string;
  autoSyncEnabled?: boolean;
}): Promise<{ message: string; data: GoogleIntegrationSettings }> {
  return request<{ message: string; data: GoogleIntegrationSettings }>('/api/settings/google', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function triggerServerAutoSync(options?: {
  accessToken?: string;
  reason?: string;
}): Promise<{ success: boolean; data?: GoogleIntegrationSettings }> {
  try {
    return await request<{ success: boolean; data?: GoogleIntegrationSettings }>(
      '/api/settings/google/trigger-auto-sync',
      {
        method: 'POST',
        body: JSON.stringify(options || {})
      }
    );
  } catch (err) {
    console.warn('triggerServerAutoSync failed:', err);
    return { success: false };
  }
}

export async function saveGoogleAccountConnection(payload: {
  account: GoogleAccountInfo;
  accessToken: string;
}): Promise<{ message: string; data: GoogleIntegrationSettings }> {
  return request<{ message: string; data: GoogleIntegrationSettings }>('/api/settings/google/connect', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function disconnectGoogleAccountApi(): Promise<{ message: string; data: GoogleIntegrationSettings }> {
  return request<{ message: string; data: GoogleIntegrationSettings }>('/api/settings/google/disconnect', {
    method: 'POST'
  });
}

export async function recordGoogleSyncStatus(payload: {
  status: 'success' | 'failed' | 'in_progress';
  message: string;
  syncedInventoryCount?: number;
  syncedPOCount?: number;
  syncedPrelovedCount?: number;
  syncedCount?: number;
}): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/api/settings/google/sync-status', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function syncUpdatedInventoryItemsToServer(items: InventoryItem[]): Promise<void> {
  await request('/api/settings/google/sync-items', {
    method: 'POST',
    body: JSON.stringify({ items })
  });
}

export async function syncUpdatedPOItemsToServer(items: PurchaseOrderItem[]): Promise<void> {
  await request('/api/settings/google/sync-po-items', {
    method: 'POST',
    body: JSON.stringify({ items })
  });
}

export async function syncUpdatedPrelovedItemsToServer(items: PrelovedItem[]): Promise<void> {
  await request('/api/settings/google/sync-preloved-items', {
    method: 'POST',
    body: JSON.stringify({ items })
  });
}




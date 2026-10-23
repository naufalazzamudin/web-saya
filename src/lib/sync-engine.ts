import fs from 'fs';
import path from 'path';
import type { InventoryItem, PurchaseOrderItem, ActivityRecord } from './types';
import {
  ServerSheetConfig,
  getSpreadsheetDetailsServer,
  resolveServerSheetNames,
  upsertInventoryItemServer,
  deleteInventoryItemServer,
  upsertPOItemServer,
  deletePOItemServer,
  pullAllFromGoogleSheetsServer,
  REQUIRED_SPREADSHEET_NAME
} from './server-sheets';

export interface SyncJob {
  id: string;
  type: 'upsert_inventory' | 'delete_inventory' | 'upsert_po' | 'delete_po' | 'pull_external_changes';
  payload?: any;
  retries: number;
  maxRetries: number;
  addedAt: number;
}

export class SyncEngine {
  private getDBCache: () => any;
  private saveDB: (data: any) => void;
  private uploadsDir: string;
  private queue: SyncJob[] = [];
  private isProcessing = false;
  private dataVersion = 1;
  private pollerTimer: NodeJS.Timeout | null = null;
  // Track last pushed timestamps to prevent echo/feedback loops
  private lastWrittenTimestamps = new Map<string, string>();

  constructor(getDBCache: () => any, saveDB: (data: any) => void, uploadsDir: string) {
    this.getDBCache = getDBCache;
    this.saveDB = saveDB;
    this.uploadsDir = uploadsDir;
  }

  public getDataVersion(): number {
    return this.dataVersion;
  }

  public incrementDataVersion(): void {
    this.dataVersion++;
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public getSanitizedConfig(): ServerSheetConfig & { hasGoogleAuth: boolean; pendingCount: number } {
    const db = this.getDBCache();
    const cfg = db.sheetConfig || {
      isEnabled: false,
      spreadsheetUrl: '',
      spreadsheetId: '',
      spreadsheetTitle: '',
      lastSyncTime: null,
      syncStatus: 'pending',
      syncError: null,
      connectedGoogleEmail: null,
      connectedGoogleName: null,
      connectedGooglePhoto: null,
      googleAccessToken: null
    };

    return {
      spreadsheetUrl: cfg.spreadsheetUrl || '',
      spreadsheetId: cfg.spreadsheetId || '',
      spreadsheetTitle: cfg.spreadsheetTitle || '',
      isEnabled: Boolean(cfg.isEnabled),
      lastSyncTime: cfg.lastSyncTime || null,
      syncStatus: cfg.syncStatus || 'pending',
      syncError: cfg.syncError || null,
      connectedGoogleEmail: cfg.connectedGoogleEmail || null,
      connectedGoogleName: cfg.connectedGoogleName || null,
      connectedGooglePhoto: cfg.connectedGooglePhoto || null,
      hasGoogleAuth: Boolean(cfg.googleAccessToken),
      pendingCount: this.queue.length,
      updatedBy: cfg.updatedBy || null,
      updatedAt: cfg.updatedAt || null
    };
  }

  /**
   * Enqueue a sync job for sequential asynchronous execution
   */
  public enqueue(type: SyncJob['type'], payload?: any): void {
    // If deduplicating consecutive upserts for same item, update payload
    if (type === 'upsert_inventory' && payload?.id) {
      const existing = this.queue.find(j => j.type === 'upsert_inventory' && j.payload?.id === payload.id);
      if (existing) {
        existing.payload = payload;
        existing.retries = 0;
        this.processQueue();
        return;
      }
    } else if (type === 'upsert_po' && payload?.id) {
      const existing = this.queue.find(j => j.type === 'upsert_po' && j.payload?.id === payload.id);
      if (existing) {
        existing.payload = payload;
        existing.retries = 0;
        this.processQueue();
        return;
      }
    }

    const job: SyncJob = {
      id: `job-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      payload,
      retries: 0,
      maxRetries: 3,
      addedAt: Date.now()
    };

    this.queue.push(job);

    const db = this.getDBCache();
    if (db.sheetConfig) {
      db.sheetConfig.syncStatus = 'syncing';
    }

    this.processQueue();
  }

  /**
   * Process jobs sequentially with retry & backoff
   */
  public async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        const job = this.queue[0];
        const db = this.getDBCache();
        const config: ServerSheetConfig = db.sheetConfig;

        if (!config || !config.isEnabled || !config.spreadsheetId) {
          // Sheets integration is not active or not configured
          this.queue.shift();
          continue;
        }

        if (!config.googleAccessToken) {
          // Token is missing: set pending status
          config.syncStatus = 'pending';
          config.syncError = 'Akun Google belum terhubung pada server. Administrator perlu menghubungkan Akun Google di Pengaturan.';
          this.saveDB(db);
          break; // Stop until Google Account is connected
        }

        try {
          // Resolve sheet names
          const details = await getSpreadsheetDetailsServer(config.spreadsheetId, config.googleAccessToken);
          const { invSheet, poSheet } = resolveServerSheetNames(details.sheets);

          if (job.type === 'upsert_inventory') {
            const item: InventoryItem = job.payload;
            await upsertInventoryItemServer(
              config.spreadsheetId,
              config.googleAccessToken,
              item,
              invSheet,
              this.uploadsDir
            );
            this.lastWrittenTimestamps.set(`inv_${item.id}`, item.updatedAt);
          } else if (job.type === 'delete_inventory') {
            const itemId: string = typeof job.payload === 'object' ? job.payload.id : job.payload;
            await deleteInventoryItemServer(config.spreadsheetId, config.googleAccessToken, itemId, invSheet);
            this.lastWrittenTimestamps.delete(`inv_${itemId}`);
          } else if (job.type === 'upsert_po') {
            const po: PurchaseOrderItem = job.payload;
            await upsertPOItemServer(
              config.spreadsheetId,
              config.googleAccessToken,
              po,
              poSheet,
              this.uploadsDir
            );
            this.lastWrittenTimestamps.set(`po_${po.id}`, po.updatedAt);
          } else if (job.type === 'delete_po') {
            const poId: string = typeof job.payload === 'object' ? job.payload.id : job.payload;
            await deletePOItemServer(config.spreadsheetId, config.googleAccessToken, poId, poSheet);
            this.lastWrittenTimestamps.delete(`po_${poId}`);
          } else if (job.type === 'pull_external_changes') {
            await this.executePullExternalChanges(config, invSheet, poSheet);
          }

          // Job succeeded: remove from queue
          this.queue.shift();

          // Update status
          config.syncStatus = this.queue.length > 0 ? 'syncing' : 'synced';
          config.syncError = null;
          config.lastSyncTime = new Date().toISOString();
          this.saveDB(db);
        } catch (err: any) {
          console.warn(`Sync job ${job.id} (${job.type}) error (attempt ${job.retries + 1}):`, err?.message || err);

          const isAuthError =
            err?.message?.includes('401') ||
            err?.message?.includes('403') ||
            err?.message?.toLowerCase().includes('unauthenticated') ||
            err?.message?.toLowerCase().includes('token');

          if (isAuthError) {
            config.syncStatus = 'failed';
            config.syncError = 'Sesi Akun Google kedaluwarsa. Administrator perlu menyambungkan ulang Akun Google.';
            this.saveDB(db);
            // Do not spin forever on 401
            break;
          }

          job.retries++;
          if (job.retries < job.maxRetries) {
            // Exponential backoff wait (e.g. 2s, 6s)
            const backoffMs = job.retries * 2000;
            config.syncStatus = 'syncing';
            config.syncError = `Percobaan ulang sinkronisasi (${job.retries}/${job.maxRetries})...`;
            this.saveDB(db);

            await new Promise(r => setTimeout(r, backoffMs));
          } else {
            // Failed after max retries
            this.queue.shift();
            config.syncStatus = 'failed';
            config.syncError = err?.message || 'Gagal menyinkronkan data ke Google Sheets';
            this.saveDB(db);
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Bidirectional sync: Pull changes made directly in Google Sheets into Web App
   */
  private async executePullExternalChanges(
    config: ServerSheetConfig,
    invSheet: string,
    poSheet: string
  ): Promise<void> {
    if (!config.spreadsheetId || !config.googleAccessToken) return;

    const { inventory: remoteInv, purchaseOrders: remotePO } = await pullAllFromGoogleSheetsServer(
      config.spreadsheetId,
      config.googleAccessToken,
      invSheet,
      poSheet
    );

    const db = this.getDBCache();
    let hasLocalChanges = false;
    const nowIso = new Date().toISOString();

    // 1. Process Inventory
    for (const rItem of remoteInv) {
      if (!rItem.id || !rItem.itemName) continue;

      const localIdx = db.inventory.findIndex((i: InventoryItem) => i.id === rItem.id);

      if (localIdx === -1) {
        // Brand new row added directly in Google Sheets
        db.inventory.unshift(rItem);
        hasLocalChanges = true;

        const act: ActivityRecord = {
          id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          inventoryId: rItem.id,
          itemName: rItem.itemName,
          category: rItem.category,
          action: 'Added',
          username: rItem.updatedBy || 'Google Sheets',
          timestamp: nowIso
        };
        db.activities.unshift(act);
      } else {
        const local = db.inventory[localIdx];
        // Compare values
        const isContentDifferent =
          local.itemName !== rItem.itemName ||
          local.category !== rItem.category ||
          local.dateRepaired !== rItem.dateRepaired ||
          (local.serialNumber || '') !== (rItem.serialNumber || '') ||
          (local.remark || '') !== (rItem.remark || '') ||
          (rItem.photoUrl && !local.photoUrl.startsWith('data:') && local.photoUrl !== rItem.photoUrl);

        if (isContentDifferent) {
          // Check if this was just written by us (avoiding feedback loop)
          const lastWritten = this.lastWrittenTimestamps.get(`inv_${rItem.id}`);
          if (!lastWritten || lastWritten !== rItem.updatedAt) {
            db.inventory[localIdx] = {
              ...local,
              ...rItem,
              updatedAt: rItem.updatedAt || nowIso
            };
            hasLocalChanges = true;

            const act: ActivityRecord = {
              id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              inventoryId: rItem.id,
              itemName: rItem.itemName,
              category: rItem.category,
              action: 'Edited',
              username: rItem.updatedBy || 'Google Sheets',
              timestamp: nowIso
            };
            db.activities.unshift(act);
          }
        }
      }
    }

    // 2. Process Purchase Orders
    for (const rPO of remotePO) {
      if (!rPO.id || !rPO.itemName) continue;

      const localIdx = (db.purchaseOrders || []).findIndex((p: PurchaseOrderItem) => p.id === rPO.id);

      if (localIdx === -1) {
        // Brand new PO added directly in Google Sheets
        db.purchaseOrders.unshift(rPO);
        hasLocalChanges = true;

        const act: ActivityRecord = {
          id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          targetId: rPO.id,
          itemName: rPO.itemName,
          category: 'PURCHASE ORDER',
          type: 'PURCHASE ORDER',
          action: 'Added',
          username: rPO.updatedBy || 'Google Sheets',
          timestamp: nowIso
        };
        db.activities.unshift(act);
      } else {
        const local = db.purchaseOrders[localIdx];
        const isContentDifferent =
          local.itemName !== rPO.itemName ||
          local.dateOrder !== rPO.dateOrder ||
          (local.dateArrival || '') !== (rPO.dateArrival || '') ||
          local.quantity !== rPO.quantity ||
          local.forUse !== rPO.forUse ||
          local.status !== rPO.status ||
          (local.remarks || '') !== (rPO.remarks || '');

        if (isContentDifferent) {
          const lastWritten = this.lastWrittenTimestamps.get(`po_${rPO.id}`);
          if (!lastWritten || lastWritten !== rPO.updatedAt) {
            db.purchaseOrders[localIdx] = {
              ...local,
              ...rPO,
              updatedAt: rPO.updatedAt || nowIso
            };
            hasLocalChanges = true;

            const act: ActivityRecord = {
              id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              targetId: rPO.id,
              itemName: rPO.itemName,
              category: 'PURCHASE ORDER',
              type: 'PURCHASE ORDER',
              action: 'Edited',
              username: rPO.updatedBy || 'Google Sheets',
              timestamp: nowIso
            };
            db.activities.unshift(act);
          }
        }
      }
    }

    if (hasLocalChanges) {
      this.incrementDataVersion();
      this.saveDB(db);
    }
  }

  /**
   * Start recurring background polling for external changes in Google Sheets
   */
  public startBackgroundPoller(intervalMs: number = 25000): void {
    if (this.pollerTimer) {
      clearInterval(this.pollerTimer);
    }

    this.pollerTimer = setInterval(() => {
      const db = this.getDBCache();
      if (
        db.sheetConfig?.isEnabled &&
        db.sheetConfig?.spreadsheetId &&
        db.sheetConfig?.googleAccessToken &&
        this.queue.length === 0 &&
        !this.isProcessing
      ) {
        this.enqueue('pull_external_changes');
      }
    }, intervalMs);
  }
}

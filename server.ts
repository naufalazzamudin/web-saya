import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import ExcelJS from 'exceljs';
import type { InventoryItem, PurchaseOrderItem, PrelovedItem, UserAccount, ActivityRecord, Category } from './src/lib/types';
import { isDateRepairedInMonth, parseMonthFilter, filterInventory, sortInventory, computeStats, MONTH_NAMES, formatDate, formatDateTime } from './src/lib/inventory-logic';
import { filterPurchaseOrders, sortPurchaseOrders, computePOStats } from './src/lib/po-logic';
import { filterPreloved, sortPreloved, computePrelovedStats } from './src/lib/preloved-logic';
import { extractGoogleSpreadsheetId, extractGoogleDriveFolderId, buildSpreadsheetValues, buildPOSpreadsheetValues, buildPrelovedSpreadsheetValues } from './src/lib/google-logic';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// In-memory sessions
const activeSessions = new Map<string, { user: UserAccount; expiresAt: number }>();
const secretTokens = new Set<string>();

export interface GoogleIntegrationData {
  spreadsheetUrl: string;
  spreadsheetId: string;
  driveFolderUrl: string;
  driveFolderId: string;
  connectedAccount: {
    email: string;
    name: string;
    photoUrl?: string;
    connectedAt: string;
    connectedBy: string;
  } | null;
  cachedAccessToken?: string | null;
  lastSyncedAt?: string | null;
  lastSyncStatus?: 'idle' | 'success' | 'failed' | 'in_progress' | null;
  lastSyncMessage?: string | null;
  syncedInventoryCount?: number;
  syncedPOCount?: number;
  syncedPrelovedCount?: number;
  autoSyncEnabled?: boolean;
}

interface DBData {
  users: Array<UserAccount & { passwordHash: string }>;
  inventory: InventoryItem[];
  purchaseOrders: PurchaseOrderItem[];
  preloved: PrelovedItem[];
  activities: ActivityRecord[];
  googleIntegration?: GoogleIntegrationData;
}

// Helper to create sample SVG placeholder images
function createSampleSvg(title: string, category: string, color: string): string {
  const shortTitle = title.length > 20 ? title.substring(0, 18) + '...' : title;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <rect width="400" height="300" fill="${color}" rx="20"/>
    <rect x="15" y="15" width="370" height="270" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2" rx="14"/>
    <circle cx="200" cy="115" r="42" fill="rgba(255,255,255,0.1)"/>
    <text x="200" y="125" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" fill="#ffffff" text-anchor="middle">IT</text>
    <text x="200" y="188" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" fill="#ffffff" text-anchor="middle">${shortTitle}</text>
    <text x="200" y="216" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="rgba(255,255,255,0.75)" text-anchor="middle" letter-spacing="1">${category}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// Initialize seed DB
function initDB(): DBData {
  if (fs.existsSync(DB_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      if (parsed.users && parsed.inventory) {
        if (!parsed.purchaseOrders) {
          parsed.purchaseOrders = [];
        }
        if (!parsed.preloved) {
          parsed.preloved = [];
        }
        if (!parsed.googleIntegration) {
          parsed.googleIntegration = {
            spreadsheetUrl: '',
            spreadsheetId: '',
            driveFolderUrl: '',
            driveFolderId: '',
            connectedAccount: null,
            cachedAccessToken: null,
            lastSyncedAt: null,
            lastSyncStatus: 'idle',
            lastSyncMessage: null,
            syncedInventoryCount: 0,
            syncedPOCount: 0,
            syncedPrelovedCount: 0,
            autoSyncEnabled: true
          };
        } else {
          if (parsed.googleIntegration.autoSyncEnabled === undefined) {
            parsed.googleIntegration.autoSyncEnabled = true;
          }
          if (parsed.googleIntegration.syncedPOCount === undefined) {
            parsed.googleIntegration.syncedPOCount = 0;
          }
          if (parsed.googleIntegration.syncedPrelovedCount === undefined) {
            parsed.googleIntegration.syncedPrelovedCount = 0;
          }
        }
        for (const item of parsed.inventory || []) {
          if (item.quantity === undefined) item.quantity = 1;
        }
        for (const item of parsed.preloved || []) {
          if (item.quantity === undefined) item.quantity = 1;
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error reading DB, re-seeding...', e);
    }
  }

  const salt = bcrypt.genSaltSync(10);
  const initialUsers: Array<UserAccount & { passwordHash: string }> = [
    {
      id: 'usr-1',
      username: 'ITMANAGER',
      passwordHash: bcrypt.hashSync('syah', salt),
      role: 'IT MANAGER',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'usr-2',
      username: 'ITASSIST',
      passwordHash: bcrypt.hashSync('ihsan', salt),
      role: 'IT ASSIST',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'usr-3',
      username: 'ITTRAINEE',
      passwordHash: bcrypt.hashSync('andi', salt),
      role: 'IT TRAINEE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    }
  ];

  const samplePurchaseOrders: PurchaseOrderItem[] = [
    {
      id: 'po-201',
      itemName: 'Patch Cord Cat6 2M (50 pcs)',
      photoUrl: createSampleSvg('Cat6 Patch Cord', 'NETWORK ITEMS', '#0369a1'),
      dateOrder: '2026-10-02',
      dateArrival: '2026-10-06',
      quantity: 50,
      forUse: 'Housekeeping & Guest Rooms AP Replacement',
      remarks: 'Delivered by supplier, stored in IT storage rack',
      status: 'SUDAH DATANG',
      createdAt: '2026-10-02T08:00:00Z',
      createdBy: 'ITASSIST',
      updatedAt: '2026-10-06T11:00:00Z',
      updatedBy: 'ITMANAGER'
    },
    {
      id: 'po-202',
      itemName: 'Dell Pro Wireless Keyboard & Mouse (10 sets)',
      photoUrl: createSampleSvg('Dell KM Wireless', 'PC ITEMS', '#1e293b'),
      dateOrder: '2026-10-10',
      dateArrival: null,
      quantity: 10,
      forUse: 'Front Office Reception & Sales Office',
      remarks: 'Waiting for delivery from distributor Jakarta',
      status: 'BELUM DATANG',
      createdAt: '2026-10-10T09:30:00Z',
      createdBy: 'ITMANAGER',
      updatedAt: '2026-10-10T09:30:00Z',
      updatedBy: 'ITMANAGER'
    },
    {
      id: 'po-203',
      itemName: 'Ubiquiti UniFi U6-Lite Access Point (4 units)',
      photoUrl: createSampleSvg('UniFi U6-Lite AP', 'NETWORK ITEMS', '#0284c7'),
      dateOrder: '2026-08-18',
      dateArrival: '2026-08-25',
      quantity: 4,
      forUse: 'Grand Ballroom Wi-Fi Density Upgrade',
      remarks: 'Approved by GM, installed and operational',
      status: 'SUDAH DATANG',
      createdAt: '2026-08-18T14:00:00Z',
      createdBy: 'ITTRAINEE',
      updatedAt: '2026-08-25T16:00:00Z',
      updatedBy: 'ITASSIST'
    },
    {
      id: 'po-204',
      itemName: 'Hikvision 8-Port PoE Gigabit Switch (2 units)',
      photoUrl: createSampleSvg('Hikvision PoE Switch', 'CCTV & TV ITEMS', '#155e75'),
      dateOrder: '2026-10-12',
      dateArrival: null,
      quantity: 2,
      forUse: 'CCTV Parking Area Extension',
      remarks: 'Vendor estimated delivery 3 working days',
      status: 'BELUM DATANG',
      createdAt: '2026-10-12T13:10:00Z',
      createdBy: 'ITTRAINEE',
      updatedAt: '2026-10-12T13:10:00Z',
      updatedBy: 'ITTRAINEE'
    }
  ];

  const sampleInventory: InventoryItem[] = [
    {
      id: 'inv-101',
      itemName: 'Dell OptiPlex 7090 Micro PC',
      photoUrl: createSampleSvg('Dell OptiPlex 7090', 'PC ITEMS', '#1e293b'),
      category: 'PC ITEMS',
      dateRepaired: '2026-10-05',
      serialNumber: 'SN-DELL-7090-X1',
      remark: 'ex Front Office',
      createdAt: '2026-10-05T08:30:00Z',
      createdBy: 'ITMANAGER',
      updatedAt: '2026-10-08T14:35:00Z',
      updatedBy: 'ITASSIST'
    },
    {
      id: 'inv-102',
      itemName: 'HP ProDesk 600 G4 SFF',
      photoUrl: createSampleSvg('HP ProDesk 600', 'PC ITEMS', '#0f172a'),
      category: 'PC ITEMS',
      dateRepaired: '2026-08-14',
      serialNumber: 'CZC8423L12',
      remark: 'ex Room 402',
      createdAt: '2026-08-14T10:15:00Z',
      createdBy: 'ITMANAGER',
      updatedAt: '2026-08-14T10:15:00Z',
      updatedBy: 'ITMANAGER'
    },
    {
      id: 'inv-103',
      itemName: 'Cisco Catalyst 2960-X 48-Port Switch',
      photoUrl: createSampleSvg('Cisco 2960-X Switch', 'NETWORK ITEMS', '#1e3a8a'),
      category: 'NETWORK ITEMS',
      dateRepaired: '2026-08-20',
      serialNumber: 'FCZ2049B3100',
      remark: 'ex Server Room Rack 2',
      createdAt: '2026-08-20T11:00:00Z',
      createdBy: 'ITASSIST',
      updatedAt: '2026-08-20T11:00:00Z',
      updatedBy: 'ITASSIST'
    },
    {
      id: 'inv-104',
      itemName: 'Ubiquiti UniFi AP AC Pro',
      photoUrl: createSampleSvg('UniFi AP AC Pro', 'NETWORK ITEMS', '#0284c7'),
      category: 'NETWORK ITEMS',
      dateRepaired: '2026-09-12',
      serialNumber: '18E829F01234',
      remark: 'ex Grand Ballroom',
      createdAt: '2026-09-12T09:40:00Z',
      createdBy: 'ITTRAINEE',
      updatedAt: '2026-09-15T13:20:00Z',
      updatedBy: 'ITASSIST'
    },
    {
      id: 'inv-105',
      itemName: 'Hikvision DS-2CD2143G2-I 4MP Dome CCTV',
      photoUrl: createSampleSvg('Hikvision Dome CCTV', 'CCTV & TV ITEMS', '#155e75'),
      category: 'CCTV & TV ITEMS',
      dateRepaired: '2026-10-08',
      serialNumber: 'HK-DS2143-889',
      remark: 'ex CCTV Parking Lobby',
      createdAt: '2026-10-08T15:20:00Z',
      createdBy: 'ITTRAINEE',
      updatedAt: '2026-10-08T15:20:00Z',
      updatedBy: 'ITTRAINEE'
    },
    {
      id: 'inv-106',
      itemName: 'Samsung 55" Hospitality 4K UHD TV (HG55AU800)',
      photoUrl: createSampleSvg('Samsung 55 Hospitality TV', 'CCTV & TV ITEMS', '#312e81'),
      category: 'CCTV & TV ITEMS',
      dateRepaired: '2026-08-28',
      serialNumber: '08143CEN100234B',
      remark: 'ex Executive Suite 801',
      createdAt: '2026-08-28T16:00:00Z',
      createdBy: 'ITMANAGER',
      updatedAt: '2026-08-28T16:00:00Z',
      updatedBy: 'ITMANAGER'
    }
  ];

  const initialActivities: ActivityRecord[] = [
    {
      id: 'act-1',
      inventoryId: 'inv-101',
      itemName: 'Dell OptiPlex 7090 Micro PC',
      category: 'PC ITEMS',
      action: 'Edited',
      username: 'ITASSIST',
      timestamp: '2026-10-08T14:35:00Z'
    },
    {
      id: 'act-2',
      inventoryId: 'inv-105',
      itemName: 'Hikvision DS-2CD2143G2-I 4MP Dome CCTV',
      category: 'CCTV & TV ITEMS',
      action: 'Added',
      username: 'ITTRAINEE',
      timestamp: '2026-10-08T15:20:00Z'
    },
    {
      id: 'act-3',
      inventoryId: 'inv-104',
      itemName: 'Ubiquiti UniFi AP AC Pro',
      category: 'NETWORK ITEMS',
      action: 'Edited',
      username: 'ITASSIST',
      timestamp: '2026-09-15T13:20:00Z'
    }
  ];

  const samplePreloved: PrelovedItem[] = [
    {
      id: 'prev-301',
      itemName: 'HP ProDesk 400 G6 Micro Desktop (i5/16GB)',
      photoUrl: createSampleSvg('HP ProDesk G6', 'PC ITEMS', '#7c3aed'),
      category: 'PC ITEMS',
      dateRepaired: '2026-10-04',
      serialNumber: 'HP-PD400-9921',
      remark: 'ex Front Desk Backoffice, hard drive wiped & refurbished',
      createdAt: '2026-10-04T10:15:00Z',
      createdBy: 'ITMANAGER',
      updatedAt: '2026-10-04T10:15:00Z',
      updatedBy: 'ITMANAGER'
    },
    {
      id: 'prev-302',
      itemName: 'Cisco Catalyst 2960-X 24-Port Switch',
      photoUrl: createSampleSvg('Cisco 2960X Switch', 'NETWORK ITEMS', '#6d28d9'),
      category: 'NETWORK ITEMS',
      dateRepaired: '2026-09-18',
      serialNumber: 'FOC1829Z12X',
      remark: 'ex Banquet Hall Rack, fully tested & reset to factory',
      createdAt: '2026-09-18T14:20:00Z',
      createdBy: 'ITASSIST',
      updatedAt: '2026-09-18T14:20:00Z',
      updatedBy: 'ITASSIST'
    },
    {
      id: 'prev-303',
      itemName: 'Hikvision DS-2CD2043G0-I 4MP Bullet Camera',
      photoUrl: createSampleSvg('Hikvision Bullet 4MP', 'CCTV & TV ITEMS', '#5b21b6'),
      category: 'CCTV & TV ITEMS',
      dateRepaired: '2026-10-11',
      serialNumber: 'HK-CAM-BULLET-771',
      remark: 'ex Kitchen Service Corridor, cleaned & operational',
      createdAt: '2026-10-11T09:45:00Z',
      createdBy: 'ITTRAINEE',
      updatedAt: '2026-10-11T09:45:00Z',
      updatedBy: 'ITTRAINEE'
    }
  ];

  const db: DBData = {
    users: initialUsers,
    inventory: sampleInventory,
    purchaseOrders: samplePurchaseOrders,
    preloved: samplePreloved,
    activities: initialActivities,
    googleIntegration: {
      spreadsheetUrl: '',
      spreadsheetId: '',
      driveFolderUrl: '',
      driveFolderId: '',
      connectedAccount: null,
      cachedAccessToken: null,
      lastSyncedAt: null,
      lastSyncStatus: 'idle',
      lastSyncMessage: null,
      syncedInventoryCount: 0,
      syncedPOCount: 0,
      syncedPrelovedCount: 0,
      autoSyncEnabled: true
    }
  };

  const tempPath = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tempPath, DB_FILE);
  return db;
}

let dbCache: DBData = initDB();
if (!dbCache.purchaseOrders || dbCache.purchaseOrders.length === 0) {
  // Ensure existing database files receive sample PO data
  dbCache.purchaseOrders = [
    {
      id: 'po-201',
      itemName: 'Patch Cord Cat6 2M (50 pcs)',
      photoUrl: createSampleSvg('Cat6 Patch Cord', 'NETWORK ITEMS', '#0369a1'),
      dateOrder: '2026-10-02',
      dateArrival: '2026-10-06',
      quantity: 50,
      forUse: 'Housekeeping & Guest Rooms AP Replacement',
      remarks: 'Delivered by supplier, stored in IT storage rack',
      status: 'SUDAH DATANG',
      createdAt: '2026-10-02T08:00:00Z',
      createdBy: 'ITASSIST',
      updatedAt: '2026-10-06T11:00:00Z',
      updatedBy: 'ITMANAGER'
    },
    {
      id: 'po-202',
      itemName: 'Dell Pro Wireless Keyboard & Mouse (10 sets)',
      photoUrl: createSampleSvg('Dell KM Wireless', 'PC ITEMS', '#1e293b'),
      dateOrder: '2026-10-10',
      dateArrival: null,
      quantity: 10,
      forUse: 'Front Office Reception & Sales Office',
      remarks: 'Waiting for delivery from distributor Jakarta',
      status: 'BELUM DATANG',
      createdAt: '2026-10-10T09:30:00Z',
      createdBy: 'ITMANAGER',
      updatedAt: '2026-10-10T09:30:00Z',
      updatedBy: 'ITMANAGER'
    },
    {
      id: 'po-203',
      itemName: 'Ubiquiti UniFi U6-Lite Access Point (4 units)',
      photoUrl: createSampleSvg('UniFi U6-Lite AP', 'NETWORK ITEMS', '#0284c7'),
      dateOrder: '2026-08-18',
      dateArrival: '2026-08-25',
      quantity: 4,
      forUse: 'Grand Ballroom Wi-Fi Density Upgrade',
      remarks: 'Approved by GM, installed and operational',
      status: 'SUDAH DATANG',
      createdAt: '2026-08-18T14:00:00Z',
      createdBy: 'ITTRAINEE',
      updatedAt: '2026-08-25T16:00:00Z',
      updatedBy: 'ITASSIST'
    },
    {
      id: 'po-204',
      itemName: 'Hikvision 8-Port PoE Gigabit Switch (2 units)',
      photoUrl: createSampleSvg('Hikvision PoE Switch', 'CCTV & TV ITEMS', '#155e75'),
      dateOrder: '2026-10-12',
      dateArrival: null,
      quantity: 2,
      forUse: 'CCTV Parking Area Extension',
      remarks: 'Vendor estimated delivery 3 working days',
      status: 'BELUM DATANG',
      createdAt: '2026-10-12T13:10:00Z',
      createdBy: 'ITTRAINEE',
      updatedAt: '2026-10-12T13:10:00Z',
      updatedBy: 'ITTRAINEE'
    }
  ];
  saveDB(dbCache);
}

if (!dbCache.preloved || dbCache.preloved.length === 0) {
  dbCache.preloved = [
    {
      id: 'prev-301',
      itemName: 'HP ProDesk 400 G6 Micro Desktop (i5/16GB)',
      photoUrl: createSampleSvg('HP ProDesk G6', 'PC ITEMS', '#7c3aed'),
      category: 'PC ITEMS',
      dateRepaired: '2026-10-04',
      serialNumber: 'HP-PD400-9921',
      remark: 'ex Front Desk Backoffice, hard drive wiped & refurbished',
      createdAt: '2026-10-04T10:15:00Z',
      createdBy: 'ITMANAGER',
      updatedAt: '2026-10-04T10:15:00Z',
      updatedBy: 'ITMANAGER'
    },
    {
      id: 'prev-302',
      itemName: 'Cisco Catalyst 2960-X 24-Port Switch',
      photoUrl: createSampleSvg('Cisco 2960X Switch', 'NETWORK ITEMS', '#6d28d9'),
      category: 'NETWORK ITEMS',
      dateRepaired: '2026-09-18',
      serialNumber: 'FOC1829Z12X',
      remark: 'ex Banquet Hall Rack, fully tested & reset to factory',
      createdAt: '2026-09-18T14:20:00Z',
      createdBy: 'ITASSIST',
      updatedAt: '2026-09-18T14:20:00Z',
      updatedBy: 'ITASSIST'
    },
    {
      id: 'prev-303',
      itemName: 'Hikvision DS-2CD2043G0-I 4MP Bullet Camera',
      photoUrl: createSampleSvg('Hikvision Bullet 4MP', 'CCTV & TV ITEMS', '#5b21b6'),
      category: 'CCTV & TV ITEMS',
      dateRepaired: '2026-10-11',
      serialNumber: 'HK-CAM-BULLET-771',
      remark: 'ex Kitchen Service Corridor, cleaned & operational',
      createdAt: '2026-10-11T09:45:00Z',
      createdBy: 'ITTRAINEE',
      updatedAt: '2026-10-11T09:45:00Z',
      updatedBy: 'ITTRAINEE'
    }
  ];
  saveDB(dbCache);
}

if (!dbCache.googleIntegration) {
  dbCache.googleIntegration = {
    spreadsheetUrl: '',
    spreadsheetId: '',
    driveFolderUrl: '',
    driveFolderId: '',
    connectedAccount: null,
    cachedAccessToken: null,
    lastSyncedAt: null,
    lastSyncStatus: 'idle',
    lastSyncMessage: null,
    syncedInventoryCount: 0,
    syncedPOCount: 0,
    syncedPrelovedCount: 0,
    autoSyncEnabled: true
  };
  saveDB(dbCache);
} else {
  if (dbCache.googleIntegration.autoSyncEnabled === undefined) {
    dbCache.googleIntegration.autoSyncEnabled = true;
  }
  if (dbCache.googleIntegration.syncedPOCount === undefined) {
    dbCache.googleIntegration.syncedPOCount = 0;
  }
  if (dbCache.googleIntegration.syncedPrelovedCount === undefined) {
    dbCache.googleIntegration.syncedPrelovedCount = 0;
  }
}

function saveDB(data: DBData) {
  dbCache = data;
  const tempPath = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempPath, DB_FILE);
}

// Background Auto-Sync functions for Google Drive & Spreadsheet
async function uploadServerPhotoToDrive(
  accessToken: string,
  folderId: string,
  fileName: string,
  photoUrl: string
): Promise<string | null> {
  let buffer: Buffer | null = null;
  let mimeType = 'image/jpeg';

  if (photoUrl.startsWith('data:')) {
    const match = photoUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      buffer = Buffer.from(match[2], 'base64');
    }
  } else if (photoUrl.startsWith('/uploads/')) {
    const filename = photoUrl.replace(/^\/uploads\//, '');
    const localPath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(localPath)) {
      buffer = fs.readFileSync(localPath);
      mimeType = localPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    }
  }

  if (!buffer) return null;

  const ext = mimeType.includes('png') ? 'png' : mimeType.includes('svg') ? 'svg' : 'jpg';
  const cleanName = `${fileName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.${ext}`;
  const metadata = { name: cleanName, parents: [folderId], mimeType };
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metaPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
  const mediaHeader = `${delimiter}Content-Type: ${mimeType}\r\n\r\n`;

  const metaBuffer = Buffer.from(metaPart);
  const mediaHeaderBuffer = Buffer.from(mediaHeader);
  const closeBuffer = Buffer.from(closeDelimiter);

  const fullBody = Buffer.concat([metaBuffer, mediaHeaderBuffer, buffer, closeBuffer]);

  try {
    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: fullBody
      }
    );

    if (!uploadRes.ok) return null;
    const data = await uploadRes.json();
    const fileId = data.id;

    // Set permission to anyone with link can view
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'reader', type: 'anyone' })
    }).catch(() => {});

    return data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
  } catch (e) {
    console.warn('uploadServerPhotoToDrive error:', e);
    return null;
  }
}

async function triggerAutoSync(reason?: string) {
  const g = dbCache.googleIntegration;
  if (!g || !g.spreadsheetId || !g.driveFolderId || !g.cachedAccessToken || g.autoSyncEnabled === false) {
    return;
  }

  try {
    const accessToken = g.cachedAccessToken;
    const spreadsheetId = g.spreadsheetId;
    const driveFolderId = g.driveFolderId;

    let hasPhotoChanges = false;

    // 1. Upload non-drive photos for inventory
    for (const inv of dbCache.inventory) {
      if (inv.photoUrl && !inv.photoUrl.includes('drive.google.com') && !inv.photoUrl.includes('googleusercontent.com')) {
        const driveUrl = await uploadServerPhotoToDrive(accessToken, driveFolderId, `${inv.category}_${inv.itemName}`, inv.photoUrl);
        if (driveUrl) {
          inv.photoUrl = driveUrl;
          hasPhotoChanges = true;
        }
      }
    }

    // 2. Upload non-drive photos for purchase orders
    for (const po of dbCache.purchaseOrders) {
      if (po.photoUrl && !po.photoUrl.includes('drive.google.com') && !po.photoUrl.includes('googleusercontent.com')) {
        const driveUrl = await uploadServerPhotoToDrive(accessToken, driveFolderId, `PO_${po.itemName}`, po.photoUrl);
        if (driveUrl) {
          po.photoUrl = driveUrl;
          hasPhotoChanges = true;
        }
      }
    }

    // 3. Upload non-drive photos for preloved items
    if (dbCache.preloved) {
      for (const prev of dbCache.preloved) {
        if (prev.photoUrl && !prev.photoUrl.includes('drive.google.com') && !prev.photoUrl.includes('googleusercontent.com')) {
          const driveUrl = await uploadServerPhotoToDrive(accessToken, driveFolderId, `PRELOVED_${prev.category}_${prev.itemName}`, prev.photoUrl);
          if (driveUrl) {
            prev.photoUrl = driveUrl;
            hasPhotoChanges = true;
          }
        }
      }
    }

    if (hasPhotoChanges) {
      saveDB(dbCache);
    }

    // 4. Ensure all three tabs exist in Spreadsheet
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=false`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (metaRes.ok) {
      const meta = await metaRes.json();
      const sheetTitles: string[] = (meta.sheets || []).map((s: any) => s.properties?.title);

      const requests: any[] = [];
      if (!sheetTitles.includes('INVENTORY DATABASE')) {
        requests.push({
          addSheet: { properties: { title: 'INVENTORY DATABASE', gridProperties: { rowCount: 1000, columnCount: 15 } } }
        });
      }
      if (!sheetTitles.includes('PURCHASE ORDER DATABASE')) {
        requests.push({
          addSheet: { properties: { title: 'PURCHASE ORDER DATABASE', gridProperties: { rowCount: 1000, columnCount: 15 } } }
        });
      }
      if (!sheetTitles.includes('PRELOVED DATABASE')) {
        requests.push({
          addSheet: { properties: { title: 'PRELOVED DATABASE', gridProperties: { rowCount: 1000, columnCount: 15 } } }
        });
      }

      if (requests.length > 0) {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests })
        }).catch(() => {});
      }
    }

    // 5. Clear old values and write updated Inventory tab
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'INVENTORY%20DATABASE'!A1:Z${dbCache.inventory.length + 100}:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` }
    }).catch(() => {});

    const invValues = buildSpreadsheetValues(dbCache.inventory);
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'INVENTORY%20DATABASE'!A1?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: invValues })
    }).catch(e => console.warn('Auto-sync inventory write warning:', e));

    // 6. Clear old values and write updated Purchase Order tab
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'PURCHASE%20ORDER%20DATABASE'!A1:Z${(dbCache.purchaseOrders || []).length + 100}:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` }
    }).catch(() => {});

    const poValues = buildPOSpreadsheetValues(dbCache.purchaseOrders);
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'PURCHASE%20ORDER%20DATABASE'!A1?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: poValues })
    }).catch(e => console.warn('Auto-sync PO write warning:', e));

    // 7. Clear old values and write updated Preloved tab
    const prelovedList = dbCache.preloved || [];
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'PRELOVED%20DATABASE'!A1:Z${prelovedList.length + 100}:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` }
    }).catch(() => {});

    const prelovedValues = buildPrelovedSpreadsheetValues(prelovedList);
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'PRELOVED%20DATABASE'!A1?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: prelovedValues })
    }).catch(e => console.warn('Auto-sync Preloved write warning:', e));

    // 8. Record sync status
    if (dbCache.googleIntegration) {
      dbCache.googleIntegration.lastSyncedAt = new Date().toISOString();
      dbCache.googleIntegration.lastSyncStatus = 'success';
      dbCache.googleIntegration.lastSyncMessage = `Otomatis tersinkron (${reason || 'data baru'}): ${dbCache.inventory.length} inventaris, ${(dbCache.purchaseOrders || []).length} PO & ${prelovedList.length} preloved ke Google Spreadsheet.`;
      dbCache.googleIntegration.syncedInventoryCount = dbCache.inventory.length;
      dbCache.googleIntegration.syncedPOCount = (dbCache.purchaseOrders || []).length;
      dbCache.googleIntegration.syncedPrelovedCount = prelovedList.length;
      saveDB(dbCache);
    }
  } catch (err: any) {
    console.warn('triggerAutoSync error:', err);
  }
}

// Express Middleware

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static route for uploaded images
app.use('/uploads', express.static(UPLOADS_DIR));

// Auth token helper
function getAuthenticatedUser(req: Request): UserAccount | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const session = activeSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }
  return session.user;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized. Please login.' });
    return;
  }
  (req as any).user = user;
  next();
}

// API Routes

// 1. Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required.' });
    return;
  }

  const normalizedUser = username.trim().toUpperCase();
  const foundUser = dbCache.users.find(u => u.username.toUpperCase() === normalizedUser);

  if (!foundUser) {
    res.status(401).json({ error: 'Invalid username or password.' });
    return;
  }

  const isMatch = bcrypt.compareSync(password, foundUser.passwordHash);
  if (!isMatch) {
    res.status(401).json({ error: 'Invalid username or password.' });
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const userProfile: UserAccount = {
    id: foundUser.id,
    username: foundUser.username,
    role: foundUser.role,
    createdAt: foundUser.createdAt,
    updatedAt: foundUser.updatedAt
  };

  // 7 days session
  activeSessions.set(token, {
    user: userProfile,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
  });

  res.json({
    token,
    user: userProfile
  });
});

// 2. Current User
app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthenticated' });
    return;
  }
  res.json({ user });
});

// 3. Logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    activeSessions.delete(token);
  }
  res.json({ success: true });
});

// 4. Verify Secret Code
const SECRET_CODE = 'INNRATTAN.BJM';

app.post('/api/auth/verify-secret', (req: Request, res: Response) => {
  const { secretCode } = req.body;
  if (!secretCode || secretCode.trim() !== SECRET_CODE) {
    res.status(403).json({ error: 'Invalid secret code. Please try again.' });
    return;
  }

  const secretToken = crypto.randomBytes(24).toString('hex');
  secretTokens.add(secretToken);
  // Auto expire secret token in 30 mins
  setTimeout(() => secretTokens.delete(secretToken), 30 * 60 * 1000);

  res.json({
    success: true,
    secretToken
  });
});

// 5. Get Users List for Edit User & Password
app.get('/api/users', (req: Request, res: Response) => {
  const secretToken = req.headers['x-secret-token'] as string;
  const user = getAuthenticatedUser(req);

  // Accessible either if secret token provided or logged in
  if (!secretToken && !user) {
    res.status(403).json({ error: 'Access denied. Secret code verification required.' });
    return;
  }

  const usersSafe = dbCache.users.map(u => ({
    id: u.id,
    username: u.username,
    role: u.role,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt
  }));

  res.json({ users: usersSafe });
});

// 6. Update User Credentials (Username and/or Password)
app.put('/api/users/:id', (req: Request, res: Response) => {
  const secretToken = req.headers['x-secret-token'] as string;
  if (!secretToken || !secretTokens.has(secretToken)) {
    res.status(403).json({ error: 'Invalid or expired secret session. Please verify secret code again.' });
    return;
  }

  const { id } = req.params;
  const { username, password } = req.body;

  const targetIdx = dbCache.users.findIndex(u => u.id === id);
  if (targetIdx === -1) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const oldUser = dbCache.users[targetIdx];
  let newUsername = oldUser.username;

  if (username && username.trim() !== '') {
    const trimmed = username.trim().toUpperCase();
    // Check if new username collides with another user
    const collision = dbCache.users.find(u => u.id !== id && u.username.toUpperCase() === trimmed);
    if (collision) {
      res.status(400).json({ error: `Username ${trimmed} is already in use.` });
      return;
    }
    newUsername = trimmed;
  }

  let newHash = oldUser.passwordHash;
  if (password && password.trim() !== '') {
    newHash = bcrypt.hashSync(password.trim(), 10);
  }

  const nowIso = new Date().toISOString();
  dbCache.users[targetIdx] = {
    ...oldUser,
    username: newUsername,
    passwordHash: newHash,
    updatedAt: nowIso
  };

  saveDB(dbCache);

  // Update any active sessions with the new username
  for (const [token, session] of activeSessions.entries()) {
    if (session.user.id === id) {
      session.user.username = newUsername;
      session.user.updatedAt = nowIso;
    }
  }

  res.json({
    message: 'User credentials updated successfully.',
    user: {
      id: oldUser.id,
      username: newUsername,
      role: oldUser.role,
      updatedAt: nowIso
    }
  });
});

// 7. Get Inventory List with filters
app.get('/api/inventory', requireAuth, (req: Request, res: Response) => {
  const {
    search,
    category,
    month,
    user,
    dateFrom,
    dateTo,
    sortBy,
    page = '1',
    limit = '50'
  } = req.query as Record<string, string>;

  let filtered = filterInventory(dbCache.inventory, {
    search,
    category,
    month,
    user,
    dateFrom,
    dateTo
  });

  const sorted = sortInventory(filtered, sortBy as any || 'updated-newest');

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 50;
  const total = sorted.length;
  const startIndex = (pageNum - 1) * limitNum;
  const paginated = sorted.slice(startIndex, startIndex + limitNum);

  res.json({
    data: paginated,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1
  });
});

// 8. Get Recently Edited Items (Both Inventory & Purchase Orders)
app.get('/api/inventory/recently-edited', requireAuth, (req: Request, res: Response) => {
  const allRecent: any[] = [];

  for (const inv of dbCache.inventory) {
    allRecent.push({
      id: inv.id,
      itemName: inv.itemName,
      photoUrl: inv.photoUrl,
      categoryOrStatus: inv.category,
      itemType: 'INVENTORY' as const,
      dateRef: inv.dateRepaired,
      dateRefLabel: 'Tanggal Rekap',
      serialOrQty: `${inv.quantity ?? 1} Unit${inv.serialNumber ? ` • SN: ${inv.serialNumber}` : ''}`,
      createdBy: inv.createdBy,
      updatedBy: inv.updatedBy,
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt,
      rawItem: inv
    });
  }

  for (const po of dbCache.purchaseOrders) {
    allRecent.push({
      id: po.id,
      itemName: po.itemName,
      photoUrl: po.photoUrl,
      categoryOrStatus: po.status,
      itemType: 'PURCHASE ORDER' as const,
      dateRef: po.dateOrder,
      dateRefLabel: 'Tanggal order',
      serialOrQty: `${po.quantity} Unit • ${po.forUse}`,
      createdBy: po.createdBy,
      updatedBy: po.updatedBy,
      createdAt: po.createdAt,
      updatedAt: po.updatedAt,
      rawItem: po
    });
  }

  if (dbCache.preloved) {
    for (const prev of dbCache.preloved) {
      allRecent.push({
        id: prev.id,
        itemName: prev.itemName,
        photoUrl: prev.photoUrl,
        categoryOrStatus: prev.category,
        itemType: 'PRELOVED' as const,
        dateRef: prev.dateRepaired,
        dateRefLabel: 'Tanggal dibereskan',
        serialOrQty: `${prev.quantity ?? 1} Unit${prev.serialNumber ? ` • SN: ${prev.serialNumber}` : ''}`,
        createdBy: prev.createdBy,
        updatedBy: prev.updatedBy,
        createdAt: prev.createdAt,
        updatedAt: prev.updatedAt,
        rawItem: prev
      });
    }
  }

  allRecent.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  res.json({ data: allRecent.slice(0, 10) });
});

// 9. Get Dashboard Stats
app.get('/api/inventory/stats', requireAuth, (req: Request, res: Response) => {
  const stats = computeStats(dbCache.inventory, new Date());
  res.json(stats);
});

// 10. Get Recent Activities
app.get('/api/inventory/recent-activity', requireAuth, (req: Request, res: Response) => {
  const sorted = [...dbCache.activities].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
  res.json({ data: sorted.slice(0, 15) });
});

// 11. Get Single Inventory
app.get('/api/inventory/:id', requireAuth, (req: Request, res: Response) => {
  const item = dbCache.inventory.find(i => i.id === req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Inventory item not found.' });
    return;
  }
  res.json({ data: item });
});

// 12. Add New Inventory
app.post('/api/inventory', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserAccount;
  const { itemName, photoUrl, category, dateRepaired, serialNumber, remark, quantity } = req.body;

  if (!itemName || !itemName.trim()) {
    res.status(400).json({ error: 'Item name is required.' });
    return;
  }
  if (!photoUrl || !photoUrl.trim()) {
    res.status(400).json({ error: 'Photo is required for new inventory items.' });
    return;
  }
  if (!category || !['PC ITEMS', 'NETWORK ITEMS', 'CCTV & TV ITEMS'].includes(category)) {
    res.status(400).json({ error: 'Category must be PC ITEMS, NETWORK ITEMS, or CCTV & TV ITEMS.' });
    return;
  }
  if (!dateRepaired || !dateRepaired.trim()) {
    res.status(400).json({ error: 'Date repaired is required.' });
    return;
  }

  const nowIso = new Date().toISOString();
  const newItem: InventoryItem = {
    id: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    itemName: itemName.trim(),
    photoUrl: photoUrl.trim(),
    category: category as Category,
    dateRepaired: dateRepaired.trim(),
    quantity: quantity !== undefined ? Math.max(1, parseInt(quantity) || 1) : 1,
    serialNumber: serialNumber && serialNumber.trim() ? serialNumber.trim() : null,
    remark: remark && remark.trim() ? remark.trim() : null,
    createdAt: nowIso,
    createdBy: user.username,
    updatedAt: nowIso,
    updatedBy: user.username
  };

  dbCache.inventory.unshift(newItem);

  // Record activity
  const activity: ActivityRecord = {
    id: `act-${Date.now()}`,
    inventoryId: newItem.id,
    itemName: newItem.itemName,
    category: newItem.category,
    action: 'Added',
    username: user.username,
    timestamp: nowIso
  };
  dbCache.activities.unshift(activity);

  saveDB(dbCache);
  triggerAutoSync(`Tambah inventaris: ${newItem.itemName}`).catch(() => {});

  res.status(201).json({
    message: 'Inventory added successfully.',
    data: newItem
  });
});

// 13. Update Inventory
app.put('/api/inventory/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserAccount;
  const { id } = req.params;
  const { itemName, photoUrl, category, dateRepaired, serialNumber, remark, quantity } = req.body;

  const itemIndex = dbCache.inventory.findIndex(i => i.id === id);
  if (itemIndex === -1) {
    res.status(404).json({ error: 'Inventory item not found.' });
    return;
  }

  const existing = dbCache.inventory[itemIndex];

  if (!itemName || !itemName.trim()) {
    res.status(400).json({ error: 'Item name is required.' });
    return;
  }
  if (!category || !['PC ITEMS', 'NETWORK ITEMS', 'CCTV & TV ITEMS'].includes(category)) {
    res.status(400).json({ error: 'Category must be PC ITEMS, NETWORK ITEMS, or CCTV & TV ITEMS.' });
    return;
  }
  if (!dateRepaired || !dateRepaired.trim()) {
    res.status(400).json({ error: 'Date repaired is required.' });
    return;
  }

  const nowIso = new Date().toISOString();
  const updatedItem: InventoryItem = {
    ...existing,
    itemName: itemName.trim(),
    photoUrl: photoUrl && photoUrl.trim() ? photoUrl.trim() : existing.photoUrl,
    category: category as Category,
    dateRepaired: dateRepaired.trim(),
    quantity: quantity !== undefined ? Math.max(1, parseInt(quantity) || 1) : (existing.quantity || 1),
    serialNumber: serialNumber && serialNumber.trim() ? serialNumber.trim() : null,
    remark: remark !== undefined ? (remark && remark.trim() ? remark.trim() : null) : (existing.remark || null),
    updatedAt: nowIso,
    updatedBy: user.username
  };

  dbCache.inventory[itemIndex] = updatedItem;

  // Add activity log
  const activity: ActivityRecord = {
    id: `act-${Date.now()}`,
    inventoryId: updatedItem.id,
    itemName: updatedItem.itemName,
    category: updatedItem.category,
    action: 'Edited',
    username: user.username,
    timestamp: nowIso
  };
  dbCache.activities.unshift(activity);

  saveDB(dbCache);
  triggerAutoSync(`Update inventaris: ${updatedItem.itemName}`).catch(() => {});

  res.json({
    message: 'Inventory updated successfully.',
    data: updatedItem
  });
});

// 14. Delete Inventory
app.delete('/api/inventory/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserAccount;
  const { id } = req.params;

  const item = dbCache.inventory.find(i => i.id === id);
  if (!item) {
    res.status(404).json({ error: 'Inventory item not found.' });
    return;
  }

  dbCache.inventory = dbCache.inventory.filter(i => i.id !== id);

  const activity: ActivityRecord = {
    id: `act-${Date.now()}`,
    inventoryId: id,
    itemName: item.itemName,
    category: item.category,
    action: 'Deleted',
    username: user.username,
    timestamp: new Date().toISOString()
  };
  dbCache.activities.unshift(activity);

  saveDB(dbCache);
  triggerAutoSync(`Hapus inventaris: ${item.itemName}`).catch(() => {});

  res.json({ message: 'Inventory item deleted successfully.' });
});


// 15. Upload Photo (Base64 or binary)
app.post('/api/upload', requireAuth, (req: Request, res: Response) => {
  try {
    const { imageBase64, filename } = req.body;
    if (!imageBase64) {
      res.status(400).json({ error: 'Image data is required.' });
      return;
    }

    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer: Buffer;
    let ext = 'jpg';

    if (matches && matches.length === 3) {
      const mime = matches[1].toLowerCase();
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mime)) {
        res.status(400).json({ error: 'Only JPG, PNG, and WebP images are allowed.' });
        return;
      }
      ext = mime.split('/')[1] === 'jpeg' ? 'jpg' : mime.split('/')[1];
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(imageBase64, 'base64');
    }

    // Limit to 10MB
    if (buffer.length > 10 * 1024 * 1024) {
      res.status(400).json({ error: 'Image size exceeds 10MB limit.' });
      return;
    }

    const uniqueName = `upload-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, uniqueName);
    fs.writeFileSync(filePath, buffer);

    res.json({
      url: `/uploads/${uniqueName}`
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload image. Please try again.' });
  }
});

// ========================
// PURCHASE ORDER ROUTES
// ========================

// 16. Get Purchase Orders with filter & pagination
app.get('/api/po', requireAuth, (req: Request, res: Response) => {
  const {
    search,
    status,
    month,
    user,
    dateFrom,
    dateTo,
    sortBy,
    page = '1',
    limit = '50'
  } = req.query as Record<string, string>;

  const filtered = filterPurchaseOrders(dbCache.purchaseOrders || [], {
    search,
    status: status as any,
    month,
    user,
    dateFrom,
    dateTo,
    sortBy: sortBy as any
  });

  const sorted = sortPurchaseOrders(filtered, (sortBy as any) || 'updated-newest');

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 50;
  const total = sorted.length;
  const startIndex = (pageNum - 1) * limitNum;
  const paginated = sorted.slice(startIndex, startIndex + limitNum);

  res.json({
    data: paginated,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1
  });
});

// 17. Get Purchase Order Stats
app.get('/api/po/stats', requireAuth, (req: Request, res: Response) => {
  const stats = computePOStats(dbCache.purchaseOrders || [], new Date());
  res.json(stats);
});

// 18. Get Single Purchase Order
app.get('/api/po/:id', requireAuth, (req: Request, res: Response) => {
  const item = (dbCache.purchaseOrders || []).find((p) => p.id === req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Purchase Order item not found.' });
    return;
  }
  res.json({ data: item });
});

// 19. Add Purchase Order
app.post('/api/po', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserAccount;
  const { itemName, photoUrl, dateOrder, dateArrival, quantity, forUse, remarks, status } = req.body;

  if (!itemName || !itemName.trim()) {
    res.status(400).json({ error: 'Item name is required.' });
    return;
  }
  if (!dateOrder || !dateOrder.trim()) {
    res.status(400).json({ error: 'Date order is required.' });
    return;
  }
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    res.status(400).json({ error: 'Quantity must be at least 1 unit.' });
    return;
  }
  if (!status || !['BELUM DATANG', 'SUDAH DATANG'].includes(status)) {
    res.status(400).json({ error: 'Status must be BELUM DATANG or SUDAH DATANG.' });
    return;
  }

  const nowIso = new Date().toISOString();
  const newPO: PurchaseOrderItem = {
    id: `po-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    itemName: itemName.trim(),
    photoUrl: photoUrl && photoUrl.trim() ? photoUrl.trim() : createSampleSvg(itemName.trim(), 'PO ITEMS', '#0284c7'),
    dateOrder: dateOrder.trim(),
    dateArrival: dateArrival && dateArrival.trim() ? dateArrival.trim() : null,
    quantity: qty,
    forUse: forUse && forUse.trim() ? forUse.trim() : 'IT Department',
    remarks: remarks && remarks.trim() ? remarks.trim() : null,
    status,
    createdAt: nowIso,
    createdBy: user.username,
    updatedAt: nowIso,
    updatedBy: user.username
  };

  if (!dbCache.purchaseOrders) {
    dbCache.purchaseOrders = [];
  }
  dbCache.purchaseOrders.unshift(newPO);

  // Add activity log
  const activity: ActivityRecord = {
    id: `act-${Date.now()}`,
    targetId: newPO.id,
    itemName: newPO.itemName,
    category: 'PURCHASE ORDER',
    type: 'PURCHASE ORDER',
    action: 'Added',
    username: user.username,
    timestamp: nowIso
  };
  dbCache.activities.unshift(activity);

  saveDB(dbCache);
  triggerAutoSync(`Tambah Purchase Order: ${newPO.itemName}`).catch(() => {});

  res.status(201).json({
    message: 'Purchase Order added successfully.',
    data: newPO
  });
});

// 20. Update Purchase Order
app.put('/api/po/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserAccount;
  const { id } = req.params;
  const { itemName, photoUrl, dateOrder, dateArrival, quantity, forUse, remarks, status } = req.body;

  const idx = (dbCache.purchaseOrders || []).findIndex((p) => p.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Purchase Order not found.' });
    return;
  }

  const existing = dbCache.purchaseOrders[idx];

  if (!itemName || !itemName.trim()) {
    res.status(400).json({ error: 'Item name is required.' });
    return;
  }
  if (!dateOrder || !dateOrder.trim()) {
    res.status(400).json({ error: 'Date order is required.' });
    return;
  }
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    res.status(400).json({ error: 'Quantity must be at least 1 unit.' });
    return;
  }

  const nowIso = new Date().toISOString();
  const updatedPO: PurchaseOrderItem = {
    ...existing,
    itemName: itemName.trim(),
    photoUrl: photoUrl && photoUrl.trim() ? photoUrl.trim() : existing.photoUrl,
    dateOrder: dateOrder.trim(),
    dateArrival: dateArrival && dateArrival.trim() ? dateArrival.trim() : null,
    quantity: qty,
    forUse: forUse && forUse.trim() ? forUse.trim() : existing.forUse,
    remarks: remarks !== undefined ? (remarks && remarks.trim() ? remarks.trim() : null) : existing.remarks,
    status: status && ['BELUM DATANG', 'SUDAH DATANG'].includes(status) ? status : existing.status,
    updatedAt: nowIso,
    updatedBy: user.username
  };

  dbCache.purchaseOrders[idx] = updatedPO;

  // Add activity log
  const activity: ActivityRecord = {
    id: `act-${Date.now()}`,
    targetId: updatedPO.id,
    itemName: updatedPO.itemName,
    category: 'PURCHASE ORDER',
    type: 'PURCHASE ORDER',
    action: 'Edited',
    username: user.username,
    timestamp: nowIso
  };
  dbCache.activities.unshift(activity);

  saveDB(dbCache);
  triggerAutoSync(`Update Purchase Order: ${updatedPO.itemName}`).catch(() => {});

  res.json({
    message: 'Purchase Order updated successfully.',
    data: updatedPO
  });
});

// 21. Delete Purchase Order
app.delete('/api/po/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserAccount;
  const { id } = req.params;

  const item = (dbCache.purchaseOrders || []).find((p) => p.id === id);
  if (!item) {
    res.status(404).json({ error: 'Purchase Order not found.' });
    return;
  }

  dbCache.purchaseOrders = (dbCache.purchaseOrders || []).filter((p) => p.id !== id);

  const activity: ActivityRecord = {
    id: `act-${Date.now()}`,
    targetId: id,
    itemName: item.itemName,
    category: 'PURCHASE ORDER',
    type: 'PURCHASE ORDER',
    action: 'Deleted',
    username: user.username,
    timestamp: new Date().toISOString()
  };
  dbCache.activities.unshift(activity);

  saveDB(dbCache);
  triggerAutoSync(`Hapus Purchase Order: ${item.itemName}`).catch(() => {});

  res.json({ message: 'Purchase Order deleted successfully.' });
});


// 22. Export Purchase Orders to Excel
app.get('/api/export/excel-po', requireAuth, async (req: Request, res: Response) => {
  try {
    const { month, status, user, search } = req.query as Record<string, string>;

    const itemsToExport = sortPurchaseOrders(
      filterPurchaseOrders(dbCache.purchaseOrders || [], {
        month,
        status: status as any,
        user,
        search
      }),
      'order-newest'
    );

    const monthParsed = parseMonthFilter(month);
    const monthName = monthParsed ? `${MONTH_NAMES[monthParsed.month - 1]} ${monthParsed.year}` : 'ALL MONTHS';
    const worksheetTitle = monthParsed ? `PO_${MONTH_NAMES[monthParsed.month - 1]}` : 'PURCHASE_ORDERS';

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hotel IT Department';
    workbook.lastModifiedBy = ((req as any).user as UserAccount).username;
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheet = workbook.addWorksheet(worksheetTitle, {
      pageSetup: { orientation: 'landscape', fitToPage: true },
      views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }]
    });

    // Title Row 1
    sheet.mergeCells('A1:L1');
    const titleCell1 = sheet.getCell('A1');
    titleCell1.value = 'HOTEL IT - PURCHASE ORDER DATA';
    titleCell1.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell1.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell1.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' }
    };
    sheet.getRow(1).height = 36;

    // Subtitle Row 2
    sheet.mergeCells('A2:L2');
    const titleCell2 = sheet.getCell('A2');
    titleCell2.value = `DATA BULAN ${monthName.toUpperCase()}`;
    titleCell2.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell2.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell2.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }
    };
    sheet.getRow(2).height = 28;

    // Spacing Row 3
    sheet.getRow(3).height = 10;

    // Table Header Row 4
    const headers = [
      'No',
      'Foto',
      'Item Name',
      'Tanggal Order',
      'Tanggal Kedatangan',
      'Jumlah Unit',
      'For Use',
      'Remarks',
      'Status',
      'Added By',
      'Last Edited By',
      'Last Updated'
    ];
    const headerRow = sheet.getRow(4);
    headerRow.values = headers;
    headerRow.height = 30;

    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0284C7' }
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF0F172A' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FF38BDF8' } },
        right: { style: 'thin', color: { argb: 'FF38BDF8' } }
      };
    });

    // Column widths
    sheet.columns = [
      { key: 'no', width: 6 },
      { key: 'photo', width: 14 },
      { key: 'name', width: 32 },
      { key: 'dateOrder', width: 18 },
      { key: 'dateArrival', width: 20 },
      { key: 'qty', width: 14 },
      { key: 'forUse', width: 26 },
      { key: 'remarks', width: 30 },
      { key: 'status', width: 18 },
      { key: 'addedBy', width: 16 },
      { key: 'editedBy', width: 16 },
      { key: 'lastUpdated', width: 22 }
    ];

    sheet.autoFilter = 'A4:L4';

    let currentRowIdx = 5;
    for (let i = 0; i < itemsToExport.length; i++) {
      const po = itemsToExport[i];
      const row = sheet.getRow(currentRowIdx);
      row.height = 65;

      row.getCell(1).value = i + 1;
      row.getCell(2).value = '';
      row.getCell(3).value = po.itemName;
      row.getCell(4).value = formatDate(po.dateOrder);
      row.getCell(5).value = po.dateArrival ? formatDate(po.dateArrival) : 'Menunggu kedatangan';
      row.getCell(6).value = `${po.quantity} Unit`;
      row.getCell(7).value = po.forUse;
      row.getCell(8).value = po.remarks || '-';
      row.getCell(9).value = po.status;
      row.getCell(10).value = po.createdBy;
      row.getCell(11).value = po.updatedBy;
      row.getCell(12).value = formatDateTime(po.updatedAt);

      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(7).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.getCell(8).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };

      // Highlight status
      if (po.status === 'SUDAH DATANG') {
        row.getCell(9).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF065F46' } };
      } else {
        row.getCell(9).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF9A3412' } };
      }

      const bgColor = i % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';
      for (let c = 1; c <= 12; c++) {
        const cell = row.getCell(c);
        if (c !== 9) {
          cell.font = { name: 'Arial', size: 9 };
        }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor }
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      }

      // Try embedding image
      try {
        let imgBuffer: Buffer | null = null;
        let imgExt: 'png' | 'jpeg' = 'png';

        if (po.photoUrl && po.photoUrl.startsWith('data:image/')) {
          const match = po.photoUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
          if (match) {
            imgExt = match[1].includes('jpeg') || match[1].includes('jpg') ? 'jpeg' : 'png';
            imgBuffer = Buffer.from(match[2], 'base64');
          }
        } else if (po.photoUrl && po.photoUrl.startsWith('/uploads/')) {
          const diskPath = path.join(DATA_DIR, po.photoUrl);
          if (fs.existsSync(diskPath)) {
            imgBuffer = fs.readFileSync(diskPath);
            imgExt = diskPath.endsWith('.jpg') || diskPath.endsWith('.jpeg') ? 'jpeg' : 'png';
          }
        }

        if (imgBuffer && (imgExt === 'png' || imgExt === 'jpeg')) {
          const imageId = workbook.addImage({
            buffer: imgBuffer as any,
            extension: imgExt
          });
          sheet.addImage(imageId, {
            tl: { col: 1.15, row: currentRowIdx - 1 + 0.1 },
            ext: { width: 68, height: 55 }
          });
        }
      } catch (err) {
        console.warn('Could not embed image for PO item', po.id, err);
      }

      currentRowIdx++;
    }

    const safeMonthName = monthParsed ? `${MONTH_NAMES[monthParsed.month - 1]}_${monthParsed.year}` : 'ALL_MONTHS';
    const downloadFileName = `HOTEL_IT_PURCHASE_ORDER_${safeMonthName}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('PO Excel export error:', error);
    res.status(500).json({ error: 'Failed to generate Purchase Order Excel file.' });
  }
});

// 23. Export to Excel with embedded images (Inventory)
app.get('/api/export/excel', requireAuth, async (req: Request, res: Response) => {
  try {
    const { month, category, user, search } = req.query as Record<string, string>;

    const itemsToExport = sortInventory(
      filterInventory(dbCache.inventory, {
        month,
        category,
        user,
        search
      }),
      'date-newest'
    );

    const monthParsed = parseMonthFilter(month);
    const monthName = monthParsed ? `${MONTH_NAMES[monthParsed.month - 1]} ${monthParsed.year}` : 'ALL MONTHS';
    const worksheetTitle = monthParsed ? `${MONTH_NAMES[monthParsed.month - 1]} ${monthParsed.year}` : 'INVENTORY';

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hotel IT Department';
    workbook.lastModifiedBy = ((req as any).user as UserAccount).username;
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheet = workbook.addWorksheet(worksheetTitle, {
      pageSetup: { orientation: 'landscape', fitToPage: true },
      views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }]
    });

    // Title Row 1
    sheet.mergeCells('A1:K1');
    const titleCell1 = sheet.getCell('A1');
    titleCell1.value = 'HOTEL IT INVENTORY';
    titleCell1.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell1.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell1.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' }
    };
    sheet.getRow(1).height = 36;

    // Subtitle Row 2
    sheet.mergeCells('A2:K2');
    const titleCell2 = sheet.getCell('A2');
    titleCell2.value = `DATA BULAN ${monthName.toUpperCase()}`;
    titleCell2.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell2.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell2.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }
    };
    sheet.getRow(2).height = 28;

    // Spacing Row 3
    sheet.getRow(3).height = 10;

    // Table Header Row 4
    const headers = [
      'No',
      'Foto',
      'Nama Barang',
      'Kategori',
      'Tanggal Rekap',
      'Jumlah Unit',
      'Serial Number',
      'Remark',
      'Added By',
      'Last Edited By',
      'Last Updated'
    ];
    const headerRow = sheet.getRow(4);
    headerRow.values = headers;
    headerRow.height = 30;

    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF334155' }
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF0F172A' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FF475569' } },
        right: { style: 'thin', color: { argb: 'FF475569' } }
      };
    });

    // Column widths
    sheet.columns = [
      { key: 'no', width: 6 },
      { key: 'photo', width: 14 },
      { key: 'name', width: 34 },
      { key: 'category', width: 22 },
      { key: 'dateRepaired', width: 20 },
      { key: 'quantity', width: 14 },
      { key: 'sn', width: 20 },
      { key: 'remark', width: 24 },
      { key: 'addedBy', width: 16 },
      { key: 'editedBy', width: 16 },
      { key: 'lastUpdated', width: 22 }
    ];

    // Enable table filter
    sheet.autoFilter = 'A4:K4';

    // Populate rows
    let currentRowIdx = 5;
    for (let i = 0; i < itemsToExport.length; i++) {
      const item = itemsToExport[i];
      const row = sheet.getRow(currentRowIdx);
      row.height = 65; // row height to host photo comfortably

      row.getCell(1).value = i + 1; // No
      row.getCell(2).value = ''; // Photo cell placeholder
      row.getCell(3).value = item.itemName;
      row.getCell(4).value = item.category;
      row.getCell(5).value = formatDate(item.dateRepaired);
      row.getCell(6).value = item.quantity ?? 1;
      row.getCell(7).value = item.serialNumber || '-';
      row.getCell(8).value = item.remark || '-';
      row.getCell(9).value = item.createdBy;
      row.getCell(10).value = item.updatedBy;
      row.getCell(11).value = formatDateTime(item.updatedAt);

      // Cell styles
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(8).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };

      // Alternating row background
      const bgColor = i % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';
      for (let c = 1; c <= 11; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Arial', size: 9 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor }
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      }

      // Try embedding image
      try {
        let imgBuffer: Buffer | null = null;
        let imgExt: 'png' | 'jpeg' = 'png';

        if (item.photoUrl.startsWith('data:image/')) {
          const match = item.photoUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
          if (match) {
            imgExt = match[1].includes('jpeg') || match[1].includes('jpg') ? 'jpeg' : 'png';
            imgBuffer = Buffer.from(match[2], 'base64');
          }
        } else if (item.photoUrl.startsWith('/uploads/')) {
          const diskPath = path.join(DATA_DIR, item.photoUrl);
          if (fs.existsSync(diskPath)) {
            imgBuffer = fs.readFileSync(diskPath);
            imgExt = diskPath.endsWith('.jpg') || diskPath.endsWith('.jpeg') ? 'jpeg' : 'png';
          }
        }

        if (imgBuffer && (imgExt === 'png' || imgExt === 'jpeg')) {
          const imageId = workbook.addImage({
            buffer: imgBuffer as any,
            extension: imgExt
          });
          sheet.addImage(imageId, {
            tl: { col: 1.15, row: currentRowIdx - 1 + 0.1 },
            ext: { width: 68, height: 55 }
          });
        }
      } catch (err) {
        console.warn('Could not embed image for item', item.id, err);
      }

      currentRowIdx++;
    }

    const safeMonthName = monthParsed ? `${MONTH_NAMES[monthParsed.month - 1]}_${monthParsed.year}` : 'ALL_MONTHS';
    const downloadFileName = `HOTEL_IT_INVENTORY_${safeMonthName}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: 'Failed to generate Excel file.' });
  }
});

// ==========================================
// PRELOVED MANAGEMENT ROUTES
// ==========================================

// 24. Get Preloved List with filters
app.get('/api/preloved', requireAuth, (req: Request, res: Response) => {
  const {
    search,
    category,
    month,
    user,
    dateFrom,
    dateTo,
    sortBy,
    page = '1',
    limit = '50'
  } = req.query as Record<string, string>;

  const filtered = filterPreloved(dbCache.preloved || [], {
    search,
    category,
    month,
    user,
    dateFrom,
    dateTo
  });

  const sorted = sortPreloved(filtered, (sortBy as any) || 'updated-newest');

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 50;
  const total = sorted.length;
  const startIndex = (pageNum - 1) * limitNum;
  const paginated = sorted.slice(startIndex, startIndex + limitNum);

  res.json({
    data: paginated,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1
  });
});

// 25. Get Preloved Stats
app.get('/api/preloved/stats', requireAuth, (req: Request, res: Response) => {
  const stats = computePrelovedStats(dbCache.preloved || [], new Date());
  res.json(stats);
});

// 26. Get Single Preloved Item
app.get('/api/preloved/:id', requireAuth, (req: Request, res: Response) => {
  const item = (dbCache.preloved || []).find(i => i.id === req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Preloved item not found.' });
    return;
  }
  res.json({ data: item });
});

// 27. Add New Preloved Item
app.post('/api/preloved', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserAccount;
  const { itemName, photoUrl, category, dateRepaired, serialNumber, remark, quantity } = req.body;

  if (!itemName || !itemName.trim()) {
    res.status(400).json({ error: 'Item name is required.' });
    return;
  }
  if (!photoUrl || !photoUrl.trim()) {
    res.status(400).json({ error: 'Photo is required for new preloved items.' });
    return;
  }
  if (!category || !['PC ITEMS', 'NETWORK ITEMS', 'CCTV & TV ITEMS'].includes(category)) {
    res.status(400).json({ error: 'Category must be PC ITEMS, NETWORK ITEMS, or CCTV & TV ITEMS.' });
    return;
  }
  if (!dateRepaired || !dateRepaired.trim()) {
    res.status(400).json({ error: 'Date repaired is required.' });
    return;
  }

  const nowIso = new Date().toISOString();
  const newPrev: PrelovedItem = {
    id: `prev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    itemName: itemName.trim(),
    photoUrl: photoUrl.trim(),
    category,
    dateRepaired: dateRepaired.trim(),
    quantity: quantity !== undefined ? Math.max(1, parseInt(quantity) || 1) : 1,
    serialNumber: serialNumber && serialNumber.trim() ? serialNumber.trim() : null,
    remark: remark && remark.trim() ? remark.trim() : null,
    createdAt: nowIso,
    createdBy: user.username,
    updatedAt: nowIso,
    updatedBy: user.username
  };

  if (!dbCache.preloved) {
    dbCache.preloved = [];
  }
  dbCache.preloved.unshift(newPrev);

  const activity: ActivityRecord = {
    id: `act-${Date.now()}`,
    targetId: newPrev.id,
    itemName: newPrev.itemName,
    category: newPrev.category,
    type: 'PRELOVED',
    action: 'Added',
    username: user.username,
    timestamp: nowIso
  };
  dbCache.activities.unshift(activity);

  saveDB(dbCache);
  triggerAutoSync(`Tambah Preloved: ${newPrev.itemName}`).catch(() => {});

  res.status(201).json({
    message: 'Preloved item created successfully.',
    data: newPrev
  });
});

// 28. Update Preloved Item
app.put('/api/preloved/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserAccount;
  const { id } = req.params;
  const { itemName, photoUrl, category, dateRepaired, serialNumber, remark, quantity } = req.body;

  const prevIdx = (dbCache.preloved || []).findIndex(i => i.id === id);
  if (prevIdx === -1) {
    res.status(404).json({ error: 'Preloved item not found.' });
    return;
  }

  const oldItem = dbCache.preloved[prevIdx];
  const nowIso = new Date().toISOString();

  const updatedItem: PrelovedItem = {
    ...oldItem,
    itemName: itemName !== undefined ? itemName.trim() : oldItem.itemName,
    photoUrl: photoUrl !== undefined ? photoUrl.trim() : oldItem.photoUrl,
    category: category !== undefined ? category : oldItem.category,
    dateRepaired: dateRepaired !== undefined ? dateRepaired.trim() : oldItem.dateRepaired,
    quantity: quantity !== undefined ? Math.max(1, parseInt(quantity) || 1) : (oldItem.quantity || 1),
    serialNumber: serialNumber !== undefined ? (serialNumber.trim() || null) : oldItem.serialNumber,
    remark: remark !== undefined ? (remark.trim() || null) : oldItem.remark,
    updatedAt: nowIso,
    updatedBy: user.username
  };

  dbCache.preloved[prevIdx] = updatedItem;

  const activity: ActivityRecord = {
    id: `act-${Date.now()}`,
    targetId: updatedItem.id,
    itemName: updatedItem.itemName,
    category: updatedItem.category,
    type: 'PRELOVED',
    action: 'Edited',
    username: user.username,
    timestamp: nowIso
  };
  dbCache.activities.unshift(activity);

  saveDB(dbCache);
  triggerAutoSync(`Update Preloved: ${updatedItem.itemName}`).catch(() => {});

  res.json({
    message: 'Preloved item updated successfully.',
    data: updatedItem
  });
});

// 29. Delete Preloved Item
app.delete('/api/preloved/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserAccount;
  const { id } = req.params;

  const item = (dbCache.preloved || []).find(i => i.id === id);
  if (!item) {
    res.status(404).json({ error: 'Preloved item not found.' });
    return;
  }

  dbCache.preloved = (dbCache.preloved || []).filter(i => i.id !== id);

  const activity: ActivityRecord = {
    id: `act-${Date.now()}`,
    targetId: id,
    itemName: item.itemName,
    category: item.category,
    type: 'PRELOVED',
    action: 'Deleted',
    username: user.username,
    timestamp: new Date().toISOString()
  };
  dbCache.activities.unshift(activity);

  saveDB(dbCache);
  triggerAutoSync(`Hapus Preloved: ${item.itemName}`).catch(() => {});

  res.json({ message: 'Preloved item deleted successfully.' });
});

// 30. Export Preloved to Excel
app.get('/api/export/excel-preloved', requireAuth, async (req: Request, res: Response) => {
  try {
    const { month, category, user, search } = req.query as Record<string, string>;

    const itemsToExport = sortPreloved(
      filterPreloved(dbCache.preloved || [], {
        month,
        category,
        user,
        search
      }),
      'date-newest'
    );

    const monthParsed = parseMonthFilter(month);
    const monthName = monthParsed ? `${MONTH_NAMES[monthParsed.month - 1]} ${monthParsed.year}` : 'ALL MONTHS';
    const worksheetTitle = monthParsed ? `PRELOVED_${MONTH_NAMES[monthParsed.month - 1]}` : 'PRELOVED_DATABASE';

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hotel IT Department';
    workbook.lastModifiedBy = ((req as any).user as UserAccount).username;
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheet = workbook.addWorksheet(worksheetTitle, {
      pageSetup: { orientation: 'landscape', fitToPage: true },
      views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }]
    });

    // Title Row 1
    sheet.mergeCells('A1:K1');
    const titleCell1 = sheet.getCell('A1');
    titleCell1.value = 'HOTEL IT - PRELOVED DATABASE';
    titleCell1.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell1.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell1.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E1B4B' }
    };
    sheet.getRow(1).height = 36;

    // Subtitle Row 2
    sheet.mergeCells('A2:K2');
    const titleCell2 = sheet.getCell('A2');
    titleCell2.value = `DATA BULAN ${monthName.toUpperCase()}${category && category !== 'All' ? ` • KATEGORI: ${category}` : ''}`;
    titleCell2.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell2.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell2.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF312E81' }
    };
    sheet.getRow(2).height = 28;

    // Spacing Row 3
    sheet.getRow(3).height = 10;

    // Table Header Row 4
    const headers = [
      'No',
      'Foto',
      'Item Name',
      'Category',
      'Tanggal Dibereskan',
      'Jumlah Unit',
      'Serial Number',
      'Remark',
      'Added By',
      'Last Edited By',
      'Last Updated'
    ];
    const headerRow = sheet.getRow(4);
    headerRow.values = headers;
    headerRow.height = 30;

    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF7C3AED' }
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF4338CA' } },
        bottom: { style: 'medium', color: { argb: 'FF4338CA' } },
        left: { style: 'thin', color: { argb: 'FFC4B5FD' } },
        right: { style: 'thin', color: { argb: 'FFC4B5FD' } }
      };
    });

    // Column widths
    sheet.columns = [
      { key: 'no', width: 6 },
      { key: 'photo', width: 14 },
      { key: 'name', width: 32 },
      { key: 'category', width: 22 },
      { key: 'dateRepaired', width: 20 },
      { key: 'quantity', width: 14 },
      { key: 'sn', width: 20 },
      { key: 'remark', width: 26 },
      { key: 'addedBy', width: 16 },
      { key: 'editedBy', width: 16 },
      { key: 'lastUpdated', width: 22 }
    ];

    sheet.autoFilter = 'A4:K4';

    let currentRowIdx = 5;
    for (let i = 0; i < itemsToExport.length; i++) {
      const item = itemsToExport[i];
      const row = sheet.getRow(currentRowIdx);
      row.height = 65;

      row.getCell(1).value = i + 1;
      row.getCell(2).value = '';
      row.getCell(3).value = item.itemName;
      row.getCell(4).value = item.category;
      row.getCell(5).value = formatDate(item.dateRepaired);
      row.getCell(6).value = item.quantity ?? 1;
      row.getCell(7).value = item.serialNumber || '-';
      row.getCell(8).value = item.remark || '-';
      row.getCell(9).value = item.createdBy;
      row.getCell(10).value = item.updatedBy;
      row.getCell(11).value = formatDateTime(item.updatedAt);

      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(8).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };

      const bgColor = i % 2 === 0 ? 'FFF5F3FF' : 'FFFFFFFF';
      for (let c = 1; c <= 11; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Arial', size: 9 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor }
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      }

      // Embed photo
      try {
        let imgBuffer: Buffer | null = null;
        let imgExt: 'png' | 'jpeg' = 'png';

        if (item.photoUrl && item.photoUrl.startsWith('data:image/')) {
          const match = item.photoUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
          if (match) {
            imgExt = match[1].includes('jpeg') || match[1].includes('jpg') ? 'jpeg' : 'png';
            imgBuffer = Buffer.from(match[2], 'base64');
          }
        } else if (item.photoUrl && item.photoUrl.startsWith('/uploads/')) {
          const diskPath = path.join(DATA_DIR, item.photoUrl);
          if (fs.existsSync(diskPath)) {
            imgBuffer = fs.readFileSync(diskPath);
            imgExt = diskPath.endsWith('.jpg') || diskPath.endsWith('.jpeg') ? 'jpeg' : 'png';
          }
        }

        if (imgBuffer && (imgExt === 'png' || imgExt === 'jpeg')) {
          const imageId = workbook.addImage({
            buffer: imgBuffer as any,
            extension: imgExt
          });
          sheet.addImage(imageId, {
            tl: { col: 1.15, row: currentRowIdx - 1 + 0.1 },
            ext: { width: 68, height: 55 }
          });
        }
      } catch (err) {
        console.warn('Could not embed image for Preloved item', item.id, err);
      }

      currentRowIdx++;
    }

    const safeMonthName = monthParsed ? `${MONTH_NAMES[monthParsed.month - 1]}_${monthParsed.year}` : 'ALL_MONTHS';
    const downloadFileName = `HOTEL_IT_PRELOVED_${safeMonthName}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Preloved Excel export error:', error);
    res.status(500).json({ error: 'Failed to generate Preloved Excel file.' });
  }
});

// ==========================================
// GOOGLE SPREADSHEET & DRIVE INTEGRATION ROUTES
// ==========================================

// 25. Get Google Integration Settings (Available for all authenticated users to read)
app.get('/api/settings/google', requireAuth, (req: Request, res: Response) => {
  res.json({ data: dbCache.googleIntegration });
});

// 26. Save Google Integration Settings (ONLY IT MANAGER)
app.post('/api/settings/google', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserAccount;
  if (user.role !== 'IT MANAGER') {
    res.status(403).json({
      error: 'Akses Ditolak: Hanya IT MANAGER yang berhak mengisi dan menyimpan URL Google Spreadsheet dan Google Drive.'
    });
    return;
  }

  const { spreadsheetUrl = '', driveFolderUrl = '', autoSyncEnabled } = req.body;
  const spreadsheetId = extractGoogleSpreadsheetId(spreadsheetUrl) || '';
  const driveFolderId = extractGoogleDriveFolderId(driveFolderUrl) || '';

  dbCache.googleIntegration = {
    ...dbCache.googleIntegration!,
    spreadsheetUrl: (spreadsheetUrl || '').trim(),
    spreadsheetId,
    driveFolderUrl: (driveFolderUrl || '').trim(),
    driveFolderId,
    autoSyncEnabled: typeof autoSyncEnabled === 'boolean' ? autoSyncEnabled : (dbCache.googleIntegration?.autoSyncEnabled ?? true)
  };

  saveDB(dbCache);

  res.json({
    message: 'Pengaturan Google Spreadsheet & Drive berhasil disimpan oleh IT MANAGER.',
    data: dbCache.googleIntegration
  });
});

// 27. Connect Google Account (ONLY IT MANAGER)
app.post('/api/settings/google/connect', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserAccount;
  if (user.role !== 'IT MANAGER') {
    res.status(403).json({
      error: 'Akses Ditolak: Hanya IT MANAGER yang berhak menghubungkan akun Google.'
    });
    return;
  }

  const { account, accessToken } = req.body;
  if (!account || !account.email) {
    res.status(400).json({ error: 'Informasi akun Google tidak valid.' });
    return;
  }

  dbCache.googleIntegration = {
    ...dbCache.googleIntegration!,
    connectedAccount: {
      email: account.email,
      name: account.name || account.email,
      photoUrl: account.photoUrl || '',
      connectedAt: new Date().toISOString(),
      connectedBy: user.username
    },
    cachedAccessToken: accessToken || dbCache.googleIntegration?.cachedAccessToken || null
  };

  dbCache.activities.unshift({
    id: `act-${Date.now()}`,
    itemName: `Google Drive & Sheets (${account.email})`,
    category: 'PC ITEMS',
    action: 'Edited',
    username: user.username,
    timestamp: new Date().toISOString()
  });

  saveDB(dbCache);

  res.json({
    message: 'Akun Google berhasil dihubungkan oleh IT MANAGER.',
    data: dbCache.googleIntegration
  });
});

// 28. Disconnect Google Account (ONLY IT MANAGER)
app.post('/api/settings/google/disconnect', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserAccount;
  if (user.role !== 'IT MANAGER') {
    res.status(403).json({
      error: 'Akses Ditolak: Hanya IT MANAGER yang berhak memutuskan koneksi akun Google.'
    });
    return;
  }

  dbCache.googleIntegration = {
    ...dbCache.googleIntegration!,
    connectedAccount: null,
    cachedAccessToken: null
  };

  dbCache.activities.unshift({
    id: `act-${Date.now()}`,
    itemName: 'Google Drive & Sheets Disconnected',
    category: 'PC ITEMS',
    action: 'Edited',
    username: user.username,
    timestamp: new Date().toISOString()
  });

  saveDB(dbCache);

  res.json({
    message: 'Koneksi akun Google telah berhasil diputuskan.',
    data: dbCache.googleIntegration
  });
});

// 29. Update Sync Status
app.post('/api/settings/google/sync-status', requireAuth, (req: Request, res: Response) => {
  const { status, message, syncedInventoryCount, syncedPOCount, syncedPrelovedCount, syncedCount } = req.body;

  dbCache.googleIntegration = {
    ...dbCache.googleIntegration!,
    lastSyncedAt: new Date().toISOString(),
    lastSyncStatus: status,
    lastSyncMessage: message,
    syncedInventoryCount: typeof syncedInventoryCount === 'number' ? syncedInventoryCount : (typeof syncedCount === 'number' ? syncedCount : dbCache.inventory.length),
    syncedPOCount: typeof syncedPOCount === 'number' ? syncedPOCount : (dbCache.purchaseOrders || []).length,
    syncedPrelovedCount: typeof syncedPrelovedCount === 'number' ? syncedPrelovedCount : (dbCache.preloved || []).length
  };

  saveDB(dbCache);
  res.json({ success: true, data: dbCache.googleIntegration });
});

// 30. Sync inventory items with Google Drive photo URLs back to DB
app.post('/api/settings/google/sync-items', requireAuth, (req: Request, res: Response) => {
  const { items } = req.body;
  if (Array.isArray(items)) {
    let updatedCount = 0;
    for (const updatedItem of items) {
      const idx = dbCache.inventory.findIndex(i => i.id === updatedItem.id);
      if (idx !== -1 && updatedItem.photoUrl && updatedItem.photoUrl !== dbCache.inventory[idx].photoUrl) {
        dbCache.inventory[idx].photoUrl = updatedItem.photoUrl;
        updatedCount++;
      }
    }
    if (updatedCount > 0) {
      saveDB(dbCache);
    }
  }
  res.json({ success: true, total: dbCache.inventory.length });
});

// 31. Sync Purchase Order items with Google Drive photo URLs back to DB
app.post('/api/settings/google/sync-po-items', requireAuth, (req: Request, res: Response) => {
  const { items } = req.body;
  if (Array.isArray(items) && dbCache.purchaseOrders) {
    let updatedCount = 0;
    for (const updatedPO of items) {
      const idx = dbCache.purchaseOrders.findIndex(p => p.id === updatedPO.id);
      if (idx !== -1 && updatedPO.photoUrl && updatedPO.photoUrl !== dbCache.purchaseOrders[idx].photoUrl) {
        dbCache.purchaseOrders[idx].photoUrl = updatedPO.photoUrl;
        updatedCount++;
      }
    }
    if (updatedCount > 0) {
      saveDB(dbCache);
    }
  }
  res.json({ success: true, total: (dbCache.purchaseOrders || []).length });
});

// 32. Sync Preloved items with Google Drive photo URLs back to DB
app.post('/api/settings/google/sync-preloved-items', requireAuth, (req: Request, res: Response) => {
  const { items } = req.body;
  if (Array.isArray(items) && dbCache.preloved) {
    let updatedCount = 0;
    for (const updatedItem of items) {
      const idx = dbCache.preloved.findIndex(p => p.id === updatedItem.id);
      if (idx !== -1 && updatedItem.photoUrl && updatedItem.photoUrl !== dbCache.preloved[idx].photoUrl) {
        dbCache.preloved[idx].photoUrl = updatedItem.photoUrl;
        updatedCount++;
      }
    }
    if (updatedCount > 0) {
      saveDB(dbCache);
    }
  }
  res.json({ success: true, total: (dbCache.preloved || []).length });
});

// 32. Trigger Auto-Sync on Demand or After Data Change
app.post('/api/settings/google/trigger-auto-sync', requireAuth, (req: Request, res: Response) => {
  const { accessToken, reason } = req.body;
  if (accessToken && typeof accessToken === 'string' && dbCache.googleIntegration) {
    dbCache.googleIntegration.cachedAccessToken = accessToken;
  }

  // Trigger sync asynchronously in background
  triggerAutoSync(reason || 'Data baru dimasukkan').catch(err => {
    console.warn('triggerAutoSync endpoint error:', err);
  });

  res.json({
    success: true,
    message: 'Auto-sync process initiated.',
    data: dbCache.googleIntegration
  });
});

// Setup Vite development or production static server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

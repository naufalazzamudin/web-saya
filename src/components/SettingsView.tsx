import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  User,
  HardDrive,
  LogOut,
  Sun,
  Moon,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FolderGit2,
  RefreshCw,
  Lock,
  Unlock,
  Check,
  Info,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { GoogleIntegrationSettings, InventoryItem, PrelovedItem } from '../lib/types';
import {
  fetchGoogleSettings,
  saveGoogleSettings,
  saveGoogleAccountConnection,
  disconnectGoogleAccountApi,
  recordGoogleSyncStatus,
  syncUpdatedInventoryItemsToServer,
  syncUpdatedPOItemsToServer,
  syncUpdatedPrelovedItemsToServer,
  fetchInventory,
  fetchPurchaseOrders,
  fetchPreloved
} from '../lib/api';
import {
  extractGoogleSpreadsheetId,
  extractGoogleDriveFolderId,
  validateGoogleConfig
} from '../lib/google-logic';
import {
  signInWithGoogle,
  signOutGoogle,
  getGoogleAccessToken,
  testSpreadsheetAccess,
  testDriveFolderAccess,
  syncAllInventoryToSheets,
  syncAllPurchaseOrdersToSheets,
  syncAllPrelovedToSheets,
  syncEverythingToSheets
} from '../lib/google-auth';


interface SettingsViewProps {
  onLogout: () => void;
  onOpenUserManagement: () => void;
  onToast?: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onLogout,
  onOpenUserManagement,
  onToast
}) => {
  const { user } = useAuth();
  const isItManager = user?.role === 'IT MANAGER';

  const [theme, setTheme] = useState<'light' | 'system'>('light');

  // Google Integration State
  const [googleSettings, setGoogleSettings] = useState<GoogleIntegrationSettings>({
    spreadsheetUrl: '',
    spreadsheetId: '',
    driveFolderUrl: '',
    driveFolderId: '',
    connectedAccount: null,
    lastSyncedAt: null,
    lastSyncStatus: 'idle',
    lastSyncMessage: null,
    syncedInventoryCount: 0
  });

  const [spreadsheetUrlInput, setSpreadsheetUrlInput] = useState('');
  const [driveFolderUrlInput, setDriveFolderUrlInput] = useState('');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    spreadsheetTitle?: string;
    folderName?: string;
    message: string;
  } | null>(null);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgressMsg, setSyncProgressMsg] = useState('');
  const [syncProgressPercent, setSyncProgressPercent] = useState(0);
  const [showSyncConfirmModal, setShowSyncConfirmModal] = useState(false);

  // Load Google settings from server (persisted globally across all users)
  const loadSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const data = await fetchGoogleSettings();
      setGoogleSettings(data);
      setSpreadsheetUrlInput(data.spreadsheetUrl || '');
      setDriveFolderUrlInput(data.driveFolderUrl || '');
      setAutoSyncEnabled(data.autoSyncEnabled !== false);
    } catch (err: any) {
      console.error('Error loading Google settings:', err);
      if (onToast) onToast('Gagal memuat pengaturan Google dari server.', 'error');
    } finally {
      setIsLoadingSettings(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Handle Google Login (IT MANAGER Only)
  const handleGoogleSignIn = async () => {
    if (!isItManager) {
      if (onToast) onToast('Hanya IT MANAGER yang dapat menghubungkan akun Google.', 'error');
      return;
    }

    setIsConnectingGoogle(true);
    try {
      const { user: gUser, accessToken } = await signInWithGoogle();
      const accountInfo = {
        email: gUser.email || '',
        name: gUser.displayName || gUser.email || 'Google User',
        photoUrl: gUser.photoURL || undefined,
        connectedAt: new Date().toISOString(),
        connectedBy: user?.username || 'ITMANAGER'
      };

      const res = await saveGoogleAccountConnection({
        account: accountInfo,
        accessToken
      });

      setGoogleSettings(res.data);
      if (onToast) onToast(`Akun Google (${accountInfo.email}) berhasil dihubungkan oleh IT MANAGER!`, 'success');
    } catch (err: any) {
      console.error('Google sign in error:', err);
      if (onToast) onToast(err.message || 'Gagal masuk dengan akun Google.', 'error');
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  // Handle Google Sign Out (IT MANAGER Only)
  const handleGoogleDisconnect = async () => {
    if (!isItManager) {
      if (onToast) onToast('Hanya IT MANAGER yang dapat memutuskan akun Google.', 'error');
      return;
    }

    const confirm = window.confirm('Apakah Anda yakin ingin memutuskan hubungan akun Google dari sistem?');
    if (!confirm) return;

    try {
      await signOutGoogle();
      const res = await disconnectGoogleAccountApi();
      setGoogleSettings(res.data);
      setTestResult(null);
      if (onToast) onToast('Koneksi akun Google berhasil diputuskan.', 'info');
    } catch (err: any) {
      if (onToast) onToast(err.message || 'Gagal memutuskan akun Google.', 'error');
    }
  };

  // Save URLs (IT MANAGER Only)
  const handleSaveGoogleUrls = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isItManager) {
      if (onToast) onToast('Hanya IT MANAGER yang berhak mengubah URL Google Spreadsheet & Drive.', 'error');
      return;
    }

    const validation = validateGoogleConfig(spreadsheetUrlInput, driveFolderUrlInput);
    if (!validation.valid) {
      const firstError = validation.errors.spreadsheetUrl || validation.errors.driveFolderUrl;
      if (onToast) onToast(firstError || 'URL tidak valid.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await saveGoogleSettings({
        spreadsheetUrl: spreadsheetUrlInput.trim(),
        driveFolderUrl: driveFolderUrlInput.trim(),
        autoSyncEnabled
      });
      setGoogleSettings(res.data);
      setTestResult(null);
      if (onToast) onToast('Pengaturan Google Spreadsheet & Google Drive berhasil disimpan secara permanen!', 'success');
    } catch (err: any) {
      if (onToast) onToast(err.message || 'Gagal menyimpan URL Google.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Live Auto-Sync (IT MANAGER Only)
  const handleToggleAutoSync = async (enabled: boolean) => {
    if (!isItManager) {
      if (onToast) onToast('Hanya IT MANAGER yang berhak mengubah mode sinkronisasi otomatis.', 'error');
      return;
    }

    setAutoSyncEnabled(enabled);
    try {
      const res = await saveGoogleSettings({
        spreadsheetUrl: spreadsheetUrlInput.trim() || googleSettings.spreadsheetUrl,
        driveFolderUrl: driveFolderUrlInput.trim() || googleSettings.driveFolderUrl,
        autoSyncEnabled: enabled
      });
      setGoogleSettings(res.data);
      if (onToast) {
        onToast(
          enabled
            ? 'Live Auto-Sync diaktifkan! Data inventaris & PO otomatis tersinkron setiap dimasukkan.'
            : 'Sinkronisasi otomatis dinonaktifkan.',
          'success'
        );
      }
    } catch (err: any) {
      if (onToast) onToast(err.message || 'Gagal mengubah pengaturan Auto-Sync.', 'error');
    }
  };

  // Test Connection
  const handleTestConnection = async () => {
    const spreadsheetId = extractGoogleSpreadsheetId(spreadsheetUrlInput);
    const driveFolderId = extractGoogleDriveFolderId(driveFolderUrlInput);

    if (!spreadsheetId || !driveFolderId) {
      if (onToast) onToast('Harap isi URL Google Spreadsheet dan URL Folder Drive yang valid terlebih dahulu.', 'error');
      return;
    }

    let token = getGoogleAccessToken();
    if (!token) {
      if (isItManager) {
        try {
          const authRes = await signInWithGoogle();
          token = authRes.accessToken;
        } catch {
          if (onToast) onToast('Harap hubungkan akun Google terlebih dahulu untuk menguji akses.', 'error');
          return;
        }
      } else {
        if (onToast) onToast('Token Google belum aktif. Minta IT MANAGER untuk login akun Google.', 'error');
        return;
      }
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const [sheetTest, driveTest] = await Promise.all([
        testSpreadsheetAccess(token, spreadsheetId),
        testDriveFolderAccess(token, driveFolderId)
      ]);

      setTestResult({
        success: true,
        spreadsheetTitle: sheetTest.title,
        folderName: driveTest.folderName,
        message: `Koneksi Berhasil! Terhubung ke Spreadsheet "${sheetTest.title}" dan Folder Drive "${driveTest.folderName}".`
      });

      if (onToast) onToast('Koneksi Google Spreadsheet & Drive berhasil diverifikasi!', 'success');
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Gagal menguji koneksi Google Spreadsheet atau Google Drive.'
      });
      if (onToast) onToast(err.message || 'Uji koneksi gagal.', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  // Execute Synchronization
  const handleExecuteSync = async () => {
    setShowSyncConfirmModal(false);

    const spreadsheetId = googleSettings.spreadsheetId || extractGoogleSpreadsheetId(spreadsheetUrlInput);
    const driveFolderId = googleSettings.driveFolderId || extractGoogleDriveFolderId(driveFolderUrlInput);

    if (!spreadsheetId || !driveFolderId) {
      if (onToast) onToast('URL Google Spreadsheet dan Folder Drive belum dikonfigurasi.', 'error');
      return;
    }

    let token = getGoogleAccessToken();
    if (!token) {
      if (isItManager) {
        try {
          const authRes = await signInWithGoogle();
          token = authRes.accessToken;
        } catch {
          if (onToast) onToast('Koneksi Google memerlukan login akun oleh IT MANAGER.', 'error');
          return;
        }
      } else {
        if (onToast) onToast('Koneksi Google belum aktif. Minta IT MANAGER untuk menghubungkan akun Google.', 'error');
        return;
      }
    }

    setIsSyncing(true);
    setSyncProgressMsg('Memuat data inventaris, Purchase Order & Preloved...');
    setSyncProgressPercent(10);

    try {
      // 1. Fetch all inventory, purchase orders, and preloved items
      const [invRes, poRes, prevRes] = await Promise.all([
        fetchInventory({}, 1, 1000),
        fetchPurchaseOrders({}, 1, 1000),
        fetchPreloved({}, 1, 1000)
      ]);
      const invItems = invRes.data;
      const poItems = poRes.data;
      const prevItems = prevRes.data;

      setSyncProgressMsg(`Memulai sinkronisasi ${invItems.length} inventaris, ${poItems.length} PO & ${prevItems.length} preloved...`);
      setSyncProgressPercent(15);

      // 2. Sync Inventory to Sheets & Drive
      const invSyncResult = await syncAllInventoryToSheets(
        token,
        spreadsheetId,
        driveFolderId,
        invItems,
        (msg, cur, tot) => {
          setSyncProgressMsg(`[1/3 Inventaris] ${msg}`);
          const pct = Math.min(15 + Math.round((cur / (tot || 1)) * 25), 40);
          setSyncProgressPercent(pct);
        }
      );

      // Update inventory photo URLs on server
      await syncUpdatedInventoryItemsToServer(invSyncResult.updatedItems);

      // 3. Sync Purchase Orders to Sheets & Drive
      setSyncProgressMsg('[2/3 Purchase Order] Memproses data & foto pesanan...');
      setSyncProgressPercent(45);

      const poSyncResult = await syncAllPurchaseOrdersToSheets(
        token,
        spreadsheetId,
        driveFolderId,
        poItems,
        (msg, cur, tot) => {
          setSyncProgressMsg(`[2/3 Purchase Order] ${msg}`);
          const pct = Math.min(45 + Math.round((cur / (tot || 1)) * 25), 70);
          setSyncProgressPercent(pct);
        }
      );

      // Update PO photo URLs on server
      await syncUpdatedPOItemsToServer(poSyncResult.updatedItems);

      // 4. Sync Preloved to Sheets & Drive
      setSyncProgressMsg('[3/3 Preloved] Memproses data & foto preloved...');
      setSyncProgressPercent(75);

      const prevSyncResult = await syncAllPrelovedToSheets(
        token,
        spreadsheetId,
        driveFolderId,
        prevItems,
        (msg, cur, tot) => {
          setSyncProgressMsg(`[3/3 Preloved] ${msg}`);
          const pct = Math.min(75 + Math.round((cur / (tot || 1)) * 20), 95);
          setSyncProgressPercent(pct);
        }
      );

      // Update Preloved photo URLs on server
      await syncUpdatedPrelovedItemsToServer(prevSyncResult.updatedItems);

      // 5. Record sync status on server
      await recordGoogleSyncStatus({
        status: 'success',
        message: `Sinkronisasi berhasil: ${invSyncResult.count} inventaris, ${poSyncResult.count} PO, & ${prevSyncResult.count} preloved tersinkron rapi ke Google Spreadsheet & Drive.`,
        syncedInventoryCount: invSyncResult.count,
        syncedPOCount: poSyncResult.count,
        syncedPrelovedCount: prevSyncResult.count
      });

      setSyncProgressPercent(100);
      setSyncProgressMsg('Sinkronisasi Inventaris, PO & Preloved selesai 100%!');

      // Reload settings to update UI
      await loadSettings();

      if (onToast) {
        onToast(`Berhasil menyinkronkan ${invSyncResult.count} inventaris, ${poSyncResult.count} PO & ${prevSyncResult.count} preloved ke Google Spreadsheet!`, 'success');
      }
    } catch (err: any) {
      console.error('Sync error:', err);
      await recordGoogleSyncStatus({
        status: 'failed',
        message: err.message || 'Gagal menyinkronkan ke Google Spreadsheet.'
      });
      await loadSettings();
      if (onToast) onToast(err.message || 'Sinkronisasi gagal.', 'error');
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
        setSyncProgressMsg('');
        setSyncProgressPercent(0);
      }, 1500);
    }
  };


  const detectedSpreadsheetId = extractGoogleSpreadsheetId(spreadsheetUrlInput);
  const detectedDriveFolderId = extractGoogleDriveFolderId(driveFolderUrlInput);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
          <Settings className="w-4 h-4" />
          <span>Application Preferences</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          SYSTEM SETTINGS & CLOUD DATABASE
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Kelola preferensi sistem, akun staf, dan integrasi Google Spreadsheet & Google Drive
        </p>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-8">
        {/* ========================================================= */}
        {/* SECTION: GOOGLE SPREADSHEET & DRIVE CLOUD DATABASE       */}
        {/* ========================================================= */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 shadow-md border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10 shrink-0">
                <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black tracking-tight text-white">
                    Google Spreadsheet & Google Drive Database
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live Cloud Sync
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Sinkronisasi database Inventaris & Purchase Order ke Google Spreadsheet dan penyimpanan foto ke Google Drive
                </p>
              </div>
            </div>

            {/* Role indicator badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold self-start sm:self-auto">
              {isItManager ? (
                <>
                  <Unlock className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300 font-bold">Akses IT MANAGER (Penuh)</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-300 font-bold">Kunci IT MANAGER (Hanya Baca)</span>
                </>
              )}
            </div>
          </div>

          {/* Info Banner for Access Permission */}
          <div className="mt-4 p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-white">Ketentuan Pengisian: </strong>
              Hanya <span className="text-amber-300 font-bold">IT MANAGER</span> yang boleh mengisi login Google dan kolom URL. Pengaturan dan login Google yang diisi IT MANAGER tersimpan permanen di server dan tetap berlaku bagi seluruh pengguna (IT ASSIST & IT TRAINEE) tanpa ter-reset saat berganti akun.
            </div>
          </div>

          {/* Google Account Connection Status */}
          <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                1. Status Login Akun Google
              </span>
              {googleSettings.connectedAccount && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Terhubung
                </span>
              )}
            </div>

            {googleSettings.connectedAccount ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/10 border border-white/10">
                <div className="flex items-center gap-3">
                  {googleSettings.connectedAccount.photoUrl ? (
                    <img
                      src={googleSettings.connectedAccount.photoUrl}
                      alt="Google Avatar"
                      className="w-10 h-10 rounded-full border border-white/20"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white">
                      {googleSettings.connectedAccount.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{googleSettings.connectedAccount.name}</span>
                      <span className="text-[11px] font-normal text-slate-300">
                        ({googleSettings.connectedAccount.email})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>Dihubungkan oleh: <strong className="text-white">{googleSettings.connectedAccount.connectedBy}</strong></span>
                      <span>•</span>
                      <span>Izin: Google Sheets & Google Drive File</span>
                    </div>
                  </div>
                </div>

                {isItManager ? (
                  <button
                    type="button"
                    onClick={handleGoogleDisconnect}
                    className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-300 border border-rose-500/30 transition-colors"
                  >
                    Putuskan Akun
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Dikelola oleh IT MANAGER</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-xs text-slate-300">
                  <div className="font-semibold text-white">Akun Google Belum Dihubungkan</div>
                  <div className="text-slate-400 mt-0.5">
                    Hubungkan akun Google untuk memberikan izin baca & tulis ke Google Spreadsheet dan Google Drive.
                  </div>
                </div>

                {isItManager ? (
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isConnectingGoogle}
                    className="inline-flex items-center gap-2.5 px-4 py-2 bg-white text-slate-900 rounded-xl font-bold text-xs hover:bg-slate-100 transition-all shadow-sm shrink-0 disabled:opacity-50"
                  >
                    {isConnectingGoogle ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                      </svg>
                    )}
                    <span>Hubungkan Akun Google</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-semibold">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Menunggu IT MANAGER untuk login</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form for URLs */}
          <form onSubmit={handleSaveGoogleUrls} className="mt-6 pt-6 border-t border-white/10 space-y-5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
              2. Konfigurasi Link Google Spreadsheet & Google Drive
            </div>

            {/* Field 1: Spreadsheet URL */}
            <div className="space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>URL Google Spreadsheet Database</span>
                  {!isItManager && <Lock className="w-3 h-3 text-amber-400 inline" />}
                </label>
                <span className="text-[11px] text-amber-300 font-medium">
                  *Link spreadsheet harus izinkan edit untuk semua yang memiliki link
                </span>
              </div>
              <div className="relative">
                <input
                  type="url"
                  value={spreadsheetUrlInput}
                  onChange={(e) => setSpreadsheetUrlInput(e.target.value)}
                  disabled={!isItManager || isSaving}
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono transition-colors border ${
                    !isItManager
                      ? 'bg-white/5 border-white/10 text-slate-300 cursor-not-allowed'
                      : 'bg-white/10 border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400'
                  }`}
                />
                {detectedSpreadsheetId && (
                  <div className="absolute right-3 top-2.5 flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
                    <Check className="w-3 h-3" />
                    <span>ID Terdeteksi</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Kolom dalam Spreadsheet: <strong>NO, ID, FOTO BARANG (DRIVE URL), NAMA, KATEGORI, TANGGAL, SN, REMARK, DITAMBAHKAN, DIUBAH, UPDATE</strong></span>
                {detectedSpreadsheetId && (
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${detectedSpreadsheetId}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-300 hover:text-indigo-200 underline font-semibold shrink-0"
                  >
                    <span>Buka Spreadsheet</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Field 2: Drive Folder URL */}
            <div className="space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FolderGit2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>URL Folder Google Drive (Penyimpanan Foto Barang)</span>
                  {!isItManager && <Lock className="w-3 h-3 text-amber-400 inline" />}
                </label>
                <span className="text-[11px] text-amber-300 font-medium">
                  *Link folder harus izinkan edit untuk semua yang memiliki link
                </span>
              </div>
              <div className="relative">
                <input
                  type="url"
                  value={driveFolderUrlInput}
                  onChange={(e) => setDriveFolderUrlInput(e.target.value)}
                  disabled={!isItManager || isSaving}
                  placeholder="https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j_KLMNOPQRSTUV?usp=sharing"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono transition-colors border ${
                    !isItManager
                      ? 'bg-white/5 border-white/10 text-slate-300 cursor-not-allowed'
                      : 'bg-white/10 border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400'
                  }`}
                />
                {detectedDriveFolderId && (
                  <div className="absolute right-3 top-2.5 flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
                    <Check className="w-3 h-3" />
                    <span>ID Terdeteksi</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Foto yang diupload otomatis disimpan ke folder ini dan link dibagikan di Spreadsheet.</span>
                {detectedDriveFolderId && (
                  <a
                    href={`https://drive.google.com/drive/folders/${detectedDriveFolderId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-300 hover:text-indigo-200 underline font-semibold shrink-0"
                  >
                    <span>Buka Folder Drive</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Field 3: Automatic Synchronization Toggle Card */}
            <div className="p-4 rounded-2xl bg-white/10 border border-white/10 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">Sinkronisasi Otomatis (Live Auto-Sync)</span>
                      {autoSyncEnabled ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          AKTIF
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">
                          NONAKTIF
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Setiap data Inventaris & Purchase Order yang dimasukkan, diperbarui, atau dihapus akan otomatis tersinkron ke Google Spreadsheet dan fotonya langsung diunggah ke Google Drive.
                    </p>
                  </div>
                </div>

                {isItManager ? (
                  <button
                    type="button"
                    onClick={() => handleToggleAutoSync(!autoSyncEnabled)}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors shrink-0 ${
                      autoSyncEnabled
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-white/10 hover:bg-white/20 text-slate-200'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{autoSyncEnabled ? 'Auto-Sync Aktif' : 'Aktifkan Auto-Sync'}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 shrink-0">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Status diatur oleh IT MANAGER</span>
                  </div>
                )}
              </div>
            </div>

            {/* Test result message if any */}
            {testResult && (
              <div
                className={`p-3.5 rounded-2xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                  testResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">{testResult.message}</div>
                  {testResult.success && (
                    <div className="text-[11px] text-slate-300 mt-0.5">
                      Spreadsheet & Folder Drive siap digunakan untuk sinkronisasi otomatis Inventaris & Purchase Order.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isItManager && (
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-sm transition-colors disabled:opacity-50"
                  >
                    {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Simpan Pengaturan URL</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="flex items-center gap-2 px-3.5 py-2 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs rounded-xl border border-white/10 transition-colors disabled:opacity-50"
                >
                  {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>Uji Akses Koneksi</span>
                </button>
              </div>

              {/* Sync Button */}
              <button
                type="button"
                onClick={() => setShowSyncConfirmModal(true)}
                disabled={isSyncing || (!googleSettings.spreadsheetId && !detectedSpreadsheetId)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sinkronkan Sekarang ke Google Spreadsheet (Inventaris, PO & Preloved)</span>
              </button>
            </div>
          </form>

          {/* Sync Progress Bar */}
          {isSyncing && (
            <div className="mt-5 p-4 rounded-2xl bg-white/10 border border-white/15 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>{syncProgressMsg}</span>
                </span>
                <span>{syncProgressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-300"
                  style={{ width: `${syncProgressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Sync History / Last Status */}
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
            <div>
              <span className="text-slate-400">Terakhir disinkronkan: </span>
              <strong className="text-white">
                {googleSettings.lastSyncedAt
                  ? new Date(googleSettings.lastSyncedAt).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : 'Belum pernah disinkronkan'}
              </strong>
              {((googleSettings.syncedInventoryCount !== undefined && googleSettings.syncedInventoryCount > 0) ||
                (googleSettings.syncedPOCount !== undefined && googleSettings.syncedPOCount > 0) ||
                (googleSettings.syncedPrelovedCount !== undefined && googleSettings.syncedPrelovedCount > 0)) && (
                <span className="ml-2 inline-flex items-center gap-1.5 text-xs flex-wrap">
                  <span className="text-emerald-400 font-semibold">
                    ({googleSettings.syncedInventoryCount ?? 0} Inventaris
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-sky-400 font-semibold">
                    {googleSettings.syncedPOCount ?? 0} PO
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-purple-400 font-semibold">
                    {googleSettings.syncedPrelovedCount ?? 0} Preloved tersinkron)
                  </span>
                </span>
              )}
            </div>

            {googleSettings.lastSyncMessage && (
              <span className="text-[11px] text-slate-400 truncate max-w-sm">
                Status: {googleSettings.lastSyncMessage}
              </span>
            )}
          </div>
        </div>

        {/* App Info */}
        <div className="pb-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-slate-900">Application Name</div>
            <div className="text-xs text-slate-500 mt-0.5">Hotel IT Department Inventory Management System</div>
          </div>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100">
            v1.2.0 Cloud Connected
          </span>
        </div>

        {/* Current User */}
        <div className="pb-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">{user?.username}</div>
              <div className="text-xs text-slate-500 font-medium">Role: {user?.role}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenUserManagement}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors"
          >
            Manage Credentials
          </button>
        </div>

        {/* Theme preference */}
        <div className="pb-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-slate-900">Theme Preference</div>
            <div className="text-xs text-slate-500 mt-0.5">Hotel IT Professional Clean Light theme</div>
          </div>
          <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                theme === 'light' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-600'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                theme === 'system' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-600'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-500" />
              <span>System</span>
            </button>
          </div>
        </div>

        {/* Storage & Persistence Status */}
        <div className="pb-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Persistent Storage Status</div>
              <div className="text-xs text-emerald-600 font-semibold">Active & Synced to Server Database + Google Cloud</div>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">data/db.json</span>
        </div>

        {/* Logout */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Current User</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Google Sync (Workspace Safety Guideline) */}
      {showSyncConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Konfirmasi Sinkronisasi Google</h3>
                <p className="text-xs text-slate-500">Google Spreadsheet & Drive (Inventaris, PO & Preloved)</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menyinkronkan seluruh database <strong>Inventaris</strong>, <strong>Purchase Order</strong>, dan <strong>Preloved</strong> ke Google Spreadsheet?
            </p>

            <ul className="text-xs text-slate-600 space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Foto inventaris, PO, dan Preloved akan diunggah ke Google Drive.</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Tab <strong>INVENTORY DATABASE</strong> akan diperbarui dengan data dan foto Drive.</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Tab <strong>PURCHASE ORDER DATABASE</strong> akan diperbarui dengan data pesanan dan foto Drive.</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Tab <strong>PRELOVED DATABASE</strong> akan diperbarui dengan data barang preloved dan foto Drive.</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Data di server lokal akan tetap tersimpan aman.</span>
              </li>
            </ul>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowSyncConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteSync}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-sm"
              >
                Ya, Mulai Sinkronisasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

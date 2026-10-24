import React, { useState } from 'react';
import {
  Settings,
  Shield,
  User,
  HardDrive,
  LogOut,
  Sun,
  Moon,
  Database,
  CheckCircle2,
  Server,
  Key
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
  const [theme, setTheme] = useState<'light' | 'system'>('light');

  const handleThemeChange = (newTheme: 'light' | 'system') => {
    setTheme(newTheme);
    if (onToast) {
      onToast(`Tema diatur ke ${newTheme === 'light' ? 'Light' : 'System'}.`, 'info');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  SYSTEM SETTINGS
                </span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Standalone & Portable
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
                Pengaturan Sistem & Profil
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Konfigurasi aplikasi internal Hotel IT Inventory, preferensi akun, dan status database
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenUserManagement}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md transition-all"
            >
              <Key className="w-4 h-4" />
              <span>Kelola Akun & Password</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Settings Cards */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {/* App Info Section */}
        <div className="pb-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Hotel IT Department Inventory Management System</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Aplikasi mandiri untuk mengelola stok perangkat komputer, jaringan, CCTV/TV, PO, dan barang preloved.
            </div>
          </div>
          <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-mono font-bold rounded-xl border border-slate-200 self-start sm:self-auto">
            v2.0.0 Modular Edition
          </span>
        </div>

        {/* Current User Card */}
        <div className="pb-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900">{user?.username}</div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
                <span>Peran: <strong className="text-indigo-600 font-bold">{user?.role}</strong></span>
                <span>•</span>
                <span>ID: {user?.id}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenUserManagement}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors self-start sm:self-auto"
          >
            Ubah Username / Password
          </button>
        </div>

        {/* Database & Storage Status */}
        <div className="pb-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Database & Penyimpanan Lokal Terenkripsi</span>
                <span className="px-2 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 rounded font-bold">
                  Active
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Semua data inventaris, PO, preloved, dan riwayat aktivitas tersimpan secara permanen dan aman di server.
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500 font-mono bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
            data/db.json
          </div>
        </div>

        {/* Server Architecture & Deployment Compatibility */}
        <div className="pb-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">
                Arsitektur & Kompatibilitas Hosting
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Desain arsitektur mandiri (Node.js/Express + React Vite), siap dideploy ke VPS, Docker, Railway, Render, atau Vercel.
              </div>
            </div>
          </div>
          <span className="px-3 py-1.5 bg-sky-50 text-sky-700 text-xs font-semibold rounded-xl border border-sky-100 self-start sm:self-auto">
            Port: {window.location.port || '3000'} • Host: 0.0.0.0
          </span>
        </div>

        {/* Theme Preference */}
        <div className="pb-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-slate-900">Preferensi Tampilan (Theme)</div>
            <div className="text-xs text-slate-500 mt-0.5">
              Tema bersih bernuansa profesional untuk operasional IT Hotel
            </div>
          </div>
          <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleThemeChange('light')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                theme === 'light'
                  ? 'bg-white shadow-xs text-slate-900 border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Light Theme</span>
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange('system')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                theme === 'system'
                  ? 'bg-white shadow-xs text-slate-900 border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-500" />
              <span>System</span>
            </button>
          </div>
        </div>

        {/* Security & Access */}
        <div className="pb-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Keamanan & Otorisasi Sistem</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Dilindungi autentikasi sesi bertoken, hashing bcrypt, serta kode rahasia otorisasi untuk manajemen user.
              </div>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-50 text-amber-800 text-xs font-bold rounded-xl border border-amber-200/60 self-start sm:self-auto">
            Bcrypt Protected
          </span>
        </div>

        {/* Logout Action */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-400">
            Keluar dari sesi login perangkat ini dengan aman
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Akun (Logout)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

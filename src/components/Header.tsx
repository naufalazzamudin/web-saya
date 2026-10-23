import React from 'react';
import { Menu, LogOut, Shield, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RealTimeClock } from './RealTimeClock';

interface HeaderProps {
  onToggleSidebar: () => void;
  onLogout: () => void;
  sheetStatus?: {
    isEnabled: boolean;
    title?: string;
    syncStatus?: 'synced' | 'syncing' | 'pending' | 'failed';
    lastSyncTime?: string | null;
  };
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, onLogout, sheetStatus, onOpenSettings }) => {
  const { user } = useAuth();

  const getStatusBadge = () => {
    if (!sheetStatus?.isEnabled) return null;

    const st = sheetStatus.syncStatus || 'synced';
    if (st === 'syncing') {
      return (
        <button
          type="button"
          onClick={onOpenSettings}
          className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-[10px] font-bold transition-colors cursor-pointer"
          title="Sedang menyinkronkan data dengan Google Spreadsheet..."
        >
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
          <span>Syncing Realtime...</span>
        </button>
      );
    }
    if (st === 'failed') {
      return (
        <button
          type="button"
          onClick={onOpenSettings}
          className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[10px] font-bold transition-colors cursor-pointer"
          title="Sinkronisasi Google Spreadsheet gagal. Klik untuk memeriksa pengaturan."
        >
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          <span>Sync Error</span>
        </button>
      );
    }
    if (st === 'pending') {
      return (
        <button
          type="button"
          onClick={onOpenSettings}
          className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-[10px] font-bold transition-colors cursor-pointer"
          title="Sinkronisasi pending. Klik untuk memeriksa."
        >
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>DATABASE WEB IT (Pending)</span>
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={onOpenSettings}
        className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-bold transition-colors cursor-pointer"
        title={`Terhubung ke Google Spreadsheet: ${sheetStatus.title || 'DATABASE WEB IT'}`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>DATABASE WEB IT (Live)</span>
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger & Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation menu"
            className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl lg:hidden transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none">
                  HOTEL IT INVENTORY
                </h1>
                {getStatusBadge()}
              </div>
              <p className="text-[10px] sm:text-xs font-medium text-slate-500 hidden sm:block">
                IT Department Inventory Management System
              </p>
            </div>
          </div>
        </div>

        {/* Right: User, Real-Time Clock, and Logout */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* User info */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-bold text-slate-900 leading-tight">
                {user?.username || 'IT STAFF'}
              </div>
              <div className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">
                {user?.role || 'STAFF'}
              </div>
            </div>
          </div>

          {/* Real-Time Date & Clock */}
          <div className="hidden sm:block pl-3 border-l border-slate-200">
            <RealTimeClock />
          </div>

          {/* Logout button */}
          <button
            type="button"
            onClick={onLogout}
            title="Logout"
            aria-label="Logout"
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-100"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

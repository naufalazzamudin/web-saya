import React from 'react';
import {
  Plus,
  Boxes,
  ShoppingCart,
  FileSpreadsheet,
  Calendar,
  CalendarRange,
  Settings,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CloudCheck,
  Clock,
  Layers
} from 'lucide-react';
import type { InventoryStats, POStats, PrelovedStats, POStatus, Category } from '../lib/types';
import type { NavTab } from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { DashboardStats } from './DashboardStats';
import { POStatusCards } from './POStatusCards';
import { PrelovedStatusCards } from './PrelovedStatusCards';
import { RecentlyEditedSection, UnifiedRecentItem } from './RecentlyEditedSection';

interface DashboardViewProps {
  stats: InventoryStats;
  poStats: POStats;
  prelovedStats: PrelovedStats;
  recentlyEdited?: UnifiedRecentItem[];
  activities?: any[];
  onSelectCategory: (category: Category) => void;
  onSelectPOStatus: (status: POStatus) => void;
  onOpenPOView: () => void;
  onOpenPrelovedView: () => void;
  onSelectItem?: (item: any) => void;
  onViewImage?: (url: string, title: string) => void;
  onOpenAddInventoryModal: () => void;
  onOpenAddPOModal: () => void;
  onOpenAddPrelovedModal: () => void;
  onNavigateTab?: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  poStats,
  prelovedStats,
  recentlyEdited = [],
  onSelectCategory,
  onSelectPOStatus,
  onOpenPOView,
  onOpenPrelovedView,
  onSelectItem,
  onViewImage,
  onOpenAddInventoryModal,
  onOpenAddPOModal,
  onOpenAddPrelovedModal,
  onNavigateTab
}) => {
  const { user } = useAuth();
  const userRole = user?.role || 'IT TEAM';

  // Role badge styling
  const roleBadgeStyle = {
    'IT MANAGER': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    'IT ASSIST': 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    'IT TRAINEE': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  }[userRole] || 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';

  const activitiesList = [
    {
      id: 'export-inventory',
      title: 'Export Data Inventory',
      description: 'Unduh seluruh database barang ke file spreadsheet Excel terformat',
      badge: 'Excel .xlsx',
      badgeColor: 'bg-teal-500/10 text-teal-700 border-teal-200 group-hover:bg-teal-600 group-hover:text-white',
      icon: FileSpreadsheet,
      iconColor: 'bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white',
      onClick: () => onNavigateTab && onNavigateTab('export-inventory')
    },
    {
      id: 'export-po',
      title: 'Export Purchase Order',
      description: 'Unduh rekapan laporan pesanan pembelian PO ke file Excel',
      badge: 'Excel .xlsx',
      badgeColor: 'bg-cyan-500/10 text-cyan-700 border-cyan-200 group-hover:bg-cyan-600 group-hover:text-white',
      icon: FileSpreadsheet,
      iconColor: 'bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white',
      onClick: () => onNavigateTab && onNavigateTab('export-po')
    },
    {
      id: 'export-preloved',
      title: 'Export Data Preloved',
      description: 'Unduh rekapan laporan barang preloved rekondisi ke file Excel terformat',
      badge: 'Excel .xlsx',
      badgeColor: 'bg-violet-500/10 text-violet-700 border-violet-200 group-hover:bg-violet-600 group-hover:text-white',
      icon: FileSpreadsheet,
      iconColor: 'bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white',
      onClick: () => onNavigateTab && onNavigateTab('export-preloved')
    },
    {
      id: 'monthly-inventory',
      title: 'Data Bulanan Inventory',
      description: 'Rekapitulasi perbaikan dan mutasi barang per bulan kalender',
      badge: 'Rekap Bulanan',
      badgeColor: 'bg-blue-500/10 text-blue-700 border-blue-200 group-hover:bg-blue-600 group-hover:text-white',
      icon: Calendar,
      iconColor: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
      onClick: () => onNavigateTab && onNavigateTab('monthly-inventory')
    },
    {
      id: 'monthly-po',
      title: 'Data Bulanan PO',
      description: 'Arsip dan status kedatangan pesanan PO berdasarkan bulan',
      badge: 'Tracking PO',
      badgeColor: 'bg-amber-500/10 text-amber-700 border-amber-200 group-hover:bg-amber-600 group-hover:text-white',
      icon: CalendarRange,
      iconColor: 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white',
      onClick: () => onNavigateTab && onNavigateTab('monthly-po')
    },
    {
      id: 'monthly-preloved',
      title: 'Data Bulanan Preloved',
      description: 'Rekapitulasi barang preloved dibereskan berdasarkan bulan kalender',
      badge: 'Rekap Preloved',
      badgeColor: 'bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-200 group-hover:bg-fuchsia-600 group-hover:text-white',
      icon: Calendar,
      iconColor: 'bg-fuchsia-50 text-fuchsia-600 group-hover:bg-fuchsia-600 group-hover:text-white',
      onClick: () => onNavigateTab && onNavigateTab('monthly-preloved')
    },
    {
      id: 'settings-cloud',
      title: 'Spreadsheet & Drive Database',
      description: 'Pengaturan Google Spreadsheet, link Folder Drive & Auto-Sync live',
      badge: 'Cloud Sync',
      badgeColor: 'bg-purple-500/10 text-purple-700 border-purple-200 group-hover:bg-purple-600 group-hover:text-white',
      icon: Settings,
      iconColor: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
      onClick: () => onNavigateTab && onNavigateTab('settings')
    },
    {
      id: 'manage-users',
      title: 'Kelola Pengguna & Akun',
      description: 'Pengaturan username & password staf IT dengan verifikasi rahasia',
      badge: 'Keamanan Akun',
      badgeColor: 'bg-rose-500/10 text-rose-700 border-rose-200 group-hover:bg-rose-600 group-hover:text-white',
      icon: ShieldCheck,
      iconColor: 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white',
      onClick: () => onNavigateTab && onNavigateTab('users')
    }
  ];

  return (
    <div className="space-y-8">
      {/* ======================================================== */}
      {/* 1. HERO WELCOME GREETING BANNER                           */}
      {/* ======================================================== */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            {/* Role & System Pill */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border ${roleBadgeStyle}`}>
                <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                {userRole}
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/10 text-slate-300 border border-white/10">
                Hotel IT Department
              </span>
            </div>

            {/* Kalimat Sambutan Khusus */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
              Hai <span className="text-indigo-300 underline decoration-indigo-500/50 underline-offset-4">{userRole}</span>! 😊
            </h1>
            <p className="text-base sm:text-lg font-bold text-slate-200 mt-1">
              Aktivitas apa yang ingin Anda lakukan?
            </p>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed max-w-xl">
              Pilih menu aktivitas cepat di bawah ini untuk memulai input data barang, purchase order, preloved, export laporan Excel, atau pantau sinkronisasi Google Cloud.
            </p>
          </div>

          {/* Direct CTA Quick Buttons */}
          <div className="shrink-0 flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={onOpenAddInventoryModal}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Inventory</span>
            </button>

            <button
              type="button"
              onClick={onOpenAddPOModal}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ PO</span>
            </button>

            <button
              type="button"
              onClick={onOpenAddPrelovedModal}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-purple-600/30 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Preloved</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. PILIHAN AKTIVITAS (QUICK ACTION GRID)                  */}
      {/* ======================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              PILIHAN AKTIVITAS CEPAT
            </h2>
            <p className="text-sm font-black text-slate-900 tracking-tight">
              Pilih tindakan yang ingin Anda jalankan:
            </p>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Klik kartu untuk langsung menuju fitur
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {activitiesList.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className="group relative text-left bg-white hover:bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${item.iconColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400 group-hover:text-indigo-600 transition-colors">
                  <span>Buka Sekarang</span>
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. KEY INVENTORY, PO & PRELOVED STATISTICS                */}
      {/* ======================================================== */}
      <DashboardStats stats={stats} />

      {/* INTERACTIVE PURCHASE ORDER STATUS CARDS */}
      <POStatusCards
        stats={poStats}
        onSelectStatus={onSelectPOStatus}
        onOpenPOView={onOpenPOView}
      />

      {/* INTERACTIVE PRELOVED STATUS CARDS */}
      <PrelovedStatusCards
        stats={prelovedStats}
        onOpenPrelovedView={onOpenPrelovedView}
        onSelectCategory={onSelectCategory}
        onOpenAddPrelovedModal={onOpenAddPrelovedModal}
      />

      {/* RECENTLY EDITED SECTION */}
      {recentlyEdited && recentlyEdited.length > 0 && onSelectItem && onViewImage && (
        <RecentlyEditedSection
          items={recentlyEdited}
          onSelectItem={onSelectItem}
          onViewImage={onViewImage}
        />
      )}
    </div>
  );
};


import React from 'react';
import { Sparkles, Monitor, Network, Tv, ArrowRight, Plus } from 'lucide-react';
import type { PrelovedStats, Category } from '../lib/types';

interface PrelovedStatusCardsProps {
  stats: PrelovedStats;
  onOpenPrelovedView: () => void;
  onSelectCategory?: (category: Category) => void;
  onOpenAddPrelovedModal: () => void;
}

export const PrelovedStatusCards: React.FC<PrelovedStatusCardsProps> = ({
  stats,
  onOpenPrelovedView,
  onSelectCategory,
  onOpenAddPrelovedModal
}) => {
  return (
    <section className="space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              STATUS DATA PRELOVED (BARANG BEKAS REKONDISI IT)
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Daftar peralatan workstation, jaringan, dan surveillance rekondisi yang siap dipakai
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onOpenAddPrelovedModal}
            className="text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-xl transition-all shadow-xs"
          >
            + Tambah Preloved
          </button>
          <button
            type="button"
            onClick={onOpenPrelovedView}
            className="text-xs font-bold text-purple-600 hover:text-purple-800 hover:underline"
          >
            Lihat Semua Preloved ({stats.total})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Preloved */}
        <div
          onClick={onOpenPrelovedView}
          className="group relative bg-white rounded-3xl border-2 border-purple-200 hover:border-purple-400 p-5 shadow-xs hover:shadow-xl transition-all duration-200 cursor-pointer overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-purple-500 to-indigo-500" />
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {stats.total}
              </div>
              <div className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">
                TOTAL UNIT
              </div>
            </div>
          </div>
          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors">
            Total Barang Preloved
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {stats.addedThisMonth} ditambahkan bulan ini
          </p>
          <div className="mt-4 pt-2.5 border-t border-purple-100 flex items-center justify-between text-[11px] font-bold text-purple-700">
            <span>Buka Preloved</span>
            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* PC Items */}
        <div
          onClick={() => onSelectCategory ? onSelectCategory('PC ITEMS') : onOpenPrelovedView()}
          className="group relative bg-white rounded-3xl border border-slate-200 hover:border-purple-300 p-5 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <Monitor className="w-5 h-5" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {stats.pcCount}
              </div>
              <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                PC & LAPTOP
              </div>
            </div>
          </div>
          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors">
            Preloved PC Items
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Komputer, micro PC, laptop, monitor
          </p>
          <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-blue-700">
            <span>Filter PC Preloved</span>
            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Network Items */}
        <div
          onClick={() => onSelectCategory ? onSelectCategory('NETWORK ITEMS') : onOpenPrelovedView()}
          className="group relative bg-white rounded-3xl border border-slate-200 hover:border-emerald-300 p-5 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <Network className="w-5 h-5" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {stats.networkCount}
              </div>
              <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                SWITCH & AP
              </div>
            </div>
          </div>
          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
            Preloved Network Items
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Switch, router, AP, patch panel
          </p>
          <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-emerald-700">
            <span>Filter Jaringan Preloved</span>
            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* CCTV & TV Items */}
        <div
          onClick={() => onSelectCategory ? onSelectCategory('CCTV & TV ITEMS') : onOpenPrelovedView()}
          className="group relative bg-white rounded-3xl border border-slate-200 hover:border-indigo-300 p-5 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <Tv className="w-5 h-5" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {stats.cctvCount}
              </div>
              <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                CCTV & TV
              </div>
            </div>
          </div>
          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors">
            Preloved CCTV & TV Items
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            IP Camera, NVR, Smart TV kamar
          </p>
          <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-indigo-700">
            <span>Filter CCTV/TV Preloved</span>
            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </section>
  );
};

import React from 'react';
import { Clock3, CheckCircle2, ArrowRight, ShoppingCart } from 'lucide-react';
import type { POStats, POStatus } from '../lib/types';

interface POStatusCardsProps {
  stats: POStats;
  onSelectStatus: (status: POStatus) => void;
  onOpenPOView: () => void;
}

export const POStatusCards: React.FC<POStatusCardsProps> = ({
  stats,
  onSelectStatus,
  onOpenPOView
}) => {
  return (
    <section className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            STATUS PURCHASE ORDER (ORDERAN BARANG IT)
          </h2>
          <p className="text-xs text-slate-500">
            Klik kartu status untuk langsung melihat daftar barang pesanan
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenPOView}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
        >
          Lihat Semua PO ({stats.total})
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Card 1: Orderan Menunggu Datang */}
        <div
          onClick={() => onSelectStatus('BELUM DATANG')}
          className="group relative bg-white rounded-3xl border-2 border-amber-200 hover:border-amber-400 p-6 shadow-xs hover:shadow-xl transition-all duration-200 cursor-pointer overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 to-orange-500" />

          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all">
              <Clock3 className="w-6 h-6" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {stats.pendingCount}
              </div>
              <div className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                ITEMS ORDER
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-base font-extrabold text-slate-900 group-hover:text-amber-700 transition-colors">
              ORDERAN MENUNGGU DATANG
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Barang IT yang sedang dalam proses pemesanan, approval, atau pengiriman vendor.
            </p>
          </div>

          <div className="mt-5 pt-3.5 border-t border-amber-100 flex items-center justify-between text-xs font-bold text-amber-700">
            <span>Klik untuk melihat barang yang belum datang</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
          </div>
        </div>

        {/* Card 2: Orderan Sudah Datang */}
        <div
          onClick={() => onSelectStatus('SUDAH DATANG')}
          className="group relative bg-white rounded-3xl border-2 border-emerald-200 hover:border-emerald-400 p-6 shadow-xs hover:shadow-xl transition-all duration-200 cursor-pointer overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />

          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {stats.arrivedCount}
              </div>
              <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                ITEMS ARRIVED
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-base font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
              ORDERAN SUDAH DATANG
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Barang IT yang telah tiba, diperiksa, dan diterima oleh departemen IT hotel.
            </p>
          </div>

          <div className="mt-5 pt-3.5 border-t border-emerald-100 flex items-center justify-between text-xs font-bold text-emerald-700">
            <span>Klik untuk melihat barang yang sudah tiba</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
          </div>
        </div>
      </div>
    </section>
  );
};

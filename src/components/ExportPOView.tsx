import React, { useState } from 'react';
import { FileSpreadsheet, Download, CheckCircle, ShoppingCart, Loader2 } from 'lucide-react';
import { MONTH_NAMES } from '../lib/inventory-logic';
import { downloadPOExcel } from '../lib/api';

interface ExportPOViewProps {
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export const ExportPOView: React.FC<ExportPOViewProps> = ({ onToast }) => {
  const [selectedMonth, setSelectedMonth] = useState('OCTOBER 2026');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'BELUM DATANG' | 'SUDAH DATANG'>('ALL');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadPOExcel({
        month: selectedMonth,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined
      });
      onToast(`Export Purchase Order completed for ${selectedMonth}!`, 'success');
    } catch (err: any) {
      onToast(err.message || 'Failed to export Purchase Order Excel file.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
          <FileSpreadsheet className="w-4 h-4" />
          <span>Procurement Excel Reporting</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          EXPORT DATA PURCHASE ORDER (.XLSX)
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Generate official Excel spreadsheets for hotel IT procurement orders with embedded equipment photos and arrival status
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Month Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Export Month (Order Date)
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold bg-white text-slate-800"
            >
              {MONTH_NAMES.map((m) => (
                <option key={m} value={`${m} 2026`}>
                  {m} 2026
                </option>
              ))}
              <option value="All">ALL MONTHS (Entire PO Database)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Status Order
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold bg-white text-slate-800"
            >
              <option value="ALL">Semua Status (Belum & Sudah Datang)</option>
              <option value="BELUM DATANG">Hanya Orderan Menunggu Datang</option>
              <option value="SUDAH DATANG">Hanya Orderan Sudah Datang</option>
            </select>
          </div>
        </div>

        {/* Feature Highlights Card */}
        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 space-y-3">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Spesifikasi File Excel Purchase Order</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">•</span>
              <span><strong>Foto Barang Embedded:</strong> Foto peralatan disematkan langsung di dalam sel Excel.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">•</span>
              <span><strong>Lengkap & Rapi:</strong> Tanggal order, tanggal kedatangan, unit, for use, remarks, dan status order.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">•</span>
              <span><strong>Audit Log:</strong> Mencakup siapa staf IT yang memesan (Added By) dan yang terakhir mengupdate.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">•</span>
              <span><strong>Nama File:</strong> <code className="bg-slate-200/80 px-1 py-0.5 rounded text-[11px] font-mono text-slate-800">HOTEL_IT_PURCHASE_ORDER_{selectedMonth.replace(' ', '_')}.xlsx</code></span>
            </div>
          </div>
        </div>

        {/* Export Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm tracking-wide shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>GENERATING PO SPREADSHEET...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>EXPORT PURCHASE ORDER TO EXCEL</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

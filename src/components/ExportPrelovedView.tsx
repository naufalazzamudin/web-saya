import React, { useState } from 'react';
import { FileSpreadsheet, Download, CheckCircle, Sparkles, Loader2 } from 'lucide-react';
import { MONTH_NAMES } from '../lib/inventory-logic';
import { downloadPrelovedExcel } from '../lib/api';

interface ExportPrelovedViewProps {
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export const ExportPrelovedView: React.FC<ExportPrelovedViewProps> = ({ onToast }) => {
  const [selectedMonth, setSelectedMonth] = useState('OCTOBER 2026');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadPrelovedExcel({
        month: selectedMonth,
        category: selectedCategory !== 'All' ? selectedCategory : undefined
      });
      onToast(`Berhasil mengekspor Excel Preloved ${selectedMonth}!`, 'success');
    } catch (err: any) {
      onToast(err.message || 'Gagal mengekspor file Excel Preloved.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-wider mb-1">
          <Sparkles className="w-4 h-4" />
          <span>Laporan Preloved & Pengarsipan</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          EXPORT DATA PRELOVED KE EXCEL (.XLSX)
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Unduh rekapan database barang bekas/rekondisi IT terformat rapi lengkap dengan foto tersemat dan riwayat audit
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Month Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Pilih Bulan Laporan
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm font-semibold bg-white text-slate-800"
            >
              {MONTH_NAMES.map((m) => (
                <option key={m} value={`${m} 2026`}>
                  {m} 2026
                </option>
              ))}
              <option value="All">SEMUA BULAN (Seluruh Database Preloved)</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Filter Kategori (Opsional)
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm font-semibold bg-white text-slate-800"
            >
              <option value="All">Semua Kategori</option>
              <option value="PC ITEMS">PC ITEMS</option>
              <option value="NETWORK ITEMS">NETWORK ITEMS</option>
              <option value="CCTV & TV ITEMS">CCTV & TV ITEMS</option>
            </select>
          </div>
        </div>

        {/* Feature Highlights Card */}
        <div className="rounded-2xl bg-purple-50/50 border border-purple-100 p-5 space-y-3">
          <div className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-purple-600" />
            <span>Spesifikasi File Excel Preloved</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
            <div className="flex items-start gap-2">
              <span className="text-purple-500 font-bold">•</span>
              <span><strong>Foto Tersemat:</strong> Thumbnail foto barang embedded langsung di dalam sel worksheet.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-500 font-bold">•</span>
              <span><strong>Remark & Audit Trail:</strong> Kolom remark (ex Front Office, ex Room), Ditambahkan Oleh, Diedit Oleh, dan waktu pembaruan.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-500 font-bold">•</span>
              <span><strong>Header Eksklusif:</strong> Desain corporate profesional bernuansa ungu dengan auto-filter aktif.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-500 font-bold">•</span>
              <span><strong>Kompatibilitas Penuh:</strong> Microsoft Excel, Google Sheets, LibreOffice Calc, dan Apple Numbers.</span>
            </div>
          </div>
        </div>

        {/* Export Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm tracking-wide shadow-md shadow-purple-600/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>MEMBUAT FILE EXCEL PRELOVED...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>DOWNLOAD FILE EXCEL PRELOVED (.XLSX)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

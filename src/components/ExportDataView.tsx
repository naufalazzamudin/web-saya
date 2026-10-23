import React, { useState } from 'react';
import { FileSpreadsheet, Download, CheckCircle, ShieldCheck, Image as ImageIcon, Loader2 } from 'lucide-react';
import { MONTH_NAMES } from '../lib/inventory-logic';
import { downloadExcel } from '../lib/api';

interface ExportDataViewProps {
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export const ExportDataView: React.FC<ExportDataViewProps> = ({ onToast }) => {
  const [selectedMonth, setSelectedMonth] = useState('OCTOBER 2026');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadExcel({
        month: selectedMonth,
        category: selectedCategory !== 'All' ? selectedCategory : undefined
      });
      onToast(`Export completed for ${selectedMonth}!`, 'success');
    } catch (err: any) {
      onToast(err.message || 'Failed to export Excel file.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
          <FileSpreadsheet className="w-4 h-4" />
          <span>Report Generation & Archiving</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          EXPORT DATA TO EXCEL (.XLSX)
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Generate professional, publication-grade spreadsheets complete with embedded hardware photos and audit logs
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Month Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Export Month
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
              <option value="All">ALL MONTHS (Entire Database)</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Filter Category (Optional)
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold bg-white text-slate-800"
            >
              <option value="All">All Categories</option>
              <option value="PC ITEMS">PC ITEMS</option>
              <option value="NETWORK ITEMS">NETWORK ITEMS</option>
              <option value="CCTV & TV ITEMS">CCTV & TV ITEMS</option>
            </select>
          </div>
        </div>

        {/* Feature Highlights Card */}
        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 space-y-3">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Excel Export Specifications</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">•</span>
              <span><strong>Embedded Photos:</strong> Hardware thumbnails are embedded directly into worksheet cells.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">•</span>
              <span><strong>Remark & Audit Trail:</strong> Column Remark (e.g. ex Front Office, ex Room), Added By, Last Edited By, and timestamps in every row.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">•</span>
              <span><strong>Standardized Styling:</strong> Bold header, freeze pane, custom row heights, auto-filters.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">•</span>
              <span><strong>File Naming:</strong> <code className="bg-slate-200/80 px-1 py-0.5 rounded text-[11px] font-mono text-slate-800">HOTEL_IT_INVENTORY_{selectedMonth.replace(' ', '_')}.xlsx</code></span>
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
                <span>GENERATING EXCEL SPREADSHEET...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>EXPORT TO EXCEL</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

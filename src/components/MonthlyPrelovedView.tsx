import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, ArrowRight, ArrowLeft, FileSpreadsheet, Plus, Sparkles } from 'lucide-react';
import type { PrelovedItem, FilterOptions } from '../lib/types';
import { fetchPreloved } from '../lib/api';
import { PrelovedView } from './PrelovedView';

interface MonthlyPrelovedViewProps {
  allPreloved: PrelovedItem[];
  onOpenAddModal: () => void;
  onViewItem: (item: PrelovedItem) => void;
  onEditItem: (item: PrelovedItem) => void;
  onDeleteItem: (item: PrelovedItem) => void;
  onViewImage: (url: string, title: string) => void;
  onExportMonth: (monthLabel: string) => void;
}

export const MonthlyPrelovedView: React.FC<MonthlyPrelovedViewProps> = ({
  allPreloved,
  onOpenAddModal,
  onViewItem,
  onEditItem,
  onDeleteItem,
  onViewImage,
  onExportMonth
}) => {
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);
  const [monthItems, setMonthItems] = useState<PrelovedItem[]>([]);
  const [totalMonthCount, setTotalMonthCount] = useState<number>(0);
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);
  const [monthFilters, setMonthFilters] = useState<FilterOptions>({});
  const [page, setPage] = useState(1);

  const indonesianMonths = [
    { idx: 1, name: 'JANUARI 2026', engName: 'JANUARY 2026' },
    { idx: 2, name: 'FEBRUARI 2026', engName: 'FEBRUARY 2026' },
    { idx: 3, name: 'MARET 2026', engName: 'MARCH 2026' },
    { idx: 4, name: 'APRIL 2026', engName: 'APRIL 2026' },
    { idx: 5, name: 'MEI 2026', engName: 'MAY 2026' },
    { idx: 6, name: 'JUNI 2026', engName: 'JUNE 2026' },
    { idx: 7, name: 'JULI 2026', engName: 'JULY 2026' },
    { idx: 8, name: 'AGUSTUS 2026', engName: 'AUGUST 2026' },
    { idx: 9, name: 'SEPTEMBER 2026', engName: 'SEPTEMBER 2026' },
    { idx: 10, name: 'OKTOBER 2026', engName: 'OCTOBER 2026' },
    { idx: 11, name: 'NOVEMBER 2026', engName: 'NOVEMBER 2026' },
    { idx: 12, name: 'DESEMBER 2026', engName: 'DECEMBER 2026' }
  ];

  const loadMonthData = useCallback(async (engMonthName: string, filters: FilterOptions) => {
    setIsLoadingMonth(true);
    try {
      const res = await fetchPreloved({
        ...filters,
        month: engMonthName
      }, 1, 100);
      setMonthItems(res.data);
      setTotalMonthCount(res.total);
    } catch (err) {
      console.error('Failed to load preloved month items', err);
    } finally {
      setIsLoadingMonth(false);
    }
  }, []);

  const activeMonthObj = selectedMonthIndex !== null
    ? indonesianMonths.find(m => m.idx === selectedMonthIndex)
    : null;

  useEffect(() => {
    if (activeMonthObj) {
      loadMonthData(activeMonthObj.engName, monthFilters);
    }
  }, [activeMonthObj, monthFilters, loadMonthData]);

  if (selectedMonthIndex !== null && activeMonthObj) {
    const activeEngMonth = activeMonthObj.engName;

    return (
      <div className="space-y-4">
        {/* Navigation back to month list */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setSelectedMonthIndex(null);
              setMonthFilters({});
              setPage(1);
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>SEMUA BULAN</span>
          </button>

          <button
            type="button"
            onClick={() => onExportMonth(activeEngMonth)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>EXPORT EXCEL {activeEngMonth}</span>
          </button>
        </div>

        <PrelovedView
          items={monthItems}
          total={totalMonthCount}
          isLoading={isLoadingMonth}
          filters={{ ...monthFilters, month: activeEngMonth }}
          onUpdateFilters={(f) => setMonthFilters(f)}
          onResetFilters={() => setMonthFilters({})}
          currentPage={page}
          totalPages={1}
          onPageChange={setPage}
          onOpenAddModal={onOpenAddModal}
          onViewItem={onViewItem}
          onEditItem={onEditItem}
          onDeleteItem={async (item) => {
            await onDeleteItem(item);
            loadMonthData(activeEngMonth, monthFilters);
          }}
          onViewImage={onViewImage}
          onExportCurrentView={() => onExportMonth(activeEngMonth)}
          pageTitle={`PRELOVED - ${activeMonthObj.name}`}
          pageSubtitle={`Daftar barang preloved dibereskan pada bulan ${activeMonthObj.name}`}
        />
      </div>
    );
  }

  // Count items per month from allPreloved
  const getMonthCount = (monthIdx: number) => {
    return allPreloved.filter(p => {
      if (!p.dateRepaired) return false;
      const parts = p.dateRepaired.split('T')[0].split('-');
      if (parts.length >= 2) {
        return parseInt(parts[1], 10) === monthIdx && parseInt(parts[0], 10) === 2026;
      }
      return false;
    }).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              DATA BULANAN PRELOVED
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Rekapitulasi barang preloved IT dibereskan berdasarkan bulan kalender
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md shadow-purple-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ ADD PRELOVED</span>
        </button>
      </div>

      {/* Grid of 12 Months */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {indonesianMonths.map((m) => {
          const count = getMonthCount(m.idx);
          const hasData = count > 0;

          return (
            <div
              key={m.idx}
              className={`bg-white rounded-2xl border p-5 transition-all shadow-2xs flex flex-col justify-between ${
                hasData
                  ? 'border-purple-200 hover:border-purple-400 hover:shadow-md cursor-pointer group'
                  : 'border-slate-200 opacity-80'
              }`}
              onClick={() => {
                setSelectedMonthIndex(m.idx);
                setPage(1);
              }}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs group-hover:scale-105 transition-transform">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      hasData
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count} Barang
                  </span>
                </div>

                <h3 className="mt-4 text-base font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                  {m.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {hasData ? `${count} barang preloved siap digunakan` : 'Belum ada data barang'}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onExportMonth(m.engName);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-purple-600 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
                  <span>Export</span>
                </button>

                <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 group-hover:translate-x-1 transition-transform">
                  <span>Buka Data</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

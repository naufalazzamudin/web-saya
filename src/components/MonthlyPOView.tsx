import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, ArrowRight, ArrowLeft, FileSpreadsheet, Plus, ShoppingCart } from 'lucide-react';
import type { PurchaseOrderItem, POFilterOptions } from '../lib/types';
import { fetchPurchaseOrders } from '../lib/api';
import { PurchaseOrderView } from './PurchaseOrderView';

interface MonthlyPOViewProps {
  allPOs: PurchaseOrderItem[];
  onOpenAddModal: () => void;
  onViewItem: (item: PurchaseOrderItem) => void;
  onEditItem: (item: PurchaseOrderItem) => void;
  onDeleteItem: (item: PurchaseOrderItem) => void;
  onViewImage: (url: string, title: string) => void;
  onExportMonth: (monthLabel: string) => void;
}

export const MonthlyPOView: React.FC<MonthlyPOViewProps> = ({
  allPOs,
  onOpenAddModal,
  onViewItem,
  onEditItem,
  onDeleteItem,
  onViewImage,
  onExportMonth
}) => {
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);
  const [monthItems, setMonthItems] = useState<PurchaseOrderItem[]>([]);
  const [totalMonthCount, setTotalMonthCount] = useState<number>(0);
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);
  const [monthFilters, setMonthFilters] = useState<POFilterOptions>({});
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

  const loadMonthData = useCallback(async (engMonthName: string, filters: POFilterOptions) => {
    setIsLoadingMonth(true);
    try {
      const res = await fetchPurchaseOrders({
        ...filters,
        month: engMonthName
      }, 1, 100);
      setMonthItems(res.data);
      setTotalMonthCount(res.total);
    } catch (err) {
      console.error('Failed to load month PO items', err);
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
            <span>ALL MONTHS PO</span>
          </button>

          <button
            type="button"
            onClick={() => onExportMonth(activeEngMonth)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>EXPORT PO {activeEngMonth}</span>
          </button>
        </div>

        <PurchaseOrderView
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
          pageTitle={`MONTHLY PO - ${activeMonthObj.name}`}
          pageSubtitle={`Purchase orders made during ${activeMonthObj.name} (filtered by dateOrder)`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
          <Calendar className="w-4 h-4" />
          <span>Procurement Archive</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          MONTHLY DATA PURCHASE ORDER (2026)
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Select any month to inspect IT hardware purchase orders and shipment tracking by order date
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {indonesianMonths.map((m) => {
          const count = allPOs.filter((po) => {
            const parts = po.dateOrder.split('T')[0].split('-');
            if (parts.length >= 2) {
              return parseInt(parts[0], 10) === 2026 && parseInt(parts[1], 10) === m.idx;
            }
            return false;
          }).length;

          return (
            <div
              key={m.idx}
              onClick={() => {
                setSelectedMonthIndex(m.idx);
                setPage(1);
              }}
              className="group bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  {m.idx < 10 ? `0${m.idx}` : m.idx}
                </div>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {count} Orders
                </span>
              </div>

              <div>
                <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  PO BULAN {m.name}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Lihat data PO, status kedatangan barang, peruntukan unit, dan export Excel.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
                <span>Buka Data PO Bulan Ini</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

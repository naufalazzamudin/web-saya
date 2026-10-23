import React, { useState } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  Eye,
  Edit2,
  Trash2,
  X,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Calendar,
  Hash,
  User,
  Clock
} from 'lucide-react';
import type { PrelovedItem, FilterOptions, Category } from '../lib/types';
import { CATEGORIES } from '../lib/types';
import { formatDate, formatDateTime, MONTH_NAMES } from '../lib/inventory-logic';

interface PrelovedViewProps {
  items: PrelovedItem[];
  total: number;
  isLoading: boolean;
  filters: FilterOptions;
  onUpdateFilters: (filters: FilterOptions) => void;
  onResetFilters: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onOpenAddModal: () => void;
  onViewItem: (item: PrelovedItem) => void;
  onEditItem: (item: PrelovedItem) => void;
  onDeleteItem: (item: PrelovedItem) => void;
  onViewImage: (url: string, title: string) => void;
  onExportCurrentView: () => void;
  pageTitle?: string;
  pageSubtitle?: string;
}

export const PrelovedView: React.FC<PrelovedViewProps> = ({
  items,
  total,
  isLoading,
  filters,
  onUpdateFilters,
  onResetFilters,
  currentPage,
  totalPages,
  onPageChange,
  onOpenAddModal,
  onViewItem,
  onEditItem,
  onDeleteItem,
  onViewImage,
  onExportCurrentView,
  pageTitle = 'PRELOVED MANAGEMENT',
  pageSubtitle = 'Daftar barang bekas layak pakai / rekondisi IT (PC Items, Network, CCTV/TV)'
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const hasActiveFilters = !!(
    filters.search ||
    (filters.category && filters.category !== 'All') ||
    (filters.month && filters.month !== 'All') ||
    (filters.user && filters.user !== 'All Users') ||
    filters.dateFrom ||
    filters.dateTo
  );

  const categoryColor = {
    'PC ITEMS': 'text-purple-700 bg-purple-50 border-purple-200',
    'NETWORK ITEMS': 'text-emerald-700 bg-emerald-50 border-emerald-200',
    'CCTV & TV ITEMS': 'text-indigo-700 bg-indigo-50 border-indigo-200'
  };

  return (
    <div className="space-y-5">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {pageTitle}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {pageSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={onExportCurrentView}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-purple-600" />
            <span>EXPORT EXCEL PRELOVED</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ ADD PRELOVED</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Global Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => onUpdateFilters({ ...filters, search: e.target.value })}
              placeholder="Cari preloved (nama barang, serial number, remark, kategori, user)..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => onUpdateFilters({ ...filters, search: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Category filter */}
          <select
            value={filters.category || 'All'}
            onChange={(e) => onUpdateFilters({ ...filters, category: e.target.value })}
            className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="All">Semua Kategori</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Quick Sort */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              value={filters.sortBy || 'updated-newest'}
              onChange={(e) => onUpdateFilters({ ...filters, sortBy: e.target.value as any })}
              className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              <option value="updated-newest">Terakhir Diupdate</option>
              <option value="date-newest">Tanggal Dibereskan (Terbaru)</option>
              <option value="date-oldest">Tanggal Dibereskan (Terlama)</option>
              <option value="name-asc">Nama Barang (A - Z)</option>
              <option value="name-desc">Nama Barang (Z - A)</option>
            </select>
          </div>

          {/* Toggle Advanced Filters */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border transition-colors ${
              showAdvancedFilters || hasActiveFilters
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-purple-600" />
            )}
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
            >
              Reset
            </button>
          )}
        </div>

        {/* Collapsible Advanced Filters */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Month Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Bulan Dibereskan
              </label>
              <select
                value={filters.month || 'All'}
                onChange={(e) => onUpdateFilters({ ...filters, month: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="All">Semua Bulan</option>
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={`2026-${String(idx + 1).padStart(2, '0')}`}>
                    {name} 2026
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Dari Tanggal
              </label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => onUpdateFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => onUpdateFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Memuat Data Preloved...
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 mb-3">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Tidak Ada Data Preloved
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {hasActiveFilters
                ? 'Tidak ada barang preloved yang cocok dengan kriteria filter yang Anda pilih.'
                : 'Belum ada data barang preloved yang dimasukkan.'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="px-4 py-2 text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
                >
                  Reset Filter
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAddModal}
                  className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md shadow-purple-600/20 transition-all"
                >
                  + Tambah Data Preloved Pertama
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table (hidden on mobile/narrow desktop) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4 text-center w-12">No</th>
                    <th className="py-3 px-4 w-20 text-center">Foto</th>
                    <th className="py-3 px-4 min-w-[220px]">Nama Barang</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4">Tanggal Dibereskan</th>
                    <th className="py-3 px-4 text-center">Jumlah Unit</th>
                    <th className="py-3 px-4">Remark</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4 text-right w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                  {items.map((item, idx) => {
                    const itemNumber = (currentPage - 1) * 50 + idx + 1;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-purple-50/30 transition-colors group cursor-pointer"
                        onClick={() => onViewItem(item)}
                      >
                        {/* No */}
                        <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                          {itemNumber}
                        </td>

                        {/* Photo Thumbnail */}
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div
                            className="w-12 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer mx-auto flex items-center justify-center hover:scale-105 transition-transform"
                            onClick={() => onViewImage(item.photoUrl, item.itemName)}
                            title="Klik untuk perbesar"
                          >
                            <img
                              src={item.photoUrl}
                              alt={item.itemName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </td>

                        {/* Item Name, SN & Quick Actions directly underneath */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                            {item.itemName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            <span>{item.serialNumber || 'SN: -'}</span>
                          </div>
                          {/* Quick actions directly underneath so user never has to scroll */}
                          <div
                            className="flex items-center gap-2 mt-1.5 text-[11px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => onViewItem(item)}
                              className="inline-flex items-center gap-1 text-slate-500 hover:text-purple-600 font-semibold transition-colors"
                              title="Lihat Detail"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Inspect</span>
                            </button>
                            <span className="text-slate-300">•</span>
                            <button
                              type="button"
                              onClick={() => onEditItem(item)}
                              className="inline-flex items-center gap-1 text-slate-500 hover:text-purple-600 font-semibold transition-colors"
                              title="Edit Data"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <span className="text-slate-300">•</span>
                            <button
                              type="button"
                              onClick={() => onDeleteItem(item)}
                              className="inline-flex items-center gap-1 text-slate-500 hover:text-rose-600 font-semibold transition-colors"
                              title="Hapus Data"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${
                              categoryColor[item.category] || 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {item.category}
                          </span>
                        </td>

                        {/* Date Repaired */}
                        <td className="py-3 px-4 font-medium text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formatDate(item.dateRepaired)}</span>
                          </div>
                        </td>

                        {/* Jumlah Unit */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[11px] font-bold border border-purple-200">
                            {item.quantity ?? 1} unit
                          </span>
                        </td>

                        {/* Remark */}
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                          {item.remark ? (
                            <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-medium border border-amber-200/60">
                              {item.remark}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Created / Updated By */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1 font-semibold text-slate-700">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{item.createdBy}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{formatDateTime(item.updatedAt)}</span>
                          </div>
                        </td>

                        {/* Action Buttons Column */}
                        <td
                          className="py-3 px-4 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onViewItem(item)}
                              title="Lihat Detail"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditItem(item)}
                              title="Edit Data"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteItem(item)}
                              title="Hapus Data"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Responsive Cards (Following INVENTORY and PURCHASE ORDER layout) */}
            <div className="block lg:hidden space-y-3.5 p-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3 hover:border-purple-200 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200 cursor-pointer"
                      onClick={() => onViewImage(item.photoUrl, item.itemName)}
                    >
                      <img
                        src={item.photoUrl}
                        alt={item.itemName}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border mb-1 ${
                          categoryColor[item.category] || 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {item.category}
                      </span>
                      <h3
                        onClick={() => onViewItem(item)}
                        className="text-sm font-bold text-slate-900 truncate hover:text-purple-600 cursor-pointer"
                      >
                        {item.itemName}
                      </h3>
                      <div className="text-xs font-mono text-slate-500 mt-0.5 truncate flex items-center gap-1">
                        <Hash className="w-3 h-3 text-slate-400" />
                        <span>SN: {item.serialNumber || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-[11px] text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Tgl Beres:</span>
                      <span className="font-semibold text-slate-800">{formatDate(item.dateRepaired)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Jumlah:</span>
                      <span className="font-bold text-purple-700">{item.quantity ?? 1} unit</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">By:</span>
                      <span className="font-semibold text-slate-800 truncate block">{item.updatedBy || item.createdBy}</span>
                    </div>
                  </div>

                  {item.remark && (
                    <div className="text-[11px] bg-amber-50/80 border border-amber-200/60 text-amber-900 px-2.5 py-1.5 rounded-lg flex items-center justify-between">
                      <span className="font-bold text-amber-700 text-[10px] uppercase tracking-wider">Remark:</span>
                      <span className="font-semibold text-slate-800 truncate ml-2">{item.remark}</span>
                    </div>
                  )}

                  {/* Actions placed underneath following INVENTORY and PURCHASE ORDER */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      Updated: {formatDateTime(item.updatedAt)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onViewItem(item)}
                        className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Lihat Detail"
                        aria-label="Lihat Detail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditItem(item)}
                        className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Edit Data"
                        aria-label="Edit Data"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteItem(item)}
                        className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus Data"
                        aria-label="Hapus Data"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination & Count */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50/50">
          <div>
            Menampilkan <span className="font-bold text-slate-800">{items.length}</span> dari{' '}
            <span className="font-bold text-slate-800">{total}</span> total barang preloved
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold px-2">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                type="button"
                onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

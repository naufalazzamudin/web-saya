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
  Boxes,
  Calendar,
  Hash,
  User,
  Clock,
  Sparkles
} from 'lucide-react';
import type { InventoryItem, FilterOptions, Category } from '../lib/types';
import { CATEGORIES } from '../lib/types';
import { formatDate, formatDateTime, MONTH_NAMES } from '../lib/inventory-logic';

interface InventoryViewProps {
  items: InventoryItem[];
  total: number;
  isLoading: boolean;
  filters: FilterOptions;
  onUpdateFilters: (filters: FilterOptions) => void;
  onResetFilters: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onOpenAddModal: () => void;
  onViewItem: (item: InventoryItem) => void;
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (item: InventoryItem) => void;
  onViewImage: (url: string, title: string) => void;
  onExportCurrentView: () => void;
  pageTitle?: string;
  pageSubtitle?: string;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
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
  pageTitle = 'INVENTORY MANAGEMENT',
  pageSubtitle = 'Complete list of refurbished and retired IT equipment'
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
    'PC ITEMS': 'text-blue-700 bg-blue-50 border-blue-200',
    'NETWORK ITEMS': 'text-emerald-700 bg-emerald-50 border-emerald-200',
    'CCTV & TV ITEMS': 'text-purple-700 bg-purple-50 border-purple-200'
  };

  return (
    <div className="space-y-5">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {pageTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {pageSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={onExportCurrentView}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>EXPORT CURRENT VIEW</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ ADD DATA</span>
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
              placeholder="Search inventory (name, serial number, remark, category, username)..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
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
            className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-700 font-medium"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Sorting */}
          <select
            value={filters.sortBy || 'updated-newest'}
            onChange={(e) => onUpdateFilters({ ...filters, sortBy: e.target.value as any })}
            className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-700 font-medium"
          >
            <option value="updated-newest">Recently Updated</option>
            <option value="date-newest">Date Repaired (Newest)</option>
            <option value="date-oldest">Date Repaired (Oldest)</option>
            <option value="name-asc">Item Name (A–Z)</option>
            <option value="name-desc">Item Name (Z–A)</option>
            <option value="category">Category</option>
            <option value="user">Added By</option>
          </select>

          {/* Filter toggle button */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border transition-colors ${
              showAdvancedFilters || hasActiveFilters
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
            )}
          </button>
        </div>

        {/* Collapsible Advanced Filters Row */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-150">
            {/* Month Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Month (dateRepaired)
              </label>
              <select
                value={filters.month || 'All'}
                onChange={(e) => onUpdateFilters({ ...filters, month: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700"
              >
                <option value="All">All Months</option>
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={`${m} 2026`}>
                    {m} 2026
                  </option>
                ))}
              </select>
            </div>

            {/* User Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Added/Edited By
              </label>
              <select
                value={filters.user || 'All Users'}
                onChange={(e) => onUpdateFilters({ ...filters, user: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700"
              >
                <option value="All Users">All Users</option>
                <option value="ITMANAGER">ITMANAGER</option>
                <option value="ITASSIST">ITASSIST</option>
                <option value="ITTRAINEE">ITTRAINEE</option>
              </select>
            </div>

            {/* Date Range From */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                From Date
              </label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => onUpdateFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700"
              />
            </div>

            {/* Date Range To */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                To Date
              </label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => onUpdateFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700"
              />
            </div>

            {/* Clear Filter */}
            {hasActiveFilters && (
              <div className="col-span-full flex justify-end pt-1">
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>CLEAR FILTER</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Total Data Count Badge */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
        <span>
          Showing <span className="font-bold text-slate-800">{items.length}</span> of{' '}
          <span className="font-bold text-slate-800">{total}</span> items
        </span>
        {hasActiveFilters && (
          <span className="text-indigo-600 font-semibold bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
            Filtered View
          </span>
        )}
      </div>

      {/* Main Content: Table on Desktop, Cards on Mobile */}
      {items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-2xs">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
            <Boxes className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {hasActiveFilters ? 'No inventory matching your search.' : 'No inventory data yet.'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {hasActiveFilters
                ? 'Try adjusting your search query, clearing filters, or changing the selected date range.'
                : 'Get started by registering your first IT equipment item in the system.'}
            </p>
          </div>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              CLEAR FILTER
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ ADD FIRST DATA</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-16 text-center">Photo</th>
                    <th className="py-3.5 px-4 min-w-[200px]">Item Name</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Tanggal Rekap</th>
                    <th className="py-3.5 px-4 text-center">Jumlah Unit</th>
                    <th className="py-3.5 px-4">Serial Number</th>
                    <th className="py-3.5 px-4 min-w-[130px]">Remark</th>
                    <th className="py-3.5 px-4">Added / Edited By</th>
                    <th className="py-3.5 px-4">Last Updated</th>
                    <th className="py-3.5 px-4 w-28 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors group">
                      {/* Photo Thumbnail */}
                      <td className="py-3 px-4 text-center">
                        <div
                          className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden mx-auto border border-slate-200 cursor-pointer shadow-2xs hover:opacity-85 transition-opacity"
                          onClick={() => onViewImage(item.photoUrl, item.itemName)}
                          title="Click to zoom image"
                        >
                          <img
                            src={item.photoUrl}
                            alt={item.itemName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </td>

                      {/* Item Name */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => onViewItem(item)}
                          className="text-left font-bold text-slate-900 group-hover:text-indigo-600 hover:underline transition-colors max-w-xs truncate block"
                        >
                          {item.itemName}
                        </button>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ID: {item.id}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold border ${categoryColor[item.category]}`}>
                          {item.category}
                        </span>
                      </td>

                      {/* Tanggal Rekap */}
                      <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                        {formatDate(item.dateRepaired)}
                      </td>

                      {/* Jumlah Unit */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200">
                          {item.quantity ?? 1} unit
                        </span>
                      </td>

                      {/* Serial Number */}
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {item.serialNumber || (
                          <span className="text-slate-400 italic">No SN</span>
                        )}
                      </td>

                      {/* Remark */}
                      <td className="py-3 px-4">
                        {item.remark ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
                            {item.remark}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">-</span>
                        )}
                      </td>

                      {/* Added / Edited By */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{item.updatedBy || item.createdBy}</div>
                        <div className="text-[10px] text-slate-400">
                          {item.updatedAt !== item.createdAt ? 'Edited' : 'Added by ' + item.createdBy}
                        </div>
                      </td>

                      {/* Last Updated */}
                      <td className="py-3 px-4 font-medium text-slate-500 whitespace-nowrap">
                        {formatDateTime(item.updatedAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2 py-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => onViewItem(item)}
                            title="View Details"
                            aria-label={`View details of ${item.itemName}`}
                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditItem(item)}
                            title="Edit Item"
                            aria-label={`Edit ${item.itemName}`}
                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteItem(item)}
                            title="Delete Item"
                            aria-label={`Delete ${item.itemName}`}
                            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-white rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards (Requirement 10 & 23) */}
          <div className="block lg:hidden space-y-3.5">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3"
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
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border mb-1 ${categoryColor[item.category]}`}>
                      {item.category}
                    </span>
                    <h3
                      onClick={() => onViewItem(item)}
                      className="text-sm font-bold text-slate-900 truncate hover:text-indigo-600 cursor-pointer"
                    >
                      {item.itemName}
                    </h3>
                    <div className="text-xs font-mono text-slate-500 mt-0.5 truncate">
                      SN: {item.serialNumber || 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-[11px] text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tanggal Rekap:</span>
                    <span className="font-semibold text-slate-800">{formatDate(item.dateRepaired)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Jumlah:</span>
                    <span className="font-bold text-indigo-700">{item.quantity ?? 1} unit</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">By:</span>
                    <span className="font-semibold text-slate-800">{item.updatedBy || item.createdBy}</span>
                  </div>
                </div>

                {item.remark && (
                  <div className="text-[11px] bg-amber-50/80 border border-amber-200/60 text-amber-900 px-2.5 py-1.5 rounded-lg flex items-center justify-between">
                    <span className="font-bold text-amber-700 text-[10px] uppercase tracking-wider">Remark:</span>
                    <span className="font-semibold text-slate-800">{item.remark}</span>
                  </div>
                )}

                {/* Mobile actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Updated: {formatDateTime(item.updatedAt)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onViewItem(item)}
                      className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg"
                      aria-label="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditItem(item)}
                      className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg"
                      aria-label="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteItem(item)}
                      className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 pt-2">
              <button
                type="button"
                onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                disabled={currentPage <= 1}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <span className="text-xs text-slate-600 font-medium">
                Page <span className="font-bold text-slate-900">{currentPage}</span> of{' '}
                <span className="font-bold text-slate-900">{totalPages}</span>
              </span>

              <button
                type="button"
                onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

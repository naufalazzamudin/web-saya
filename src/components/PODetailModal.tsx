import React from 'react';
import { X, Calendar, Package, User, Clock, Edit2, Trash2, ShieldCheck, CheckCircle2, Clock3 } from 'lucide-react';
import type { PurchaseOrderItem } from '../lib/types';
import { formatDate, formatDateTime } from '../lib/inventory-logic';

interface PODetailModalProps {
  item: PurchaseOrderItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (item: PurchaseOrderItem) => void;
  onDelete: (item: PurchaseOrderItem) => void;
  onViewImage: (url: string, title: string) => void;
}

export const PODetailModal: React.FC<PODetailModalProps> = ({
  item,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onViewImage
}) => {
  if (!isOpen || !item) return null;

  const isArrived = item.status === 'SUDAH DATANG';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="po-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border ${
                isArrived
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {isArrived ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock3 className="w-3.5 h-3.5" />}
              <span>{item.status}</span>
            </span>
            <span className="text-xs font-mono text-slate-400">PO ID: {item.id}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close PO detail modal"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Photo banner */}
          <div
            className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 aspect-video flex items-center justify-center cursor-pointer group shadow-inner"
            onClick={() => onViewImage(item.photoUrl, item.itemName)}
          >
            <img
              src={item.photoUrl}
              alt={item.itemName}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold backdrop-blur-xs">
              Click to view larger image
            </div>
          </div>

          {/* Title & Core info */}
          <div>
            <h2 id="po-detail-title" className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {item.itemName}
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Jumlah Unit
                </span>
                <span className="text-base font-black text-indigo-600 mt-0.5 block">
                  {item.quantity} Unit
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Tanggal Order
                </span>
                <span className="text-xs font-bold text-slate-800 mt-1 block">
                  {formatDate(item.dateOrder)}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Tanggal Kedatangan
                </span>
                <span className="text-xs font-bold text-slate-800 mt-1 block">
                  {item.dateArrival ? formatDate(item.dateArrival) : 'Belum tiba'}
                </span>
              </div>
            </div>
          </div>

          {/* For Use & Remarks */}
          <div className="space-y-3">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Peruntukan (For Use)
              </span>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                {item.forUse}
              </p>
            </div>

            {item.remarks && (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Remarks / Keterangan Tambahan
                </span>
                <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-line">
                  {item.remarks}
                </p>
              </div>
            )}
          </div>

          {/* Audit Trail Card */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Audit Trail (Recorded By)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Added / Ordered By
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-sm font-bold text-slate-800">
                  <User className="w-4 h-4 text-indigo-500" />
                  <span>{item.createdBy}</span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>{formatDateTime(item.createdAt)}</span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Last Edited By
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-sm font-bold text-slate-800">
                  <User className="w-4 h-4 text-indigo-500" />
                  <span>{item.updatedBy}</span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>{formatDateTime(item.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                onDelete(item);
                onClose();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete PO</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onEdit(item);
                  onClose();
                }}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit PO</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

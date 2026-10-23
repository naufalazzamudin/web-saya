import React from 'react';
import { X, Calendar, Hash, User, Clock, Edit2, Trash2, Tag, ShieldCheck, Sparkles } from 'lucide-react';
import type { PrelovedItem } from '../lib/types';
import { formatDate, formatDateTime } from '../lib/inventory-logic';

interface PrelovedDetailModalProps {
  item: PrelovedItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (item: PrelovedItem) => void;
  onDelete: (item: PrelovedItem) => void;
  onViewImage: (url: string, title: string) => void;
}

export const PrelovedDetailModal: React.FC<PrelovedDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onViewImage
}) => {
  if (!isOpen || !item) return null;

  const categoryColor = {
    'PC ITEMS': 'bg-purple-50 text-purple-700 border-purple-200',
    'NETWORK ITEMS': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'CCTV & TV ITEMS': 'bg-indigo-50 text-indigo-700 border-indigo-200'
  }[item.category] || 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preloved-detail-modal-title"
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
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border bg-purple-100 text-purple-700 border-purple-200">
              <Sparkles className="w-3 h-3 text-purple-600" />
              <span>PRELOVED</span>
            </span>
            <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${categoryColor}`}>
              {item.category}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail modal"
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
              Klik untuk melihat gambar ukuran penuh
            </div>
          </div>

          {/* Title & SN */}
          <div>
            <h2 id="preloved-detail-modal-title" className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {item.itemName}
            </h2>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-mono text-slate-500">
              <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-lg">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <span>SN: {item.serialNumber || 'N/A (Tidak ada SN)'}</span>
              </span>
              <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-lg">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Tanggal Dibereskan: {formatDate(item.dateRepaired)}</span>
              </span>
              <span className="flex items-center gap-1.5 bg-purple-50 text-purple-700 font-bold px-3 py-1 rounded-lg border border-purple-100">
                <span>Jumlah: {item.quantity ?? 1} Unit</span>
              </span>
            </div>

            {item.remark && (
              <div className="mt-3 p-3 bg-purple-50/70 border border-purple-200/60 rounded-xl text-xs flex items-start gap-2.5">
                <Tag className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase tracking-wider text-[10px] text-purple-700 block">Remark / Keterangan</span>
                  <span className="font-semibold text-slate-800">{item.remark}</span>
                </div>
              </div>
            )}
          </div>

          {/* Audit Trail Card */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Audit Trail & Activity Log</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Created info */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Ditambahkan Oleh
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-sm font-bold text-slate-800">
                  <User className="w-4 h-4 text-purple-500" />
                  <span>{item.createdBy}</span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>{formatDateTime(item.createdAt)}</span>
                </div>
              </div>

              {/* Updated info */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Terakhir Diedit Oleh
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-sm font-bold text-slate-800">
                  <User className="w-4 h-4 text-purple-500" />
                  <span>{item.updatedBy}</span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>{formatDateTime(item.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete(item);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus Data</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(item);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all hover:scale-[1.02]"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

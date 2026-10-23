import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Save, Loader2, Camera, Image as ImageIcon } from 'lucide-react';
import type { PurchaseOrderItem, POStatus } from '../lib/types';
import { createPurchaseOrder, updatePurchaseOrder, uploadImageBase64 } from '../lib/api';
import { compressImage } from '../lib/image-utils';

interface AddEditPOModalProps {
  isOpen: boolean;
  itemToEdit?: PurchaseOrderItem | null;
  onClose: () => void;
  onSuccess: (item: PurchaseOrderItem, isEdit: boolean) => void;
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export const AddEditPOModal: React.FC<AddEditPOModalProps> = ({
  isOpen,
  itemToEdit,
  onClose,
  onSuccess,
  onToast
}) => {
  const isEdit = !!itemToEdit;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const [itemName, setItemName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [dateOrder, setDateOrder] = useState(getTodayDate());
  const [dateArrival, setDateArrival] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [forUse, setForUse] = useState('');
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState<POStatus>('BELUM DATANG');

  const [isCompressing, setIsCompressing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (itemToEdit) {
      setItemName(itemToEdit.itemName);
      setPhotoUrl(itemToEdit.photoUrl);
      setDateOrder(itemToEdit.dateOrder ? itemToEdit.dateOrder.split('T')[0] : getTodayDate());
      setDateArrival(itemToEdit.dateArrival ? itemToEdit.dateArrival.split('T')[0] : '');
      setQuantity(itemToEdit.quantity || 1);
      setForUse(itemToEdit.forUse || '');
      setRemarks(itemToEdit.remarks || '');
      setStatus(itemToEdit.status || 'BELUM DATANG');
    } else {
      setItemName('');
      setPhotoUrl('');
      setDateOrder(getTodayDate());
      setDateArrival('');
      setQuantity(1);
      setForUse('');
      setRemarks('');
      setStatus('BELUM DATANG');
    }
    setError(null);
  }, [itemToEdit, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/i)) {
      setError('Pilih file gambar yang valid (JPG, PNG, atau WEBP).');
      return;
    }

    setIsCompressing(true);
    setError(null);

    try {
      const compressedDataUrl = await compressImage(file, 1200, 0.85);
      setPhotoUrl(compressedDataUrl);
    } catch (err: any) {
      setError('Gagal memproses gambar. Silakan gunakan gambar lain.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setError('Nama barang wajib diisi (Item name is required).');
      return;
    }
    if (!dateOrder) {
      setError('Tanggal order wajib diisi (Date order is required).');
      return;
    }
    if (quantity <= 0) {
      setError('Jumlah unit minimal 1.');
      return;
    }
    if (!forUse.trim()) {
      setError('Peruntukan (For Use) wajib diisi.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      let finalPhotoUrl = photoUrl;

      if (photoUrl && photoUrl.startsWith('data:image/')) {
        try {
          const uploadedUrl = await uploadImageBase64(photoUrl);
          finalPhotoUrl = uploadedUrl;
        } catch {
          finalPhotoUrl = photoUrl;
        }
      }

      if (isEdit && itemToEdit) {
        const res = await updatePurchaseOrder(itemToEdit.id, {
          itemName: itemName.trim(),
          photoUrl: finalPhotoUrl,
          dateOrder,
          dateArrival: dateArrival.trim() || null,
          quantity,
          forUse: forUse.trim(),
          remarks: remarks.trim() || null,
          status
        });
        onToast('Purchase Order berhasil diperbarui.', 'success');
        onSuccess(res.data, true);
      } else {
        const res = await createPurchaseOrder({
          itemName: itemName.trim(),
          photoUrl: finalPhotoUrl,
          dateOrder,
          dateArrival: dateArrival.trim() || null,
          quantity,
          forUse: forUse.trim(),
          remarks: remarks.trim() || null,
          status
        });
        onToast('Purchase Order berhasil ditambahkan.', 'success');
        onSuccess(res.data, false);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan Purchase Order. Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="po-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-300 flex items-center justify-center font-bold text-xs tracking-wider">
              PO
            </div>
            <div>
              <h2 id="po-modal-title" className="text-base font-bold tracking-tight">
                {isEdit ? 'Edit Purchase Order' : 'Tambah Purchase Order Baru'}
              </h2>
              <p className="text-xs text-slate-400">
                Pemesanan perlengkapan, sparepart & hardware IT hotel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela modal"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              {error}
            </div>
          )}

          {/* Item Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nama Barang <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Contoh: Patch Cord Cat6 2M (50 pcs) / RAM DDR4 16GB"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium text-slate-900"
              required
            />
          </div>

          {/* Status, Date Order & Quantity in 3 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Status Order <span className="text-rose-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as POStatus)}
                className={`w-full px-3 py-2.5 text-sm rounded-xl border font-bold transition-all ${
                  status === 'SUDAH DATANG'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}
              >
                <option value="BELUM DATANG">BELUM DATANG</option>
                <option value="SUDAH DATANG">SUDAH DATANG</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tanggal Order <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={dateOrder}
                onChange={(e) => setDateOrder(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Jumlah Unit <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                placeholder="1"
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium text-slate-900"
                required
              />
            </div>
          </div>

          {/* Date Arrival & For Use in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tanggal Kedatangan <span className="text-xs font-normal text-slate-400 lowercase">(opsional jika belum tiba)</span>
              </label>
              <input
                type="date"
                value={dateArrival}
                onChange={(e) => setDateArrival(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Peruntukan (For Use) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={forUse}
                onChange={(e) => setForUse(e.target.value)}
                placeholder="Contoh: Front Office PCs / Ballroom Wi-Fi"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium text-slate-900"
                required
              />
            </div>
          </div>

          {/* Remarks (Catatan) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Catatan / Remarks <span className="text-xs font-normal text-slate-400 lowercase">(opsional)</span>
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Contoh: Nomor PO, nama vendor/distributor, resi pengiriman..."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium text-slate-900"
            />
          </div>

          {/* Photo Upload & Preview - compact horizontal layout */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Foto Barang / Bukti PO <span className="text-xs font-normal text-slate-400 lowercase">(opsional)</span>
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Photo Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`relative w-full sm:w-44 h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${
                  photoUrl
                    ? 'border-blue-400 bg-blue-50/20'
                    : 'border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/10'
                }`}
              >
                {isCompressing ? (
                  <div className="flex flex-col items-center gap-2 text-blue-600">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-[10px] font-semibold">Mengompres Foto...</span>
                  </div>
                ) : photoUrl ? (
                  <>
                    <img
                      src={photoUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1">
                      <Camera className="w-5 h-5" />
                      <span className="text-[10px] font-bold">Ganti Foto</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400 p-3 text-center">
                    <ImageIcon className="w-7 h-7 text-slate-300" />
                    <span className="text-xs font-semibold text-slate-600">
                      Upload Foto Barang / PO
                    </span>
                    <span className="text-[10px] text-slate-400">JPG, PNG atau WEBP</span>
                  </div>
                )}
              </div>

              {/* Upload guidance */}
              <div className="flex-1 text-xs text-slate-500 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 hover:border-blue-500 hover:text-blue-600 text-slate-700 font-semibold bg-white transition-all shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{photoUrl ? 'Pilih Foto Pengganti' : 'Pilih File Gambar'}</span>
                  </button>
                  {photoUrl && (
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('')}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors"
                    >
                      Hapus
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Foto atau dokumen PO akan dioptimalkan dan disinkronkan ke folder Google Drive IT saat terhubung.
                </p>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving || isCompressing}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEdit ? 'Simpan Perubahan' : 'Tambahkan PO'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

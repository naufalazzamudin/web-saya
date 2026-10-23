import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Camera, Loader2, Save, Image as ImageIcon } from 'lucide-react';
import type { PrelovedItem, Category } from '../lib/types';
import { CATEGORIES } from '../lib/types';
import { createPreloved, updatePreloved, uploadImageBase64 } from '../lib/api';
import { compressImage } from '../lib/image-utils';

interface AddEditPrelovedModalProps {
  isOpen: boolean;
  itemToEdit?: PrelovedItem | null;
  initialCategory?: Category;
  onClose: () => void;
  onSuccess: (item: PrelovedItem, isEdit: boolean) => void;
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export const AddEditPrelovedModal: React.FC<AddEditPrelovedModalProps> = ({
  isOpen,
  itemToEdit,
  initialCategory,
  onClose,
  onSuccess,
  onToast
}) => {
  const isEdit = !!itemToEdit;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const [itemName, setItemName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [category, setCategory] = useState<Category>('PC ITEMS');
  const [dateRepaired, setDateRepaired] = useState(getTodayDate());
  const [quantity, setQuantity] = useState<number>(1);
  const [serialNumber, setSerialNumber] = useState('');
  const [remark, setRemark] = useState('');

  const [isCompressing, setIsCompressing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (itemToEdit) {
      setItemName(itemToEdit.itemName);
      setPhotoUrl(itemToEdit.photoUrl);
      setCategory(itemToEdit.category);
      setDateRepaired(itemToEdit.dateRepaired.split('T')[0]);
      setQuantity(itemToEdit.quantity ?? 1);
      setSerialNumber(itemToEdit.serialNumber || '');
      setRemark(itemToEdit.remark || '');
    } else {
      setItemName('');
      setPhotoUrl('');
      setCategory(initialCategory || 'PC ITEMS');
      setDateRepaired(getTodayDate());
      setQuantity(1);
      setSerialNumber('');
      setRemark('');
    }
    setError(null);
  }, [itemToEdit, initialCategory, isOpen]);

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
    if (!photoUrl && !isEdit) {
      setError('Foto barang wajib diunggah (Photo is required for new items).');
      return;
    }
    if (!dateRepaired) {
      setError('Tanggal dibereskan wajib diisi (Date cleaned/repaired is required).');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      let finalPhotoUrl = photoUrl;

      // If photo is a new compressed data URL, save it through upload endpoint
      if (photoUrl && photoUrl.startsWith('data:image/')) {
        try {
          const uploadedUrl = await uploadImageBase64(photoUrl);
          finalPhotoUrl = uploadedUrl;
        } catch {
          finalPhotoUrl = photoUrl;
        }
      }

      if (isEdit && itemToEdit) {
        const res = await updatePreloved(itemToEdit.id, {
          itemName: itemName.trim(),
          photoUrl: finalPhotoUrl,
          category,
          dateRepaired,
          quantity: Math.max(1, Number(quantity) || 1),
          serialNumber: serialNumber.trim() || null,
          remark: remark.trim() || null
        });
        onToast('Data Preloved berhasil diperbarui.', 'success');
        onSuccess(res.data, true);
      } else {
        const res = await createPreloved({
          itemName: itemName.trim(),
          photoUrl: finalPhotoUrl,
          category,
          dateRepaired,
          quantity: Math.max(1, Number(quantity) || 1),
          serialNumber: serialNumber.trim() || null,
          remark: remark.trim() || null
        });
        onToast('Data Preloved berhasil ditambahkan.', 'success');
        onSuccess(res.data, false);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan data Preloved.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-500/40 text-purple-300 flex items-center justify-center font-bold text-base">
              P
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                {isEdit ? 'Edit Data Preloved' : 'Tambah Data Preloved Baru'}
              </h2>
              <p className="text-xs text-slate-400">
                Barang bekas rekondisi/dibereskan (PC Item, Network, CCTV/TV)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
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
              placeholder="Contoh: HP ProDesk 400 G6 Micro Desktop (i5/16GB)"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all font-medium text-slate-900"
              required
            />
          </div>

          {/* Category, Date Repaired & Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Kategori <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all font-medium text-slate-900"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tanggal Dibereskan <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={dateRepaired}
                onChange={(e) => setDateRepaired(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all font-medium text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Jumlah Unit <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                placeholder="1"
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all font-medium text-slate-900"
                required
              />
            </div>
          </div>

          {/* Serial Number & Remark */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Serial Number <span className="text-xs font-normal text-slate-400 lowercase">(opsional)</span>
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Contoh: HP400-PRE-01 atau - "
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all font-mono text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Remark / Keterangan
              </label>
              <input
                type="text"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Contoh: ex Front Office, ex Room 801, ex Banquet"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all font-medium text-slate-900"
              />
            </div>
          </div>

          {/* Photo Upload & Preview */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Foto Barang <span className="text-rose-500">*</span>
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
                className={`relative w-full sm:w-48 h-36 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${
                  photoUrl
                    ? 'border-purple-400 bg-purple-50/20'
                    : 'border-slate-300 hover:border-purple-500 bg-slate-50 hover:bg-purple-50/10'
                }`}
              >
                {isCompressing ? (
                  <div className="flex flex-col items-center gap-2 text-purple-600">
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
                    <ImageIcon className="w-8 h-8 text-slate-300" />
                    <span className="text-xs font-semibold text-slate-600">
                      Klik untuk Upload Foto
                    </span>
                    <span className="text-[10px] text-slate-400">JPG, PNG atau WEBP</span>
                  </div>
                )}
              </div>

              {/* Upload actions guidance */}
              <div className="flex-1 text-xs text-slate-500 space-y-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 hover:border-purple-500 hover:text-purple-600 text-slate-700 font-semibold bg-white transition-all shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{photoUrl ? 'Pilih Foto Pengganti' : 'Pilih File Gambar'}</span>
                </button>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Foto akan otomatis di-compress dan diunggah ke Google Drive saat sinkronisasi Google aktif.
                </p>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
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
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEdit ? 'Simpan Perubahan' : 'Tambahkan Preloved'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

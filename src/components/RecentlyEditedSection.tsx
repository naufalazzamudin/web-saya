import React from 'react';
import { Sparkles, ArrowUpRight, Clock, ShoppingCart, Boxes } from 'lucide-react';
import { formatDate, formatDateTime } from '../lib/inventory-logic';

export interface UnifiedRecentItem {
  id: string;
  itemName: string;
  photoUrl: string;
  categoryOrStatus: string;
  itemType: 'INVENTORY' | 'PURCHASE ORDER' | 'PRELOVED';
  dateRef: string;
  dateRefLabel: string;
  serialOrQty: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  rawItem: any;
}

interface RecentlyEditedSectionProps {
  items: UnifiedRecentItem[];
  onSelectItem: (recentItem: UnifiedRecentItem) => void;
  onViewImage: (url: string, title: string) => void;
}

export const RecentlyEditedSection: React.FC<RecentlyEditedSectionProps> = ({
  items,
  onSelectItem,
  onViewImage
}) => {
  if (items.length === 0) {
    return null;
  }

  const badgeStyles: Record<string, string> = {
    'PC ITEMS': 'text-blue-700 bg-blue-50 border-blue-200',
    'NETWORK ITEMS': 'text-emerald-700 bg-emerald-50 border-emerald-200',
    'CCTV & TV ITEMS': 'text-purple-700 bg-purple-50 border-purple-200',
    'BELUM DATANG': 'text-amber-800 bg-amber-50 border-amber-200',
    'SUDAH DATANG': 'text-emerald-800 bg-emerald-50 border-emerald-200'
  };

  return (
    <section className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              RECENTLY EDITED
            </h2>
            <p className="text-xs text-slate-500">
              Aktivitas penambahan dan pembaruan terakhir pada Inventory, Purchase Order, dan Preloved
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-slate-400">
          {items.length} Aktivitas Terbaru
        </span>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((item) => {
          const isNewlyAdded = item.createdAt === item.updatedAt;
          const statusText = isNewlyAdded ? 'Added' : 'Edited';
          const authorText = isNewlyAdded ? `Added by: ${item.createdBy}` : `Edited by: ${item.updatedBy}`;
          const isPO = item.itemType === 'PURCHASE ORDER';
          const isPreloved = item.itemType === 'PRELOVED';

          return (
            <div
              key={`${item.itemType}-${item.id}`}
              onClick={() => onSelectItem(item)}
              className="group relative bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-400/80 p-4 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                {/* Header row inside card */}
                <div className="flex items-start gap-3.5">
                  <div
                    className="relative w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200/80 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewImage(item.photoUrl, item.itemName);
                    }}
                    title="Klik untuk melihat foto"
                  >
                    <img
                      src={item.photoUrl}
                      alt={item.itemName}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Type pill: Inventory vs PO vs Preloved */}
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 ${
                            isPO
                              ? 'bg-indigo-900 text-white'
                              : isPreloved
                              ? 'bg-purple-700 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isPO ? (
                            <ShoppingCart className="w-2.5 h-2.5" />
                          ) : isPreloved ? (
                            <Sparkles className="w-2.5 h-2.5" />
                          ) : (
                            <Boxes className="w-2.5 h-2.5" />
                          )}
                          <span>{item.itemType}</span>
                        </span>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            badgeStyles[item.categoryOrStatus] || 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {item.categoryOrStatus}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          isNewlyAdded
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {statusText}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                      {item.itemName}
                    </h3>

                    <div className="text-xs font-mono text-slate-500 truncate mt-0.5">
                      {item.serialOrQty}
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-[11px] text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">{item.dateRefLabel}:</span>
                    <span className="font-medium text-slate-700">{formatDate(item.dateRef)}</span>
                  </div>
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-indigo-600">{authorText}</span>
                  </div>
                </div>
              </div>

              {/* Timestamp footer */}
              <div className="mt-2.5 pt-2 border-t border-slate-100/60 flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{formatDateTime(item.updatedAt)}</span>
                </span>
                <span className="inline-flex items-center gap-0.5 text-indigo-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>View</span>
                  <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

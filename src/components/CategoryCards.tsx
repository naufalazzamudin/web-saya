import React from 'react';
import { Monitor, Network, Tv, ArrowRight } from 'lucide-react';
import type { InventoryStats, Category } from '../lib/types';

interface CategoryCardsProps {
  stats: InventoryStats;
  onSelectCategory: (category: Category) => void;
}

export const CategoryCards: React.FC<CategoryCardsProps> = ({ stats, onSelectCategory }) => {
  const cards = [
    {
      category: 'PC ITEMS' as Category,
      title: 'PC ITEMS',
      subtitle: 'Computers, Laptops, All-in-One, Mini PCs & Peripherals',
      count: stats.pcCount,
      icon: Monitor,
      color: 'blue',
      cardBg: 'from-blue-600 to-indigo-700',
      badgeBg: 'bg-blue-50 text-blue-700',
      borderAccent: 'hover:border-blue-500'
    },
    {
      category: 'NETWORK ITEMS' as Category,
      title: 'NETWORK ITEMS',
      subtitle: 'Switches, Routers, Access Points, Patch Panels & Cabling',
      count: stats.networkCount,
      icon: Network,
      color: 'emerald',
      cardBg: 'from-emerald-600 to-teal-700',
      badgeBg: 'bg-emerald-50 text-emerald-700',
      borderAccent: 'hover:border-emerald-500'
    },
    {
      category: 'CCTV & TV ITEMS' as Category,
      title: 'CCTV & TV ITEMS',
      subtitle: 'Dome/Bullet Cameras, DVR/NVR, Hospitality TVs & Monitors',
      count: stats.cctvCount,
      icon: Tv,
      color: 'purple',
      cardBg: 'from-purple-600 to-indigo-800',
      badgeBg: 'bg-purple-50 text-purple-700',
      borderAccent: 'hover:border-purple-500'
    }
  ];

  return (
    <section className="space-y-3.5">
      <div>
        <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
          CATEGORY DASHBOARD
        </h2>
        <p className="text-xs text-slate-500">
          Filter and browse hotel inventory by primary IT department categories
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.category}
              onClick={() => onSelectCategory(card.category)}
              className={`group relative bg-white rounded-3xl border border-slate-200 p-6 shadow-xs hover:shadow-xl transition-all duration-200 cursor-pointer overflow-hidden ${card.borderAccent}`}
            >
              {/* Subtle top decorative accent bar */}
              <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${card.cardBg}`} />

              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 group-hover:scale-110 group-hover:bg-slate-900 group-hover:text-white transition-all duration-200">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {card.count}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    ITEMS
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {card.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {card.subtitle}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
                <span>Browse Category</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

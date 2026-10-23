import React from 'react';
import { Boxes, Monitor, Network, Tv, CalendarPlus } from 'lucide-react';
import type { InventoryStats } from '../lib/types';

interface DashboardStatsProps {
  stats: InventoryStats;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  const statItems = [
    {
      label: 'TOTAL INVENTORY',
      value: stats.total,
      icon: Boxes,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-100'
    },
    {
      label: 'PC ITEMS',
      value: stats.pcCount,
      icon: Monitor,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-100'
    },
    {
      label: 'NETWORK ITEMS',
      value: stats.networkCount,
      icon: Network,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-100'
    },
    {
      label: 'CCTV & TV',
      value: stats.cctvCount,
      icon: Tv,
      color: 'text-purple-600',
      bg: 'bg-purple-50 border-purple-100'
    },
    {
      label: 'ADDED THIS MONTH',
      value: stats.addedThisMonth,
      icon: CalendarPlus,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-100'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {statItems.map((s, idx) => {
        const Icon = s.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                {s.label}
              </span>
              <div className={`p-1.5 rounded-lg border ${s.bg} ${s.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {s.value}
            </div>
          </div>
        );
      })}
    </div>
  );
};

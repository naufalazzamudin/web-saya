import React from 'react';
import { History, PlusCircle, Edit3, Trash2 } from 'lucide-react';
import type { ActivityRecord } from '../lib/types';
import { formatDateTime } from '../lib/inventory-logic';

interface RecentActivitySectionProps {
  activities: ActivityRecord[];
}

export const RecentActivitySection: React.FC<RecentActivitySectionProps> = ({ activities }) => {
  if (activities.length === 0) return null;

  const actionMeta = {
    Added: {
      icon: PlusCircle,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      label: 'added'
    },
    Edited: {
      icon: Edit3,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      label: 'edited'
    },
    Deleted: {
      icon: Trash2,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      label: 'deleted'
    }
  };

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
        <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
          <History className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base font-black text-slate-900 tracking-tight">
            RECENT ACTIVITY
          </h2>
          <p className="text-xs text-slate-500">Live operational log of IT department equipment movements</p>
        </div>
      </div>

      <div className="space-y-3">
        {activities.slice(0, 8).map((act) => {
          const meta = actionMeta[act.action] || actionMeta.Added;
          const Icon = meta.icon;

          return (
            <div
              key={act.id}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <div className={`p-2 rounded-xl border ${meta.color} shrink-0 mt-0.5`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs sm:text-sm text-slate-700">
                  <span className="font-bold text-slate-900">{act.username}</span>{' '}
                  <span className="font-medium text-slate-500">{meta.label}</span>{' '}
                  <span className="font-semibold text-slate-900 truncate inline-block max-w-[200px] sm:max-w-md align-bottom">
                    {act.itemName}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {formatDateTime(act.timestamp)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

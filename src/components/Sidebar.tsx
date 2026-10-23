import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  Monitor,
  Network,
  Tv,
  ShoppingCart,
  Calendar,
  FileSpreadsheet,
  Users,
  Settings,
  LogOut,
  X,
  Plus,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type NavTab =
  | 'dashboard'
  | 'inventory'
  | 'pc'
  | 'network'
  | 'cctv'
  | 'po'
  | 'preloved'
  | 'monthly-inventory'
  | 'monthly-po'
  | 'monthly-preloved'
  | 'export-inventory'
  | 'export-po'
  | 'export-preloved'
  | 'users'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenAddModal: () => void;
}

type NavItem =
  | { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }
  | { type: 'divider'; label: string };

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
  onOpenAddModal
}) => {
  const { logout } = useAuth();

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    { id: 'po', label: 'Purchase Order Data', icon: ShoppingCart },
    { id: 'preloved', label: 'Preloved Data', icon: Sparkles },
    { type: 'divider', label: 'MONTHLY DATA' },
    { id: 'monthly-inventory', label: 'Monthly Data Inventory', icon: Calendar },
    { id: 'monthly-po', label: 'Monthly Data Purchase Order', icon: Calendar },
    { id: 'monthly-preloved', label: 'Monthly Data Preloved', icon: Calendar },
    { type: 'divider', label: 'EXPORT DATA' },
    { id: 'export-inventory', label: 'Export Data Inventory', icon: FileSpreadsheet },
    { id: 'export-po', label: 'Export Data Purchase Order', icon: FileSpreadsheet },
    { id: 'export-preloved', label: 'Export Data Preloved', icon: FileSpreadsheet },
    { type: 'divider', label: 'SYSTEM' },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
              IT
            </div>
            <div>
              <div className="text-sm font-black text-white tracking-wide">
                HOTEL IT INVENTORY
              </div>
              <div className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest">
                Management System
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Action Button */}
        <div className="p-4">
          <button
            type="button"
            onClick={() => {
              onOpenAddModal();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ ADD DATA</span>
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item, idx) => {
            if ('type' in item) {
              return (
                <div
                  key={`div-${idx}`}
                  className="px-3 pt-3.5 pb-1 text-[9px] font-bold text-slate-400 tracking-wider uppercase"
                >
                  {item.label}
                </div>
              );
            }

            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id as NavTab)}
                className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 font-bold border-l-4 border-indigo-500'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Logout */}
        <div className="p-4 border-t border-slate-800">
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

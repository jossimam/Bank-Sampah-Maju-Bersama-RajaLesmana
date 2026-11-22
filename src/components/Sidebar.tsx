import React from 'react';
import {
  BarChart3,
  BookOpenCheck,
  FileSpreadsheet,
  LayoutDashboard,
  Scale,
  Tag,
  Wallet,
  X,
} from 'lucide-react';
import { BankSettings, NavSection } from '../types/bankSampah';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  settings: BankSettings;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: { id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
  { id: 'members', label: 'Master Nasabah', icon: BookOpenCheck },
  { id: 'deposits', label: 'Setoran Sampah', icon: Scale },
  { id: 'withdrawals', label: 'Penarikan Saldo', icon: Wallet },
  { id: 'catalog', label: 'Katalog Harga', icon: Tag },
  { id: 'reports', label: 'Laporan & Data', icon: FileSpreadsheet },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  settings,
  mobileOpen,
  onCloseMobile,
}) => {
  const content = (
    <div className="flex h-full flex-col justify-between bg-white border-r border-slate-200 w-64 shrink-0">
      <div>
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold tracking-tight text-slate-900 truncate">
              {settings.bankName.replace(/^Bank Sampah\s+/i, '') || settings.bankName}
            </span>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Tutup menu navigasi"
            className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-3 space-y-1" aria-label="Navigasi Utama">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectSection(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-emerald-700 ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-200 text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-800 truncate">{settings.bankName}</p>
        <p className="truncate">{settings.unitCode} · {settings.chairmanName}</p>
        <p className="text-slate-400 truncate">{settings.operationalHours}</p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block h-screen sticky top-0 z-20">{content}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <aside className="relative z-50 h-full">{content}</aside>
        </div>
      )}
    </>
  );
};

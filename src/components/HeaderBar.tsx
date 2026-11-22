import React from 'react';
import { Menu, Plus } from 'lucide-react';
import { NavSection } from '../types/bankSampah';

interface HeaderBarProps {
  activeSection: NavSection;
  bankName: string;
  onOpenMobileMenu: () => void;
  onQuickDeposit: () => void;
}

const SECTION_LABELS: Record<NavSection, string> = {
  overview: 'Ringkasan Operasional',
  deposits: 'Setoran & Timbangan Sampah',
  members: 'Master Nasabah & Buku Tabungan',
  withdrawals: 'Penarikan Saldo',
  catalog: 'Katalog & Harga Sampah',
  reports: 'Laporan & Pengaturan Data',
};

export const HeaderBar: React.FC<HeaderBarProps> = ({
  activeSection,
  bankName,
  onOpenMobileMenu,
  onQuickDeposit,
}) => {
  return (
    <header className="sticky top-0 z-10 h-16 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Buka menu navigasi"
          className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="hidden sm:inline text-slate-400 whitespace-nowrap truncate max-w-xs">
            {bankName}
          </span>
          <span className="hidden sm:inline text-slate-300" aria-hidden="true">
            /
          </span>
          <h1 className="font-semibold text-slate-900 truncate">
            {SECTION_LABELS[activeSection]}
          </h1>
        </div>
      </div>

      <button
        type="button"
        onClick={onQuickDeposit}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >
        <Plus className="w-4 h-4 shrink-0" />
        <span>Catat Setoran</span>
      </button>
    </header>
  );
};

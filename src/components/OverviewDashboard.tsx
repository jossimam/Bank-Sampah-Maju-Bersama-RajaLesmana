import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, MapPin, Clock, Receipt, Recycle, Search } from 'lucide-react';
import {
  formatDateId,
  formatRupiah,
  formatWeight,
  WASTE_CATEGORIES,
} from '../data/seedData';
import {
  BankSampahStore,
  DepositTransaction,
  NavSection,
  WasteCategory,
  WithdrawalTransaction,
} from '../types/bankSampah';
import { ReceiptPayload } from './ReceiptModal';

interface OverviewDashboardProps {
  store: BankSampahStore;
  onNavigate: (section: NavSection) => void;
  onOpenReceipt: (payload: ReceiptPayload) => void;
}

const FACILITY_IMAGE_PATH = '/src/assets/images/bank_sampah_facility_1795337719174.jpg';

const CATEGORY_COLORS: Record<WasteCategory, string> = {
  Plastik: 'bg-emerald-600',
  Kertas: 'bg-amber-500',
  Logam: 'bg-slate-700',
  Kaca: 'bg-sky-600',
  'Minyak Jelantah': 'bg-orange-500',
  Elektronik: 'bg-indigo-600',
};

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  store,
  onNavigate,
  onOpenReceipt,
}) => {
  const [chartMetric, setChartMetric] = useState<'weight' | 'amount'>('weight');
  const [imgError, setImgError] = useState(false);
  const [balanceSearch, setBalanceSearch] = useState('');

  const metrics = useMemo(() => {
    const totalWeightKg = store.deposits.reduce((sum, d) => sum + d.totalWeightKg, 0);
    const totalBalance = store.members.reduce((sum, m) => sum + m.balance, 0);
    const activeMembers = store.members.filter((m) => m.status === 'Aktif').length;

    const latestMonthPrefix = (() => {
      if (store.deposits.length === 0) {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      }
      const dates = store.deposits.map((d) => d.date).sort();
      return dates[dates.length - 1].slice(0, 7);
    })();

    const currentMonthDeposits = store.deposits.filter((d) =>
      d.date.startsWith(latestMonthPrefix)
    );
    const monthAmount = currentMonthDeposits.reduce((sum, d) => sum + d.totalAmount, 0);
    const monthWeight = currentMonthDeposits.reduce((sum, d) => sum + d.totalWeightKg, 0);

    return {
      totalWeightKg,
      totalBalance,
      activeMembers,
      totalMembers: store.members.length,
      monthAmount,
      monthWeight,
      monthCount: currentMonthDeposits.length,
    };
  }, [store]);

  const monthlySeries = useMemo(() => {
    const map = new Map<string, { label: string; weight: number; amount: number; count: number }>();
    const sorted = [...store.deposits].sort((a, b) => a.date.localeCompare(b.date));

    for (const dep of sorted) {
      const ym = dep.date.slice(0, 7);
      const existing = map.get(ym);
      const dateObj = new Date(ym + '-01T00:00:00');
      const label = Number.isNaN(dateObj.getTime())
        ? ym
        : new Intl.DateTimeFormat('id-ID', { month: 'short', year: '2-digit' }).format(dateObj);
      if (existing) {
        existing.weight += dep.totalWeightKg;
        existing.amount += dep.totalAmount;
        existing.count += 1;
      } else {
        map.set(ym, {
          label,
          weight: dep.totalWeightKg,
          amount: dep.totalAmount,
          count: 1,
        });
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([, val]) => val);
  }, [store.deposits]);

  const maxChartVal = useMemo(() => {
    const vals = monthlySeries.map((m) => (chartMetric === 'weight' ? m.weight : m.amount));
    return Math.max(...vals, 1);
  }, [monthlySeries, chartMetric]);

  const categoryBreakdown = useMemo(() => {
    const totals = new Map<WasteCategory, { weight: number; amount: number }>();
    for (const cat of WASTE_CATEGORIES) {
      totals.set(cat, { weight: 0, amount: 0 });
    }
    for (const dep of store.deposits) {
      for (const item of dep.items) {
        const entry = totals.get(item.category);
        if (entry) {
          entry.weight += item.weightKg;
          entry.amount += item.subtotal;
        }
      }
    }
    const totalWeight = Array.from(totals.values()).reduce((s, v) => s + v.weight, 0) || 1;
    return WASTE_CATEGORIES.map((category) => {
      const data = totals.get(category) ?? { weight: 0, amount: 0 };
      return {
        category,
        weight: data.weight,
        amount: data.amount,
        percent: (data.weight / totalWeight) * 100,
      };
    }).sort((a, b) => b.weight - a.weight);
  }, [store.deposits]);

  const recentActivity = useMemo(() => {
    type Combined =
      | { kind: 'deposit'; date: string; createdAt: string; tx: DepositTransaction }
      | { kind: 'withdrawal'; date: string; createdAt: string; tx: WithdrawalTransaction };

    const items: Combined[] = [
      ...store.deposits.map((tx) => ({
        kind: 'deposit' as const,
        date: tx.date,
        createdAt: tx.createdAt,
        tx,
      })),
      ...store.withdrawals.map((tx) => ({
        kind: 'withdrawal' as const,
        date: tx.date,
        createdAt: tx.createdAt,
        tx,
      })),
    ];

    return items
      .sort((a, b) => {
        const cmp = b.date.localeCompare(a.date);
        return cmp !== 0 ? cmp : b.createdAt.localeCompare(a.createdAt);
      })
      .slice(0, 7);
  }, [store.deposits, store.withdrawals]);

  const memberBalances = useMemo(() => {
    const depMap = new Map<string, { amount: number; count: number }>();
    for (const d of store.deposits) {
      const cur = depMap.get(d.memberId) ?? { amount: 0, count: 0 };
      cur.amount += d.totalAmount;
      cur.count += 1;
      depMap.set(d.memberId, cur);
    }

    const wdMap = new Map<string, number>();
    for (const w of store.withdrawals) {
      wdMap.set(w.memberId, (wdMap.get(w.memberId) ?? 0) + w.amount);
    }

    const q = balanceSearch.trim().toLowerCase();
    return [...store.members]
      .map((m) => {
        const dep = depMap.get(m.id) ?? { amount: 0, count: 0 };
        const wdAmount = wdMap.get(m.id) ?? 0;
        return {
          ...m,
          depositCount: dep.count,
          totalDepositAmount: dep.amount,
          totalWithdrawalAmount: wdAmount,
        };
      })
      .filter(
        (m) =>
          !q ||
          m.name.toLowerCase().includes(q) ||
          m.memberNumber.toLowerCase().includes(q) ||
          m.rtRw.toLowerCase().includes(q)
      )
      .sort((a, b) => b.balance - a.balance);
  }, [store.members, store.deposits, store.withdrawals, balanceSearch]);

  return (
    <div className="space-y-6">
      {/* 4-Column KPI Strip */}
      <section aria-label="Metrik Utama" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Total Sampah Terkumpul</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {formatWeight(metrics.totalWeightKg)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            Dari {store.deposits.length} transaksi setoran tercatat
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Total Saldo Nasabah</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700 font-mono tabular-nums">
            {formatRupiah(metrics.totalBalance)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            Akumulasi tabungan siap cair seluruh anggota
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Setoran Periode Terakhir</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {formatRupiah(metrics.monthAmount)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {formatWeight(metrics.monthWeight)} · {metrics.monthCount} kali timbang
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Nasabah Terdaftar</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {metrics.activeMembers} <span className="text-sm font-normal text-slate-400">/ {metrics.totalMembers}</span>
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            Nasabah berstatus aktif menyetor
          </p>
        </div>
      </section>

      {/* Analytics Row */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Tren Setoran Bulanan
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Rekapitulasi volume dan nilai rupiah 6 bulan terakhir
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setChartMetric('weight')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  chartMetric === 'weight'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Berat (kg)
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('amount')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  chartMetric === 'amount'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Nilai (Rp)
              </button>
            </div>
          </div>

          {monthlySeries.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-slate-500">Belum ada data setoran bulanan.</p>
              <button
                type="button"
                onClick={() => onNavigate('deposits')}
                className="mt-3 px-4 py-2 text-xs font-medium text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50"
              >
                Catat Setoran Pertama
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-6 gap-3 items-end h-52 pt-4">
              {monthlySeries.map((bar) => {
                const value = chartMetric === 'weight' ? bar.weight : bar.amount;
                const heightPct = Math.max(8, Math.round((value / maxChartVal) * 100));
                return (
                  <div key={bar.label} className="flex flex-col items-center h-full justify-end gap-2 group">
                    <div className="text-[11px] font-mono tabular-nums text-slate-600 text-center truncate w-full">
                      {chartMetric === 'weight'
                        ? `${bar.weight.toFixed(1)} kg`
                        : `${Math.round(bar.amount / 1000)} rb`}
                    </div>
                    <div className="w-full flex-1 flex items-end justify-center bg-slate-50 rounded-lg overflow-hidden p-1">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full max-w-10 rounded-md bg-emerald-700 group-hover:bg-emerald-600 transition-all duration-200"
                        title={`${bar.label}: ${formatWeight(bar.weight)} · ${formatRupiah(bar.amount)}`}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
                      {bar.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Komposisi Kategori Sampah
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribusi berat terpilah berdasarkan kategori utama
            </p>
          </div>

          <div className="mt-5 space-y-3.5">
            {categoryBreakdown.map((item) => (
              <div key={item.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800">{item.category}</span>
                  <span className="font-mono tabular-nums text-slate-600">
                    {formatWeight(item.weight)} · {item.percent.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${CATEGORY_COLORS[item.category]}`}
                    style={{ width: `${Math.max(item.weight > 0 ? 3 : 0, item.percent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {store.wasteItems.filter((w) => w.active).length} jenis sampah aktif dibeli
            </span>
            <button
              type="button"
              onClick={() => onNavigate('catalog')}
              className="font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              Kelola Katalog
            </button>
          </div>
        </div>
      </section>

      {/* Unit Profile & Recent Transactions */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="relative h-48 sm:h-56 bg-slate-100 overflow-hidden">
            {!imgError ? (
              <img
                src={FACILITY_IMAGE_PATH}
                alt="Pos Penimbangan Bank Sampah Maju Bersama Raja Lesmana"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-800 to-slate-800 flex items-center justify-center text-white">
                <Recycle className="w-10 h-10 opacity-80" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
            <div className="absolute bottom-4 left-5 right-5 text-white">
              <p className="text-xs font-mono text-emerald-200">{store.settings.unitCode}</p>
              <h3 className="text-lg font-bold tracking-tight mt-0.5 text-balance">
                {store.settings.bankName}
              </h3>
            </div>
          </div>

          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>{store.settings.address}</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>Jadwal Buka: {store.settings.operationalHours}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                Ketua Unit: <span className="font-medium text-slate-800">{store.settings.chairmanName}</span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('members')}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 whitespace-nowrap shrink-0"
              >
                Lihat Nasabah
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Aktivitas Transaksi Terbaru
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Klik transaksi untuk membuka atau mencetak struk resmi
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('deposits')}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline whitespace-nowrap shrink-0"
            >
              Semua Setoran
            </button>
          </div>

          {recentActivity.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-10 text-sm text-slate-500">
              Belum ada transaksi tercatat.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 flex-1">
              {recentActivity.map((entry) => {
                if (entry.kind === 'deposit') {
                  const tx = entry.tx;
                  return (
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() => onOpenReceipt({ type: 'deposit', tx })}
                      className="w-full py-3 px-2 -mx-2 rounded-lg hover:bg-slate-50 flex items-center justify-between gap-4 text-left transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                          <ArrowDownLeft className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {tx.memberName}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            <span className="text-emerald-700 font-medium">Setoran</span>
                            <span aria-hidden="true"> · </span>
                            <span className="font-mono">{tx.receiptNumber}</span>
                            <span aria-hidden="true"> · </span>
                            <span className="tabular-nums">{formatWeight(tx.totalWeightKg)}</span>
                            <span aria-hidden="true"> · </span>
                            <span>{formatDateId(tx.date)}</span>
                            {tx.notes && (
                              <>
                                <span aria-hidden="true"> · </span>
                                <span className="text-slate-600">{tx.notes}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-mono tabular-nums font-semibold text-emerald-700">
                          +{formatRupiah(tx.totalAmount)}
                        </span>
                        <Receipt className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </button>
                  );
                }

                const tx = entry.tx;
                return (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => onOpenReceipt({ type: 'withdrawal', tx })}
                    className="w-full py-3 px-2 -mx-2 rounded-lg hover:bg-slate-50 flex items-center justify-between gap-4 text-left transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {tx.memberName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          <span className="text-amber-700 font-medium">Penarikan ({tx.method})</span>
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono">{tx.referenceNumber}</span>
                          <span aria-hidden="true"> · </span>
                          <span>{formatDateId(tx.date)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-mono tabular-nums font-semibold text-amber-700">
                        -{formatRupiah(tx.amount)}
                      </span>
                      <Receipt className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Per-Member Balance Overview */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Informasi Saldo Masing-Masing Nasabah
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rincian saldo tabungan, total setoran masuk, dan penarikan per anggota ({memberBalances.length} dari {store.members.length} nasabah)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                placeholder="Cari nasabah atau no. induk..."
                value={balanceSearch}
                onChange={(e) => setBalanceSearch(e.target.value)}
                className="h-9 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 w-56 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
            <button
              type="button"
              onClick={() => onNavigate('members')}
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 whitespace-nowrap shrink-0"
            >
              Kelola di Master Nasabah
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-600">
                <th className="py-2.5 px-4 whitespace-nowrap">No. Induk</th>
                <th className="py-2.5 px-4">Nama Nasabah</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Wilayah</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Berat Setor</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Total Masuk</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Total Tarik</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Saldo Tersedia</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {memberBalances.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-slate-500">
                    {store.members.length === 0
                      ? 'Belum ada nasabah terdaftar (saldo Rp 0). Tambahkan nasabah melalui menu Master Nasabah.'
                      : 'Tidak ada data nasabah yang sesuai dengan pencarian.'}
                  </td>
                </tr>
              ) : (
                memberBalances.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-xs font-medium text-slate-700 whitespace-nowrap">
                      {m.memberNumber}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900 text-xs sm:text-sm">
                        {m.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {m.memberType} · {m.depositCount} kali setor
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                      {m.rtRw}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-slate-700 whitespace-nowrap">
                      {formatWeight(m.totalWeightKg)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-slate-700 whitespace-nowrap">
                      {formatRupiah(m.totalDepositAmount)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-amber-700 whitespace-nowrap">
                      {m.totalWithdrawalAmount > 0 ? formatRupiah(m.totalWithdrawalAmount) : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs sm:text-sm font-bold text-emerald-700 whitespace-nowrap">
                      {formatRupiah(m.balance)}
                    </td>
                    <td className="py-2.5 px-4 text-xs whitespace-nowrap">
                      <span
                        className={
                          m.status === 'Aktif'
                            ? 'text-emerald-700 font-medium'
                            : 'text-slate-400 font-medium'
                        }
                      >
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200 text-xs font-semibold text-slate-800">
                <td colSpan={6} className="py-2.5 px-4 text-right">
                  Total Akumulasi Saldo Seluruh Nasabah
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-emerald-700 text-sm whitespace-nowrap">
                  {formatRupiah(metrics.totalBalance)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
};

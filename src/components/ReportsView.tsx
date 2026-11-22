import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Download, RotateCcw, Save, Search, Upload } from 'lucide-react';
import { formatRupiah, formatWeight, WASTE_CATEGORIES } from '../data/seedData';
import { BankSampahStore, BankSettings, WasteCategory } from '../types/bankSampah';

interface ReportsViewProps {
  store: BankSampahStore;
  onUpdateSettings: (settings: BankSettings) => void;
  onImportStore: (imported: BankSampahStore) => void;
  onResetStore: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  store,
  onUpdateSettings,
  onImportStore,
  onResetStore,
}) => {
  const [settingsForm, setSettingsForm] = useState<BankSettings>(store.settings);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [settingsSavedMsg, setSettingsSavedMsg] = useState<string>('');
  const [settingsErrorMsg, setSettingsErrorMsg] = useState<string>('');
  const [balanceSearch, setBalanceSearch] = useState<string>('');
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSettingsForm(store.settings);
  }, [store.settings]);

  const hasSettingsChanges = useMemo(() => {
    return (
      settingsForm.bankName.trim() !== store.settings.bankName ||
      settingsForm.unitCode.trim() !== store.settings.unitCode ||
      settingsForm.chairmanName.trim() !== store.settings.chairmanName ||
      settingsForm.phone.trim() !== store.settings.phone ||
      settingsForm.address.trim() !== store.settings.address ||
      settingsForm.operationalHours.trim() !== store.settings.operationalHours
    );
  }, [settingsForm, store.settings]);

  const summary = useMemo(() => {
    const totalDepositsAmount = store.deposits.reduce((s, d) => s + d.totalAmount, 0);
    const totalWithdrawalsAmount = store.withdrawals.reduce((s, w) => s + w.amount, 0);
    const totalWeightKg = store.deposits.reduce((s, d) => s + d.totalWeightKg, 0);

    const byCategory = new Map<
      WasteCategory,
      { weight: number; buyAmount: number; sellAmount: number; count: number }
    >();
    for (const c of WASTE_CATEGORIES) {
      byCategory.set(c, { weight: 0, buyAmount: 0, sellAmount: 0, count: 0 });
    }
    let totalSellAmount = 0;

    for (const dep of store.deposits) {
      for (const item of dep.items) {
        const catalogItem = store.wasteItems.find((w) => w.id === item.wasteItemId);
        const sellPrice = catalogItem
          ? catalogItem.sellPricePerKg
          : Math.round(item.pricePerKg * 1.25);
        const lineSell = Math.round(item.weightKg * sellPrice);
        totalSellAmount += lineSell;

        const entry = byCategory.get(item.category);
        if (entry) {
          entry.weight += item.weightKg;
          entry.buyAmount += item.subtotal;
          entry.sellAmount += lineSell;
          entry.count += 1;
        }
      }
    }

    return {
      totalDepositsAmount,
      totalSellAmount,
      totalProfitAmount: totalSellAmount - totalDepositsAmount,
      totalWithdrawalsAmount,
      outstandingBalance: totalDepositsAmount - totalWithdrawalsAmount,
      totalWeightKg,
      rows: WASTE_CATEGORIES.map((cat) => {
        const data = byCategory.get(cat) ?? {
          weight: 0,
          buyAmount: 0,
          sellAmount: 0,
          count: 0,
        };
        return {
          category: cat,
          ...data,
          profit: data.sellAmount - data.buyAmount,
        };
      }),
    };
  }, [store]);

  const memberBalanceRows = useMemo(() => {
    const depMap = new Map<string, { amount: number; count: number }>();
    for (const d of store.deposits) {
      const cur = depMap.get(d.memberId) ?? { amount: 0, count: 0 };
      cur.amount += d.totalAmount;
      cur.count += 1;
      depMap.set(d.memberId, cur);
    }

    const wdMap = new Map<string, { amount: number; count: number }>();
    for (const w of store.withdrawals) {
      const cur = wdMap.get(w.memberId) ?? { amount: 0, count: 0 };
      cur.amount += w.amount;
      cur.count += 1;
      wdMap.set(w.memberId, cur);
    }

    const q = balanceSearch.trim().toLowerCase();
    return [...store.members]
      .map((m) => {
        const dep = depMap.get(m.id) ?? { amount: 0, count: 0 };
        const wd = wdMap.get(m.id) ?? { amount: 0, count: 0 };
        return {
          ...m,
          depositCount: dep.count,
          totalDepositAmount: dep.amount,
          withdrawalCount: wd.count,
          totalWithdrawalAmount: wd.amount,
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

  const balanceTotals = useMemo(() => {
    return memberBalanceRows.reduce(
      (acc, m) => ({
        weight: acc.weight + m.totalWeightKg,
        deposits: acc.deposits + m.totalDepositAmount,
        withdrawals: acc.withdrawals + m.totalWithdrawalAmount,
        balance: acc.balance + m.balance,
      }),
      { weight: 0, deposits: 0, withdrawals: 0, balance: 0 }
    );
  }, [memberBalanceRows]);

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportDepositsCsv = () => {
    const header = 'No Struk,Tanggal,No Anggota,Nama Nasabah,Berat Total (kg),Total Rupiah,Catatan';
    const lines = store.deposits.map((d) =>
      [
        d.receiptNumber,
        d.date,
        d.memberNumber,
        `"${d.memberName.replace(/"/g, '""')}"`,
        d.totalWeightKg,
        d.totalAmount,
        `"${(d.notes || '').replace(/"/g, '""')}"`,
      ].join(',')
    );
    downloadFile([header, ...lines].join('\n'), 'laporan-setoran-maju-bersama-raja-lesmana.csv', 'text/csv;charset=utf-8;');
    setStatusMessage('File CSV setoran berhasil diunduh.');
    setErrorMessage('');
  };

  const handleExportMembersCsv = () => {
    const header = 'No Anggota,Nama,RT/RW,Telepon,Alamat,Total Berat (kg),Saldo (Rp),Status';
    const lines = store.members.map((m) =>
      [
        m.memberNumber,
        `"${m.name.replace(/"/g, '""')}"`,
        `"${m.rtRw.replace(/"/g, '""')}"`,
        m.phone,
        `"${m.address.replace(/"/g, '""')}"`,
        m.totalWeightKg,
        m.balance,
        m.status,
      ].join(',')
    );
    downloadFile([header, ...lines].join('\n'), 'data-nasabah-maju-bersama-raja-lesmana.csv', 'text/csv;charset=utf-8;');
    setStatusMessage('File CSV nasabah berhasil diunduh.');
    setErrorMessage('');
  };

  const handleExportBalancesCsv = () => {
    const header =
      'No Induk,Nama Nasabah,Jenis Nasabah,RT/RW,Total Berat (kg),Total Setoran Masuk (Rp),Total Penarikan (Rp),Saldo Tersedia (Rp),Status';
    const lines = memberBalanceRows.map((m) =>
      [
        m.memberNumber,
        `"${m.name.replace(/"/g, '""')}"`,
        `"${m.memberType}"`,
        `"${m.rtRw.replace(/"/g, '""')}"`,
        m.totalWeightKg,
        m.totalDepositAmount,
        m.totalWithdrawalAmount,
        m.balance,
        m.status,
      ].join(',')
    );
    downloadFile(
      [header, ...lines].join('\n'),
      'saldo-masing-masing-nasabah-maju-bersama-raja-lesmana.csv',
      'text/csv;charset=utf-8;'
    );
    setStatusMessage('Laporan saldo masing-masing nasabah (CSV) berhasil diunduh.');
    setErrorMessage('');
  };

  const handleExportBackupJson = () => {
    downloadFile(
      JSON.stringify(store, null, 2),
      'cadangan-bank-sampah-maju-bersama-raja-lesmana.json',
      'application/json'
    );
    setStatusMessage('Cadangan lengkap (JSON) berhasil diunduh.');
    setErrorMessage('');
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BankSampahStore;
      if (
        !parsed ||
        !Array.isArray(parsed.members) ||
        !Array.isArray(parsed.wasteItems) ||
        !Array.isArray(parsed.deposits)
      ) {
        setErrorMessage('Format berkas cadangan JSON tidak valid.');
        return;
      }
      const normalizedImport: BankSampahStore = {
        ...parsed,
        settings: parsed.settings ?? store.settings,
      };
      onImportStore(normalizedImport);
      setSettingsForm(normalizedImport.settings);
      setStatusMessage('Data cadangan berhasil dipulihkan ke browser ini.');
      setErrorMessage('');
    } catch {
      setErrorMessage('Gagal membaca berkas JSON. Pastikan file tidak rusak.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsErrorMsg('');
    setSettingsSavedMsg('');

    const cleaned: BankSettings = {
      bankName: settingsForm.bankName.trim(),
      unitCode: settingsForm.unitCode.trim(),
      chairmanName: settingsForm.chairmanName.trim() || '-',
      phone: settingsForm.phone.trim() || '-',
      address: settingsForm.address.trim() || '-',
      operationalHours: settingsForm.operationalHours.trim() || '-',
    };

    if (!cleaned.bankName) {
      setSettingsErrorMsg('Nama Bank Sampah wajib diisi.');
      return;
    }
    if (!cleaned.unitCode) {
      setSettingsErrorMsg('Kode Unit wajib diisi.');
      return;
    }

    setSettingsForm(cleaned);
    onUpdateSettings(cleaned);
    setSettingsSavedMsg('Identitas unit berhasil disimpan dan diterapkan ke seluruh aplikasi & struk.');
    setStatusMessage('Identitas Unit Bank Sampah berhasil diperbarui.');
    setErrorMessage('');
  };

  return (
    <div className="space-y-6">
      {statusMessage && (
        <div className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
          {statusMessage}
        </div>
      )}
      {errorMessage && (
        <div role="alert" className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          {errorMessage}
        </div>
      )}

      {/* Financial & Weight Summary */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Rekapitulasi Keuangan, Nilai Jual &amp; Keuntungan
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Akumulasi pembelian dari nasabah, estimasi penjualan ke pengepul, dan margin keuntungan unit
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportDepositsCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh CSV Setoran</span>
            </button>
            <button
              type="button"
              onClick={handleExportMembersCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh CSV Nasabah</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-xs text-slate-500">Total Beli (Setoran Nasabah)</p>
            <p className="mt-1 text-lg font-bold font-mono tabular-nums text-slate-900">
              {formatRupiah(summary.totalDepositsAmount)}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-xs text-slate-500">Estimasi Nilai Jual Pengepul</p>
            <p className="mt-1 text-lg font-bold font-mono tabular-nums text-slate-900">
              {formatRupiah(summary.totalSellAmount)}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-emerald-50/70 border border-emerald-200">
            <p className="text-xs text-emerald-800">Estimasi Keuntungan Unit</p>
            <p className="mt-1 text-lg font-bold font-mono tabular-nums text-emerald-700">
              {summary.totalProfitAmount >= 0 ? '+' : ''}
              {formatRupiah(summary.totalProfitAmount)}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-xs text-slate-500">Total Penarikan / Berat</p>
            <p className="mt-1 text-lg font-bold font-mono tabular-nums text-amber-700">
              {formatRupiah(summary.totalWithdrawalsAmount)}
            </p>
            <p className="text-[11px] font-mono text-slate-500 mt-0.5">
              Total berat: {formatWeight(summary.totalWeightKg)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-600">
                <th className="py-2.5 px-4">Kategori Sampah</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Total Berat</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Nilai Beli</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Nilai Jual</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Keuntungan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.rows.map((row) => (
                <tr key={row.category}>
                  <td className="py-2.5 px-4 text-xs sm:text-sm font-medium text-slate-800">
                    {row.category}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-slate-700">
                    {formatWeight(row.weight)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-slate-700">
                    {formatRupiah(row.buyAmount)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-slate-900 font-medium">
                    {formatRupiah(row.sellAmount)}
                  </td>
                  <td
                    className={`py-2.5 px-4 text-right font-mono tabular-nums text-xs font-semibold ${
                      row.profit >= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {row.profit >= 0 ? '+' : ''}
                    {formatRupiah(row.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Per-Member Balance Report */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Rekap Saldo Masing-Masing Nasabah
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Posisi saldo tabungan aktif, akumulasi setoran masuk, dan penarikan per anggota
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                placeholder="Cari nasabah atau no. induk..."
                value={balanceSearch}
                onChange={(e) => setBalanceSearch(e.target.value)}
                className="h-9 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 w-52 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
            <button
              type="button"
              onClick={handleExportBalancesCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh CSV Saldo</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-600">
                <th className="py-2.5 px-4 whitespace-nowrap">No. Induk</th>
                <th className="py-2.5 px-4">Nasabah &amp; Wilayah</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Total Berat</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Setoran Masuk</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Penarikan</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Saldo Saat Ini</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {memberBalanceRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                    {store.members.length === 0
                      ? 'Belum ada data nasabah terdaftar (saldo Rp 0).'
                      : 'Tidak ada data nasabah yang sesuai dengan pencarian.'}
                  </td>
                </tr>
              ) : (
                memberBalanceRows.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-mono text-xs font-medium text-slate-700 whitespace-nowrap">
                      {m.memberNumber}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900 text-xs sm:text-sm">
                        {m.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {m.rtRw} · {m.depositCount} setor · {m.withdrawalCount} tarik
                      </div>
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
                <td colSpan={2} className="py-2.5 px-4">
                  Total ({memberBalanceRows.length} Nasabah)
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                  {formatWeight(balanceTotals.weight)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                  {formatRupiah(balanceTotals.deposits)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-amber-700 whitespace-nowrap">
                  {formatRupiah(balanceTotals.withdrawals)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-emerald-700 text-sm whitespace-nowrap">
                  {formatRupiah(balanceTotals.balance)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Unit Settings & Backup/Restore */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSaveSettings}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4"
        >
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Identitas Unit Bank Sampah
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Informasi ini tampil pada kop struk setoran dan profil unit
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="s-name" className="block text-xs font-medium text-slate-700 mb-1">
                Nama Bank Sampah
              </label>
              <input
                id="s-name"
                type="text"
                value={settingsForm.bankName}
                onChange={(e) => setSettingsForm({ ...settingsForm, bankName: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
            <div>
              <label htmlFor="s-code" className="block text-xs font-medium text-slate-700 mb-1">
                Kode Unit
              </label>
              <input
                id="s-code"
                type="text"
                value={settingsForm.unitCode}
                onChange={(e) => setSettingsForm({ ...settingsForm, unitCode: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
            <div>
              <label htmlFor="s-chair" className="block text-xs font-medium text-slate-700 mb-1">
                Ketua / Pengurus
              </label>
              <input
                id="s-chair"
                type="text"
                value={settingsForm.chairmanName}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, chairmanName: e.target.value })
                }
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
            <div>
              <label htmlFor="s-phone" className="block text-xs font-medium text-slate-700 mb-1">
                Nomor Telepon Unit
              </label>
              <input
                id="s-phone"
                type="text"
                value={settingsForm.phone}
                onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
          </div>

          <div>
            <label htmlFor="s-addr" className="block text-xs font-medium text-slate-700 mb-1">
              Alamat Pos Penimbangan
            </label>
            <input
              id="s-addr"
              type="text"
              value={settingsForm.address}
              onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div>
            <label htmlFor="s-hours" className="block text-xs font-medium text-slate-700 mb-1">
              Jadwal Operasional
            </label>
            <input
              id="s-hours"
              type="text"
              value={settingsForm.operationalHours}
              onChange={(e) =>
                setSettingsForm({ ...settingsForm, operationalHours: e.target.value })
              }
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          {settingsErrorMsg && (
            <p
              role="alert"
              className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
            >
              {settingsErrorMsg}
            </p>
          )}
          {settingsSavedMsg && (
            <p className="flex items-center gap-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-700" />
              <span>{settingsSavedMsg}</span>
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <span className="text-[11px] text-slate-500">
              {hasSettingsChanges
                ? 'Ada perubahan yang belum disimpan.'
                : 'Identitas unit tersimpan.'}
            </span>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Identitas Unit</span>
            </button>
          </div>
        </form>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Cadangan &amp; Pemulihan Data Lokal
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Seluruh catatan tersimpan otomatis di browser ini. Unduh file cadangan secara berkala agar aman saat berpindah perangkat.
            </p>
          </div>

          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={handleExportBackupJson}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-800"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Cadangan Lengkap (JSON)</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportJson}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-800"
            >
              <Upload className="w-4 h-4" />
              <span>Impor Cadangan JSON</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-3">
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Kosongkan Nasabah &amp; Reset ke Awal</span>
              </button>
            ) : (
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 space-y-2.5">
                <p className="text-xs text-red-800 font-medium">
                  Hapus seluruh nasabah dan riwayat transaksi lokal (saldo menjadi Rp 0) sambil mempertahankan katalog harga awal?
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-1.5 rounded-md bg-white border border-slate-300 text-xs font-medium text-slate-700"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onResetStore();
                      setConfirmReset(false);
                      setStatusMessage('Data nasabah dikosongkan dan saldo diatur ulang ke Rp 0.');
                    }}
                    className="px-3 py-1.5 rounded-md bg-red-700 hover:bg-red-800 text-white text-xs font-medium"
                  >
                    Ya, Reset Data
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

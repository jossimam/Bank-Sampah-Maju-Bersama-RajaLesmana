import React, { useMemo, useState } from 'react';
import { Receipt, Search } from 'lucide-react';
import { formatDateId, formatRupiah, getTodayIsoDate } from '../data/seedData';
import {
  Member,
  WithdrawalMethod,
  WithdrawalTransaction,
} from '../types/bankSampah';

interface WithdrawalsViewProps {
  members: Member[];
  withdrawals: WithdrawalTransaction[];
  preselectedMemberId?: string;
  onCreateWithdrawal: (payload: {
    memberId: string;
    date: string;
    amount: number;
    method: WithdrawalMethod;
    notes: string;
  }) => WithdrawalTransaction | null;
  onOpenReceipt: (tx: WithdrawalTransaction) => void;
}

const METHODS: WithdrawalMethod[] = ['Tunai', 'Transfer Bank', 'Tukar Sembako'];

export const WithdrawalsView: React.FC<WithdrawalsViewProps> = ({
  members,
  withdrawals,
  preselectedMemberId,
  onCreateWithdrawal,
  onOpenReceipt,
}) => {
  const membersWithBalance = useMemo(
    () => members.filter((m) => m.status === 'Aktif'),
    [members]
  );

  const [memberId, setMemberId] = useState<string>(
    preselectedMemberId || membersWithBalance[0]?.id || ''
  );
  const [date, setDate] = useState<string>(getTodayIsoDate());
  const [amountInput, setAmountInput] = useState<string>('');
  const [method, setMethod] = useState<WithdrawalMethod>('Tunai');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const selectedMember = members.find((m) => m.id === memberId);
  const availableBalance = selectedMember?.balance ?? 0;

  const setFraction = (ratio: number) => {
    if (!selectedMember || availableBalance <= 0) return;
    const val = Math.floor((availableBalance * ratio) / 100) * 100;
    setAmountInput(String(ratio === 1 ? availableBalance : Math.max(val, 0)));
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedMember) {
      setError('Pilih nasabah terlebih dahulu.');
      return;
    }
    const parsedAmount = Number(amountInput);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Nominal penarikan harus lebih besar dari Rp 0.');
      return;
    }
    if (parsedAmount > selectedMember.balance) {
      setError(
        `Saldo tidak mencukupi. Saldo tersedia ${formatRupiah(selectedMember.balance)}.`
      );
      return;
    }

    const created = onCreateWithdrawal({
      memberId: selectedMember.id,
      date,
      amount: Math.round(parsedAmount),
      method,
      notes: notes.trim(),
    });

    if (created) {
      setAmountInput('');
      setNotes('');
      onOpenReceipt(created);
    }
  };

  const filteredWithdrawals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...withdrawals]
      .filter(
        (w) =>
          !q ||
          w.memberName.toLowerCase().includes(q) ||
          w.referenceNumber.toLowerCase().includes(q) ||
          w.memberNumber.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const cmp = b.date.localeCompare(a.date);
        return cmp !== 0 ? cmp : b.createdAt.localeCompare(a.createdAt);
      });
  }, [withdrawals, searchQuery]);

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Formulir Penarikan Saldo Nasabah
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pencairan tabungan tunai, transfer, atau penukaran paket sembako
            </p>
          </div>
          {selectedMember && (
            <div className="text-right text-xs">
              <p className="text-slate-500">Saldo Tersedia ({selectedMember.memberNumber})</p>
              <p className="font-mono tabular-nums font-semibold text-emerald-700 text-base">
                {formatRupiah(availableBalance)}
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="wd-member" className="block text-xs font-medium text-slate-700 mb-1.5">
                Nasabah
              </label>
              <select
                id="wd-member"
                value={memberId}
                onChange={(e) => {
                  setMemberId(e.target.value);
                  setError('');
                }}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                <option value="">-- Pilih Nasabah --</option>
                {membersWithBalance.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.memberNumber} — {m.name} ({formatRupiah(m.balance)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="wd-method" className="block text-xs font-medium text-slate-700 mb-1.5">
                Metode Pencairan
              </label>
              <select
                id="wd-method"
                value={method}
                onChange={(e) => setMethod(e.target.value as WithdrawalMethod)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="wd-date" className="block text-xs font-medium text-slate-700 mb-1.5">
                Tanggal Pencairan
              </label>
              <input
                id="wd-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-5">
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="wd-amount" className="text-xs font-medium text-slate-700">
                  Nominal Penarikan (Rp)
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFraction(0.25)}
                    className="px-2 py-0.5 text-[11px] font-medium rounded border border-slate-200 hover:bg-slate-100 text-slate-600"
                  >
                    25%
                  </button>
                  <button
                    type="button"
                    onClick={() => setFraction(0.5)}
                    className="px-2 py-0.5 text-[11px] font-medium rounded border border-slate-200 hover:bg-slate-100 text-slate-600"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setFraction(1)}
                    className="px-2 py-0.5 text-[11px] font-medium rounded border border-slate-200 hover:bg-slate-100 text-slate-600"
                  >
                    Semua
                  </button>
                </div>
              </div>
              <input
                id="wd-amount"
                type="number"
                min="1000"
                step="500"
                placeholder="0"
                value={amountInput}
                onChange={(e) => {
                  setAmountInput(e.target.value);
                  setError('');
                }}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div className="md:col-span-5">
              <label htmlFor="wd-notes" className="block text-xs font-medium text-slate-700 mb-1.5">
                Keterangan (Opsional)
              </label>
              <input
                id="wd-notes"
                type="text"
                placeholder="Misal: Pencairan tabungan bulanan"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="w-full h-10 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                Proses Tarik
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </form>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Riwayat Penarikan Saldo
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Total {filteredWithdrawals.length} transaksi pencairan tercatat
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Cari nama atau no. referensi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 w-60 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-600">
                <th className="py-2.5 px-4 whitespace-nowrap">No. Referensi</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Tanggal</th>
                <th className="py-2.5 px-4">Nasabah</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Metode</th>
                <th className="py-2.5 px-4">Keterangan</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Nominal</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Bukti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-slate-500">
                    Belum ada transaksi penarikan yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredWithdrawals.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-xs font-medium text-slate-700 whitespace-nowrap">
                      {tx.referenceNumber}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                      {formatDateId(tx.date)}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900 text-xs sm:text-sm">
                        {tx.memberName}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {tx.memberNumber}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-700 whitespace-nowrap">
                      {tx.method}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                      {tx.notes || '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs font-semibold text-amber-700 whitespace-nowrap">
                      -{formatRupiah(tx.amount)}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onOpenReceipt(tx)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Cetak Struk</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

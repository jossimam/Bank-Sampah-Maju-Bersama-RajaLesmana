import React, { useMemo, useState } from 'react';
import { Check, Edit3, Plus, Receipt, Search, Trash2, X } from 'lucide-react';
import {
  formatDateId,
  formatRupiah,
  formatWeight,
  getTodayIsoDate,
  WASTE_CATEGORIES,
} from '../data/seedData';
import {
  DepositLineItem,
  DepositTransaction,
  Member,
  WasteCategory,
  WasteItem,
} from '../types/bankSampah';

const QUICK_NOTE_PRESETS = [
  'Bersih & Kering',
  'Terpilah Rapi',
  'Setoran Rutin',
  'Perlu Pilah Ulang',
];

interface DepositViewProps {
  members: Member[];
  wasteItems: WasteItem[];
  deposits: DepositTransaction[];
  preselectedMemberId?: string;
  onCreateDeposit: (payload: {
    memberId: string;
    date: string;
    items: DepositLineItem[];
    notes: string;
  }) => DepositTransaction | null;
  onUpdateDepositNote: (depositId: string, notes: string) => void;
  onOpenReceipt: (tx: DepositTransaction) => void;
}

interface DraftRow {
  key: string;
  wasteItemId: string;
  weightInput: string;
}

export const DepositView: React.FC<DepositViewProps> = ({
  members,
  wasteItems,
  deposits,
  preselectedMemberId,
  onCreateDeposit,
  onUpdateDepositNote,
  onOpenReceipt,
}) => {
  const activeMembers = useMemo(
    () => members.filter((m) => m.status === 'Aktif'),
    [members]
  );
  const activeWasteItems = useMemo(
    () => wasteItems.filter((w) => w.active),
    [wasteItems]
  );

  const [memberId, setMemberId] = useState<string>(
    preselectedMemberId || activeMembers[0]?.id || ''
  );
  const [date, setDate] = useState<string>(getTodayIsoDate());
  const [notes, setNotes] = useState<string>('');
  const [rows, setRows] = useState<DraftRow[]>([
    {
      key: 'row-1',
      wasteItemId: activeWasteItems[0]?.id || '',
      weightInput: '',
    },
  ]);
  const [formError, setFormError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'Semua' | WasteCategory>('Semua');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState<string>('');

  const selectedMember = members.find((m) => m.id === memberId);

  const selectedMemberLastNote = useMemo(() => {
    if (!memberId) return null;
    const memberDeposits = deposits
      .filter((d) => d.memberId === memberId && d.notes.trim().length > 0)
      .sort((a, b) => b.date.localeCompare(a.date));
    return memberDeposits[0] ?? null;
  }, [deposits, memberId]);

  const computedItems = useMemo(() => {
    return rows
      .map((row) => {
        const waste = wasteItems.find((w) => w.id === row.wasteItemId);
        const weight = parseFloat(row.weightInput.replace(',', '.'));
        if (!waste || Number.isNaN(weight) || weight <= 0) {
          return null;
        }
        const subtotal = Math.round(weight * waste.pricePerKg);
        return {
          wasteItemId: waste.id,
          wasteName: waste.name,
          category: waste.category,
          weightKg: Number(weight.toFixed(2)),
          unit: waste.unit,
          pricePerKg: waste.pricePerKg,
          subtotal,
        } satisfies DepositLineItem;
      })
      .filter((x): x is DepositLineItem => x !== null);
  }, [rows, wasteItems]);

  const totalWeight = useMemo(
    () => computedItems.reduce((sum, item) => sum + item.weightKg, 0),
    [computedItems]
  );
  const totalAmount = useMemo(
    () => computedItems.reduce((sum, item) => sum + item.subtotal, 0),
    [computedItems]
  );

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        key: `row-${Date.now()}-${prev.length}`,
        wasteItemId: activeWasteItems[0]?.id || '',
        weightInput: '',
      },
    ]);
  };

  const handleRemoveRow = (key: string) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  };

  const handleRowChange = (key: string, patch: Partial<DraftRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setFormError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (activeMembers.length === 0) {
      setFormError('Belum ada nasabah aktif. Tambahkan atau aktifkan nasabah di Master Nasabah.');
      return;
    }
    if (!memberId) {
      setFormError('Pilih nasabah terlebih dahulu.');
      return;
    }
    if (activeWasteItems.length === 0) {
      setFormError('Belum ada jenis sampah aktif di Katalog Harga.');
      return;
    }
    if (computedItems.length === 0) {
      setFormError('Masukkan minimal satu jenis sampah dengan berat lebih dari 0.');
      return;
    }

    const created = onCreateDeposit({
      memberId,
      date,
      items: computedItems,
      notes: notes.trim(),
    });

    if (created) {
      setRows([
        {
          key: `row-${Date.now()}`,
          wasteItemId: activeWasteItems[0]?.id || '',
          weightInput: '',
        },
      ]);
      setNotes('');
      setSuccessMsg(`Setoran ${created.receiptNumber} berhasil dicatat.`);
      onOpenReceipt(created);
    }
  };

  const filteredDeposits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...deposits]
      .filter((dep) => {
        const matchesSearch =
          !q ||
          dep.memberName.toLowerCase().includes(q) ||
          dep.memberNumber.toLowerCase().includes(q) ||
          dep.receiptNumber.toLowerCase().includes(q) ||
          (dep.notes || '').toLowerCase().includes(q);
        const matchesCat =
          categoryFilter === 'Semua' ||
          dep.items.some((item) => item.category === categoryFilter);
        return matchesSearch && matchesCat;
      })
      .sort((a, b) => {
        const cmp = b.date.localeCompare(a.date);
        return cmp !== 0 ? cmp : b.createdAt.localeCompare(a.createdAt);
      });
  }, [deposits, searchQuery, categoryFilter]);

  return (
    <div className="space-y-6">
      {/* Deposit Weighing Form */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Formulir Timbangan Setoran Sampah
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Catat beberapa jenis sampah sekaligus dalam satu struk tabungan nasabah
            </p>
          </div>
          {selectedMember && (
            <div className="text-right text-xs">
              <p className="text-slate-500">Saldo Saat Ini ({selectedMember.memberNumber})</p>
              <p className="font-mono tabular-nums font-semibold text-emerald-700 text-sm">
                {formatRupiah(selectedMember.balance)}
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="deposit-member" className="block text-xs font-medium text-slate-700 mb-1.5">
                Nasabah Penyetor
              </label>
              <select
                id="deposit-member"
                value={memberId}
                onChange={(e) => {
                  setMemberId(e.target.value);
                  setFormError('');
                }}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                <option value="">-- Pilih Nasabah --</option>
                {activeMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.memberNumber} — {m.name} ({m.rtRw}) · Saldo {formatRupiah(m.balance)}
                  </option>
                ))}
              </select>
              {selectedMemberLastNote && (
                <p className="mt-1.5 text-[11px] text-slate-500 truncate">
                  Catatan setoran terakhir ({formatDateId(selectedMemberLastNote.date)}):{' '}
                  <span className="text-slate-700 font-medium">
                    &ldquo;{selectedMemberLastNote.notes}&rdquo;
                  </span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="deposit-date" className="block text-xs font-medium text-slate-700 mb-1.5">
                Tanggal Setoran
              </label>
              <input
                id="deposit-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">
                Rincian Item Timbangan
              </span>
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Baris</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {rows.map((row) => {
                const selectedWaste = wasteItems.find((w) => w.id === row.wasteItemId);
                const parsedWeight = parseFloat(row.weightInput.replace(',', '.'));
                const rowSubtotal =
                  selectedWaste && !Number.isNaN(parsedWeight) && parsedWeight > 0
                    ? Math.round(parsedWeight * selectedWaste.pricePerKg)
                    : 0;

                return (
                  <div
                    key={row.key}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center p-3 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] text-slate-500 mb-1">
                        Jenis Sampah
                      </label>
                      <select
                        value={row.wasteItemId}
                        onChange={(e) =>
                          handleRowChange(row.key, { wasteItemId: e.target.value })
                        }
                        className="w-full h-9 px-2.5 rounded-md border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      >
                        {activeWasteItems.map((w) => (
                          <option key={w.id} value={w.id}>
                            [{w.code}] {w.name} — {formatRupiah(w.pricePerKg)}/{w.unit}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] text-slate-500 mb-1">
                        Berat / Volume ({selectedWaste?.unit ?? 'kg'})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.0"
                        value={row.weightInput}
                        onChange={(e) =>
                          handleRowChange(row.key, { weightInput: e.target.value })
                        }
                        className="w-full h-9 px-2.5 rounded-md border border-slate-300 bg-white text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <span className="block text-[11px] text-slate-500 mb-1">
                        Subtotal Rupiah
                      </span>
                      <div className="h-9 px-2.5 flex items-center justify-end rounded-md bg-white border border-slate-200 font-mono tabular-nums text-sm font-semibold text-slate-900">
                        {formatRupiah(rowSubtotal)}
                      </div>
                    </div>

                    <div className="sm:col-span-1 flex justify-end sm:pt-5">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.key)}
                        disabled={rows.length === 1}
                        aria-label="Hapus baris sampah"
                        className="p-2 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end pt-2">
            <div className="md:col-span-6 space-y-2">
              <label htmlFor="deposit-notes" className="block text-xs font-medium text-slate-700">
                Catatan Setoran Nasabah
              </label>
              <input
                id="deposit-notes"
                type="text"
                placeholder="Misal: Kondisi bersih, terpilah rapi, jadwal setor rutin..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                {QUICK_NOTE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() =>
                      setNotes((prev) =>
                        prev.trim()
                          ? prev.includes(preset)
                            ? prev
                            : `${prev.trim()}, ${preset}`
                          : preset
                      )
                    }
                    className="px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-medium text-slate-700 transition-colors whitespace-nowrap shrink-0"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-6 flex flex-wrap items-center justify-between gap-4 bg-emerald-50/70 border border-emerald-200 rounded-lg px-4 py-2.5">
              <div>
                <p className="text-xs text-emerald-800">
                  Total Berat: <span className="font-mono tabular-nums font-semibold">{formatWeight(totalWeight)}</span>
                </p>
                <p className="text-base font-bold text-emerald-900 font-mono tabular-nums">
                  {formatRupiah(totalAmount)}
                </p>
                {selectedMember && (
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Saldo setelah setor:{' '}
                    <span className="font-mono tabular-nums font-semibold">
                      {formatRupiah(selectedMember.balance + totalAmount)}
                    </span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                Simpan Setoran
              </button>
            </div>
          </div>

          {formError && (
            <p role="alert" className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}
          {successMsg && (
            <p className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              {successMsg}
            </p>
          )}
        </form>
      </section>

      {/* Deposit History Table */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Riwayat Setoran Sampah
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Menampilkan {filteredDeposits.length} dari {deposits.length} transaksi setoran
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                placeholder="Cari nama atau no. struk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 w-56 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          {(['Semua', ...WASTE_CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                categoryFilter === cat
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-600">
                <th className="py-2.5 px-4 whitespace-nowrap">No. Struk</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Tanggal</th>
                <th className="py-2.5 px-4">Nasabah</th>
                <th className="py-2.5 px-4">Rincian Item</th>
                <th className="py-2.5 px-4">Catatan Setoran</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Berat</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Total Rupiah</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDeposits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs text-slate-500">
                    Tidak ada transaksi setoran yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredDeposits.map((tx) => {
                  const isEditingThisNote = editingNoteId === tx.id;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-xs font-medium text-slate-700 whitespace-nowrap">
                        {tx.receiptNumber}
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
                      <td className="py-2.5 px-4 text-xs text-slate-600 max-w-xs">
                        <div className="truncate">
                          {tx.items
                            .map((i) => `${i.wasteName} (${formatWeight(i.weightKg, i.unit)})`)
                            .join(' · ')}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-xs min-w-44 max-w-xs">
                        {isEditingThisNote ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              autoFocus
                              value={editingNoteText}
                              onChange={(e) => setEditingNoteText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  onUpdateDepositNote(tx.id, editingNoteText);
                                  setEditingNoteId(null);
                                } else if (e.key === 'Escape') {
                                  setEditingNoteId(null);
                                }
                              }}
                              placeholder="Tulis catatan setoran..."
                              className="h-8 px-2 rounded border border-emerald-600 bg-white text-xs text-slate-900 w-full focus:outline-none"
                            />
                            <button
                              type="button"
                              aria-label="Simpan catatan"
                              onClick={() => {
                                onUpdateDepositNote(tx.id, editingNoteText);
                                setEditingNoteId(null);
                              }}
                              className="p-1.5 rounded bg-emerald-700 text-white hover:bg-emerald-800 shrink-0"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label="Batal ubah catatan"
                              onClick={() => setEditingNoteId(null)}
                              className="p-1.5 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 group">
                            <span
                              className={
                                tx.notes
                                  ? 'text-slate-700 truncate'
                                  : 'text-slate-400 italic truncate'
                              }
                            >
                              {tx.notes || 'Belum ada catatan'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNoteId(tx.id);
                                setEditingNoteText(tx.notes || '');
                              }}
                              aria-label={`Ubah catatan ${tx.receiptNumber}`}
                              className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 shrink-0"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-slate-700 whitespace-nowrap">
                        {formatWeight(tx.totalWeightKg)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs font-semibold text-emerald-700 whitespace-nowrap">
                        {formatRupiah(tx.totalAmount)}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

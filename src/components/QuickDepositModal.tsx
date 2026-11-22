import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import {
  formatDateId,
  formatRupiah,
  formatWeight,
  getTodayIsoDate,
} from '../data/seedData';
import {
  DepositLineItem,
  DepositTransaction,
  Member,
  WasteItem,
} from '../types/bankSampah';

const QUICK_NOTE_PRESETS = [
  'Bersih & Kering',
  'Terpilah Rapi',
  'Setoran Rutin',
  'Perlu Pilah Ulang',
];

interface DraftRow {
  key: string;
  wasteItemId: string;
  weightInput: string;
}

interface QuickDepositModalProps {
  open: boolean;
  members: Member[];
  wasteItems: WasteItem[];
  deposits: DepositTransaction[];
  initialMemberId?: string;
  onClose: () => void;
  onCreateDeposit: (payload: {
    memberId: string;
    date: string;
    items: DepositLineItem[];
    notes: string;
  }) => DepositTransaction | null;
  onCreated: (tx: DepositTransaction) => void;
}

export const QuickDepositModal: React.FC<QuickDepositModalProps> = ({
  open,
  members,
  wasteItems,
  deposits,
  initialMemberId,
  onClose,
  onCreateDeposit,
  onCreated,
}) => {
  const activeMembers = useMemo(
    () => members.filter((m) => m.status === 'Aktif'),
    [members]
  );
  const activeWasteItems = useMemo(
    () => wasteItems.filter((w) => w.active),
    [wasteItems]
  );

  const [memberId, setMemberId] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayIsoDate());
  const [notes, setNotes] = useState<string>('');
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [formError, setFormError] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    const defaultMember =
      (initialMemberId && activeMembers.some((m) => m.id === initialMemberId)
        ? initialMemberId
        : activeMembers[0]?.id) || '';
    setMemberId(defaultMember);
    setDate(getTodayIsoDate());
    setNotes('');
    setRows([
      {
        key: `qrow-${Date.now()}`,
        wasteItemId: activeWasteItems[0]?.id || '',
        weightInput: '',
      },
    ]);
    setFormError('');
  }, [open, initialMemberId, activeMembers, activeWasteItems]);

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

  if (!open) return null;

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        key: `qrow-${Date.now()}-${prev.length}`,
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

    if (activeMembers.length === 0) {
      setFormError('Belum ada nasabah aktif. Tambahkan atau aktifkan nasabah di Master Nasabah.');
      return;
    }
    if (!memberId) {
      setFormError('Pilih nasabah penyetor terlebih dahulu.');
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
      onClose();
      onCreated(created);
    } else {
      setFormError('Gagal menyimpan setoran. Periksa kembali data nasabah dan item sampah.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Catat Setoran Sampah"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Catat Setoran Sampah
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Input timbangan setoran nasabah untuk langsung menambah saldo dan mencetak struk
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form catat setoran"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="quick-deposit-member"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Nasabah Penyetor
              </label>
              <select
                id="quick-deposit-member"
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
              {selectedMember && (
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Saldo saat ini:{' '}
                  <span className="font-mono tabular-nums font-semibold text-emerald-700">
                    {formatRupiah(selectedMember.balance)}
                  </span>
                  {selectedMemberLastNote && (
                    <>
                      <span aria-hidden="true"> · </span>
                      <span>
                        Catatan terakhir ({formatDateId(selectedMemberLastNote.date)}): &ldquo;
                        {selectedMemberLastNote.notes}&rdquo;
                      </span>
                    </>
                  )}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="quick-deposit-date"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Tanggal Setoran
              </label>
              <input
                id="quick-deposit-date"
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
              {rows.map((row, idx) => {
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
                        autoFocus={idx === 0}
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

          <div className="space-y-2">
            <label
              htmlFor="quick-deposit-notes"
              className="block text-xs font-medium text-slate-700"
            >
              Catatan Setoran Nasabah
            </label>
            <input
              id="quick-deposit-notes"
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

          {formError && (
            <p
              role="alert"
              className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
            >
              {formError}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 bg-emerald-50/70 border border-emerald-200 rounded-lg px-4 py-3">
            <div>
              <p className="text-xs text-emerald-800">
                Total Berat:{' '}
                <span className="font-mono tabular-nums font-semibold">
                  {formatWeight(totalWeight)}
                </span>
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

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                Simpan Setoran
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

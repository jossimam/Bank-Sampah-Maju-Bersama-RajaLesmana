import React, { useMemo, useState } from 'react';
import { Edit3, Plus, Recycle, X } from 'lucide-react';
import { formatRupiah, formatWeight, WASTE_CATEGORIES } from '../data/seedData';
import { DepositTransaction, WasteCategory, WasteItem } from '../types/bankSampah';

interface CatalogViewProps {
  wasteItems: WasteItem[];
  deposits: DepositTransaction[];
  onSaveWasteItem: (item: Omit<WasteItem, 'id'> & { id?: string }) => void;
  onToggleActive: (id: string) => void;
}

const SORTING_GUIDE_IMAGE = '/src/assets/images/waste_sorting_guide_1795337718725.jpg';

export const CatalogView: React.FC<CatalogViewProps> = ({
  wasteItems,
  deposits,
  onSaveWasteItem,
  onToggleActive,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'Semua' | WasteCategory>('Semua');
  const [imgError, setImgError] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<WasteCategory>('Plastik');
  const [priceInput, setPriceInput] = useState('');
  const [sellPriceInput, setSellPriceInput] = useState('');
  const [unit, setUnit] = useState<'kg' | 'liter'>('kg');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');

  const itemStats = useMemo(() => {
    const map = new Map<string, { weight: number; buyTotal: number }>();
    for (const dep of deposits) {
      for (const line of dep.items) {
        const existing = map.get(line.wasteItemId);
        if (existing) {
          existing.weight += line.weightKg;
          existing.buyTotal += line.subtotal;
        } else {
          map.set(line.wasteItemId, {
            weight: line.weightKg,
            buyTotal: line.subtotal,
          });
        }
      }
    }
    return map;
  }, [deposits]);

  const profitSummary = useMemo(() => {
    let totalBuyValue = 0;
    let totalSellValue = 0;
    let totalWeight = 0;

    for (const dep of deposits) {
      for (const line of dep.items) {
        const catalogItem = wasteItems.find((w) => w.id === line.wasteItemId);
        const sellPrice = catalogItem
          ? catalogItem.sellPricePerKg
          : Math.round(line.pricePerKg * 1.25);
        totalWeight += line.weightKg;
        totalBuyValue += line.subtotal;
        totalSellValue += Math.round(line.weightKg * sellPrice);
      }
    }

    const totalProfit = totalSellValue - totalBuyValue;
    const avgMarginPct = totalBuyValue > 0 ? (totalProfit / totalBuyValue) * 100 : 0;

    const avgUnitMargin =
      wasteItems.length > 0
        ? wasteItems.reduce((s, w) => s + (w.sellPricePerKg - w.pricePerKg), 0) /
          wasteItems.length
        : 0;

    return {
      totalBuyValue,
      totalSellValue,
      totalProfit,
      totalWeight,
      avgMarginPct,
      avgUnitMargin,
    };
  }, [deposits, wasteItems]);

  const filteredItems = useMemo(() => {
    if (categoryFilter === 'Semua') return wasteItems;
    return wasteItems.filter((w) => w.category === categoryFilter);
  }, [wasteItems, categoryFilter]);

  const openCreateModal = () => {
    setEditingId(null);
    setCode('');
    setName('');
    setCategory('Plastik');
    setPriceInput('');
    setSellPriceInput('');
    setUnit('kg');
    setDescription('');
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (item: WasteItem) => {
    setEditingId(item.id);
    setCode(item.code);
    setName(item.name);
    setCategory(item.category);
    setPriceInput(String(item.pricePerKg));
    setSellPriceInput(String(item.sellPricePerKg));
    setUnit(item.unit);
    setDescription(item.description);
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const buyPrice = Number(priceInput);
    const sellPrice = Number(sellPriceInput);
    if (!code.trim() || !name.trim()) {
      setFormError('Kode dan nama jenis sampah wajib diisi.');
      return;
    }
    if (Number.isNaN(buyPrice) || buyPrice <= 0) {
      setFormError('Harga beli nasabah harus lebih dari Rp 0.');
      return;
    }
    if (Number.isNaN(sellPrice) || sellPrice <= 0) {
      setFormError('Harga jual ke pengepul harus lebih dari Rp 0.');
      return;
    }
    onSaveWasteItem({
      id: editingId ?? undefined,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      category,
      pricePerKg: Math.round(buyPrice),
      sellPricePerKg: Math.round(sellPrice),
      unit,
      active: editingId
        ? wasteItems.find((w) => w.id === editingId)?.active ?? true
        : true,
      description: description.trim() || 'Kondisi bersih, kering, dan terpilah.',
    });
    setShowModal(false);
  };

  const draftBuy = Number(priceInput) || 0;
  const draftSell = Number(sellPriceInput) || 0;
  const draftDiff = draftSell - draftBuy;
  const draftMarginPct = draftBuy > 0 ? (draftDiff / draftBuy) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Editorial Sorting Banner */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-5 bg-slate-100 min-h-48 lg:min-h-0">
          {!imgError ? (
            <img
              src={SORTING_GUIDE_IMAGE}
              alt="Panduan Pemilahan Sampah Terpilah Bank Sampah Maju Bersama Raja Lesmana"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-500">
              <Recycle className="w-10 h-10" />
            </div>
          )}
        </div>
        <div className="lg:col-span-7 p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 text-balance">
              Katalog Harga Beli, Harga Jual &amp; Keuntungan Unit
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
              Kelola tarif pembelian sampah dari nasabah dan harga penjualan ke pengepul/mitra daur ulang untuk memantau selisih margin dan nilai keuntungan operasional Bank Sampah Maju Bersama Raja Lesmana.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              {wasteItems.filter((w) => w.active).length} jenis aktif · Rata-rata margin{' '}
              <span className="font-mono font-medium text-slate-700">
                {formatRupiah(profitSummary.avgUnitMargin)}/satuan
              </span>
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jenis Sampah</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3-Column Profit Summary Strip */}
      <section aria-label="Ringkasan Nilai Keuntungan" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Total Nilai Beli (Setoran Nasabah)</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {formatRupiah(profitSummary.totalBuyValue)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            Dari total {formatWeight(profitSummary.totalWeight)} sampah terkumpul
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Estimasi Nilai Jual (Pengepul)</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {formatRupiah(profitSummary.totalSellValue)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            Proyeksi hasil penjualan seluruh stok terkumpul
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Estimasi Nilai Keuntungan Unit</p>
          <p
            className={`mt-2 text-2xl font-bold font-mono tabular-nums ${
              profitSummary.totalProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {profitSummary.totalProfit >= 0 ? '+' : ''}
            {formatRupiah(profitSummary.totalProfit)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            Margin rata-rata {profitSummary.avgMarginPct.toFixed(1)}% dari nilai beli
          </p>
        </div>
      </section>

      {/* Catalog Table */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
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
                <th className="py-2.5 px-4 whitespace-nowrap">Kode</th>
                <th className="py-2.5 px-4">Jenis Sampah &amp; Syarat</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Harga Beli</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Harga Jual</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Keuntungan / Satuan</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Estimasi Laba</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Status</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Kelola</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const unitProfit = item.sellPricePerKg - item.pricePerKg;
                const marginPct =
                  item.pricePerKg > 0 ? (unitProfit / item.pricePerKg) * 100 : 0;
                const stats = itemStats.get(item.id);
                const collectedWeight = stats?.weight ?? 0;
                const estTotalProfit =
                  Math.round(collectedWeight * item.sellPricePerKg) -
                  (stats?.buyTotal ?? 0);

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs font-medium text-slate-600 whitespace-nowrap">
                      {item.code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 text-xs sm:text-sm">
                        {item.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        <span>{item.category}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{item.description}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-700 whitespace-nowrap">
                      {formatRupiah(item.pricePerKg)}
                      <span className="text-slate-400">/{item.unit}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-medium text-slate-900 whitespace-nowrap">
                      {formatRupiah(item.sellPricePerKg)}
                      <span className="text-slate-400 font-normal">/{item.unit}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs whitespace-nowrap">
                      <div
                        className={`font-semibold ${
                          unitProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {unitProfit >= 0 ? '+' : ''}
                        {formatRupiah(unitProfit)}
                        <span className="text-slate-400 font-normal">/{item.unit}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Margin {marginPct.toFixed(1)}%
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs whitespace-nowrap">
                      <div
                        className={`font-semibold ${
                          estTotalProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {estTotalProfit >= 0 ? '+' : ''}
                        {formatRupiah(estTotalProfit)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {formatWeight(collectedWeight, item.unit)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onToggleActive(item.id)}
                        className={`font-medium hover:underline ${
                          item.active ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {item.active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Ubah Harga</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add / Edit Waste Item Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Kelola Jenis Sampah"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">
                {editingId ? 'Ubah Harga Beli & Harga Jual' : 'Tambah Jenis Sampah Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Tutup dialog"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="w-code" className="block text-xs font-medium text-slate-700 mb-1">
                    Kode
                  </label>
                  <input
                    id="w-code"
                    type="text"
                    required
                    placeholder="PL-04"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-mono uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
                <div className="col-span-2">
                  <label htmlFor="w-cat" className="block text-xs font-medium text-slate-700 mb-1">
                    Kategori
                  </label>
                  <select
                    id="w-cat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as WasteCategory)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  >
                    {WASTE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label htmlFor="w-name" className="block text-xs font-medium text-slate-700 mb-1">
                    Nama Jenis Sampah
                  </label>
                  <input
                    id="w-name"
                    type="text"
                    required
                    placeholder="Misal: Kardus Duplex Bersih"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
                <div>
                  <label htmlFor="w-unit" className="block text-xs font-medium text-slate-700 mb-1">
                    Satuan
                  </label>
                  <select
                    id="w-unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as 'kg' | 'liter')}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  >
                    <option value="kg">kg</option>
                    <option value="liter">liter</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="w-price" className="block text-xs font-medium text-slate-700 mb-1">
                    Harga Beli Nasabah (Rp)
                  </label>
                  <input
                    id="w-price"
                    type="number"
                    required
                    min="100"
                    step="100"
                    placeholder="3000"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
                <div>
                  <label htmlFor="w-sell-price" className="block text-xs font-medium text-slate-700 mb-1">
                    Harga Jual Pengepul (Rp)
                  </label>
                  <input
                    id="w-sell-price"
                    type="number"
                    required
                    min="100"
                    step="100"
                    placeholder="3800"
                    value={sellPriceInput}
                    onChange={(e) => setSellPriceInput(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>

              {(draftBuy > 0 || draftSell > 0) && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                    draftDiff >= 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}
                >
                  <span>Nilai Keuntungan / {unit}</span>
                  <span className="font-mono tabular-nums font-semibold">
                    {draftDiff >= 0 ? '+' : ''}
                    {formatRupiah(draftDiff)} ({draftMarginPct.toFixed(1)}%)
                  </span>
                </div>
              )}

              <div>
                <label htmlFor="w-desc" className="block text-xs font-medium text-slate-700 mb-1">
                  Syarat Kondisi Sampah
                </label>
                <input
                  id="w-desc"
                  type="text"
                  placeholder="Bersih, kering, tanpa label..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              {formError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium"
                >
                  Simpan Harga
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

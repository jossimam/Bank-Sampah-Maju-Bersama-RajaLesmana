import React, { useEffect, useState } from 'react';
import { Check, Copy, Download, FileDown, Printer, X } from 'lucide-react';
import { formatDateId, formatRupiah, formatWeight } from '../data/seedData';
import { BankSettings, DepositTransaction, WithdrawalTransaction } from '../types/bankSampah';
import {
  buildDepositReceiptHtml,
  buildWithdrawalReceiptHtml,
  downloadReceiptHtml,
  downloadReceiptPdf,
  downloadReceiptPng,
  PaperSize,
  printHtmlDocument,
} from '../utils/printHelper';

export type ReceiptPayload =
  | { type: 'deposit'; tx: DepositTransaction }
  | { type: 'withdrawal'; tx: WithdrawalTransaction };

interface ReceiptModalProps {
  receipt: ReceiptPayload | null;
  settings: BankSettings;
  memberBalance?: number;
  onClose: () => void;
}

const PRINTER_MODE_KEY = 'bank_sampah_printer_mode_v1';

const PRINTER_MODES: {
  id: PaperSize;
  title: string;
  subtitle: string;
}[] = [
  {
    id: '58mm',
    title: 'Thermal 58 mm',
    subtitle: 'Printer kasir mini / Bluetooth',
  },
  {
    id: '80mm',
    title: 'Thermal 80 mm',
    subtitle: 'Printer struk kasir standar',
  },
  {
    id: 'a4',
    title: 'Printer Standar / PDF',
    subtitle: 'Inkjet, LaserJet, atau Simpan PDF',
  },
];

function loadSavedPrinterMode(): PaperSize {
  try {
    const saved = localStorage.getItem(PRINTER_MODE_KEY);
    if (saved === '58mm' || saved === '80mm' || saved === 'a4') {
      return saved;
    }
  } catch {
    // Ignore storage errors
  }
  return '80mm';
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  receipt,
  settings,
  memberBalance,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [paperSize, setPaperSize] = useState<PaperSize>(() => loadSavedPrinterMode());
  const [printNotice, setPrintNotice] = useState('');

  useEffect(() => {
    if (receipt) {
      setPrintNotice('');
    }
  }, [receipt]);

  if (!receipt) return null;

  const selectPrinterMode = (mode: PaperSize) => {
    setPaperSize(mode);
    setPrintNotice('');
    try {
      localStorage.setItem(PRINTER_MODE_KEY, mode);
    } catch {
      // Ignore storage errors
    }
  };

  const handleCopySummary = async () => {
    let text = '';
    if (receipt.type === 'deposit') {
      const { tx } = receipt;
      const lines = tx.items
        .map(
          (i) =>
            `- ${i.wasteName}: ${formatWeight(i.weightKg, i.unit)} x ${formatRupiah(i.pricePerKg)} = ${formatRupiah(i.subtotal)}`
        )
        .join('\n');
      text = `${settings.bankName}\nStruk Setoran: ${tx.receiptNumber}\nTanggal: ${formatDateId(tx.date)}\nNasabah: ${tx.memberName} (${tx.memberNumber})\n\nRincian:\n${lines}\n\nTotal Berat: ${formatWeight(tx.totalWeightKg)}\nTotal Masuk Tabungan: ${formatRupiah(tx.totalAmount)}${
        typeof memberBalance === 'number'
          ? `\nSaldo Tabungan Kini: ${formatRupiah(memberBalance)}`
          : ''
      }${tx.notes ? `\nCatatan: ${tx.notes}` : ''}`;
    } else {
      const { tx } = receipt;
      text = `${settings.bankName}\nBukti Penarikan: ${tx.referenceNumber}\nTanggal: ${formatDateId(tx.date)}\nNasabah: ${tx.memberName} (${tx.memberNumber})\nMetode: ${tx.method}\nNominal Penarikan: ${formatRupiah(tx.amount)}${
        typeof memberBalance === 'number'
          ? `\nSisa Saldo Tabungan: ${formatRupiah(memberBalance)}`
          : ''
      }${tx.notes ? `\nKeterangan: ${tx.notes}` : ''}`;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  const getReceiptHtml = (mode: PaperSize = paperSize) =>
    receipt.type === 'deposit'
      ? buildDepositReceiptHtml(receipt.tx, settings, mode, memberBalance)
      : buildWithdrawalReceiptHtml(receipt.tx, settings, mode, memberBalance);

  const getReceiptFilename = (ext: 'html' | 'png') =>
    receipt.type === 'deposit'
      ? `struk-${receipt.tx.receiptNumber}.${ext}`
      : `bukti-${receipt.tx.referenceNumber}.${ext}`;

  const handlePrintWithMode = (mode: PaperSize = paperSize) => {
    selectPrinterMode(mode);
    const html = getReceiptHtml(mode);
    const modeLabel = PRINTER_MODES.find((m) => m.id === mode)?.title ?? mode.toUpperCase();
    setPrintNotice(`Membuka dialog cetak untuk mode ${modeLabel}...`);

    printHtmlDocument(html, () => {
      downloadReceiptPdf(receipt, settings, mode, memberBalance);
      setPrintNotice(
        `Dialog printer browser diblokir oleh jendela pratinjau — struk PDF (${modeLabel}) telah diunduh otomatis dan siap langsung dicetak.`
      );
    });
    setTimeout(() => setPrintNotice(''), 8000);
  };

  const handleDownloadPdf = () => {
    downloadReceiptPdf(receipt, settings, paperSize, memberBalance);
    setPrintNotice(`Struk PDF (${activeModeLabel}) berhasil diunduh.`);
    setTimeout(() => setPrintNotice(''), 4000);
  };

  const handleDownloadHtml = () => {
    const html = getReceiptHtml();
    downloadReceiptHtml(html, getReceiptFilename('html'));
    setPrintNotice(
      'File struk HTML siap cetak berhasil diunduh. Buka file tersebut untuk langsung masuk ke pilihan printer.'
    );
    setTimeout(() => setPrintNotice(''), 5000);
  };

  const handleDownloadPng = () => {
    downloadReceiptPng(receipt, settings, memberBalance);
    setPrintNotice('Struk berhasil diunduh sebagai file gambar PNG.');
    setTimeout(() => setPrintNotice(''), 4000);
  };

  const previewWidthClass =
    paperSize === '58mm'
      ? 'max-w-[280px]'
      : paperSize === '80mm'
      ? 'max-w-[360px]'
      : 'max-w-full';

  const activeModeLabel =
    PRINTER_MODES.find((m) => m.id === paperSize)?.title ?? 'Thermal 80 mm';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Pilihan Mode Printer dan Struk Transaksi"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {receipt.type === 'deposit'
                ? 'Cetak Struk Setoran Sampah'
                : 'Cetak Bukti Penarikan Saldo'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih mode printer yang terhubung lalu cetak atau simpan struk
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup struk"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pilihan Mode Printer */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Pilihan Mode Printer
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {PRINTER_MODES.map((mode) => {
              const isSelected = paperSize === mode.id;
              return (
                <div
                  key={mode.id}
                  className={`rounded-lg border p-3 transition-colors flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'border-emerald-700 bg-emerald-50/70 ring-1 ring-emerald-700'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectPrinterMode(mode.id)}
                    className="text-left w-full"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs font-semibold ${
                          isSelected ? 'text-emerald-900' : 'text-slate-900'
                        }`}
                      >
                        {mode.title}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{mode.subtitle}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrintWithMode(mode.id)}
                    className={`w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                      isSelected
                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Printer className="w-3 h-3" />
                    <span>Pilih &amp; Cetak</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-5 overflow-y-auto bg-slate-50/60 flex-1 flex flex-col items-center">
          <div
            id="printable-receipt"
            className={`w-full ${previewWidthClass} bg-white border border-slate-200 rounded-lg p-5 space-y-4 text-sm shadow-xs transition-all`}
          >
            <div className="text-center border-b border-dashed border-slate-300 pb-3.5 space-y-1">
              <p className="text-sm sm:text-base font-bold text-slate-900">
                {settings.bankName}
              </p>
              <p className="text-xs text-slate-500">{settings.address}</p>
              <p className="text-xs text-slate-500">
                {settings.unitCode} · Telp {settings.phone}
              </p>
            </div>

            {receipt.type === 'deposit' ? (
              <>
                <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                  <div className="text-slate-500">No. Struk</div>
                  <div className="text-right font-mono font-medium text-slate-900">
                    {receipt.tx.receiptNumber}
                  </div>
                  <div className="text-slate-500">Tanggal</div>
                  <div className="text-right text-slate-900">
                    {formatDateId(receipt.tx.date)}
                  </div>
                  <div className="text-slate-500">Nasabah</div>
                  <div className="text-right font-medium text-slate-900">
                    {receipt.tx.memberName} ({receipt.tx.memberNumber})
                  </div>
                  <div className="text-slate-500">Petugas</div>
                  <div className="text-right text-slate-700">{receipt.tx.recordedBy}</div>
                </div>

                <div className="border-t border-b border-dashed border-slate-300 py-2.5">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-100">
                        <th className="text-left pb-1.5 font-medium">Jenis Sampah</th>
                        <th className="text-right pb-1.5 font-medium">Berat</th>
                        <th className="text-right pb-1.5 font-medium">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {receipt.tx.items.map((item, idx) => (
                        <tr key={`${item.wasteItemId}-${idx}`}>
                          <td className="py-2 pr-2 text-slate-800">
                            <div className="font-medium">{item.wasteName}</div>
                            <div className="text-slate-500 font-mono text-[11px]">
                              {formatRupiah(item.pricePerKg)}/{item.unit}
                            </div>
                          </td>
                          <td className="py-2 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                            {formatWeight(item.weightKg, item.unit)}
                          </td>
                          <td className="py-2 pl-2 text-right font-mono tabular-nums font-medium text-slate-900 whitespace-nowrap">
                            {formatRupiah(item.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-1.5 text-xs sm:text-sm">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Total Timbangan</span>
                    <span className="font-mono tabular-nums font-medium">
                      {formatWeight(receipt.tx.totalWeightKg)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm sm:text-base font-bold text-emerald-800 pt-1">
                    <span>Total Setoran</span>
                    <span className="font-mono tabular-nums">
                      {formatRupiah(receipt.tx.totalAmount)}
                    </span>
                  </div>
                  {typeof memberBalance === 'number' && (
                    <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100">
                      <span>Saldo Tabungan Kini</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-900">
                        {formatRupiah(memberBalance)}
                      </span>
                    </div>
                  )}
                </div>

                {receipt.tx.notes && (
                  <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                    Catatan: {receipt.tx.notes}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-y-2 text-xs border-b border-dashed border-slate-300 pb-3.5">
                  <div className="text-slate-500">No. Referensi</div>
                  <div className="text-right font-mono font-medium text-slate-900">
                    {receipt.tx.referenceNumber}
                  </div>
                  <div className="text-slate-500">Tanggal</div>
                  <div className="text-right text-slate-900">
                    {formatDateId(receipt.tx.date)}
                  </div>
                  <div className="text-slate-500">Nasabah</div>
                  <div className="text-right font-medium text-slate-900">
                    {receipt.tx.memberName} ({receipt.tx.memberNumber})
                  </div>
                  <div className="text-slate-500">Metode</div>
                  <div className="text-right font-medium text-slate-900">
                    {receipt.tx.method}
                  </div>
                  <div className="text-slate-500">Petugas</div>
                  <div className="text-right text-slate-700">{receipt.tx.recordedBy}</div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm sm:text-base font-bold text-amber-800">
                    <span>Nominal Penarikan</span>
                    <span className="font-mono tabular-nums">
                      {formatRupiah(receipt.tx.amount)}
                    </span>
                  </div>
                  {typeof memberBalance === 'number' && (
                    <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100">
                      <span>Sisa Saldo Tabungan</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-900">
                        {formatRupiah(memberBalance)}
                      </span>
                    </div>
                  )}
                </div>

                {receipt.tx.notes && (
                  <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                    Keterangan: {receipt.tx.notes}
                  </div>
                )}
              </>
            )}

            <div className="text-center text-[11px] text-slate-400 pt-2 border-t border-dashed border-slate-300">
              Terima kasih telah memilah sampah dari rumah.
            </div>
          </div>

          {printNotice && (
            <p className="mt-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-center max-w-md">
              {printNotice}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 px-5 py-3.5 bg-white border-t border-slate-200">
          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Tersalin' : 'Salin Teks'}</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadPng}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Unduh PNG</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          >
            <FileDown className="w-4 h-4" />
            <span>Unduh PDF</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadHtml}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          >
            <FileDown className="w-4 h-4" />
            <span>Unduh HTML</span>
          </button>
          <button
            type="button"
            onClick={() => handlePrintWithMode(paperSize)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak ({activeModeLabel})</span>
          </button>
        </div>
      </div>
    </div>
  );
};

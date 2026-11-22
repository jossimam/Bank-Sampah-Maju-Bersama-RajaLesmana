import { formatDateId, formatRupiah, formatWeight } from '../data/seedData';
import {
  BankSettings,
  DepositTransaction,
  Member,
  WithdrawalTransaction,
} from '../types/bankSampah';

export type PaperSize = '58mm' | '80mm' | 'a4';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildDepositReceiptHtml(
  tx: DepositTransaction,
  settings: BankSettings,
  paperSize: PaperSize,
  currentBalance?: number
): string {
  const widthCss =
    paperSize === '58mm' ? '54mm' : paperSize === '80mm' ? '74mm' : '148mm';
  const pageCss =
    paperSize === '58mm'
      ? '@page { size: 58mm auto; margin: 2mm; }'
      : paperSize === '80mm'
      ? '@page { size: 80mm auto; margin: 3mm; }'
      : '@page { size: A5 portrait; margin: 12mm; }';
  const baseFont = paperSize === '58mm' ? '10px' : paperSize === '80mm' ? '11px' : '12px';

  const itemsHtml = tx.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 4px 0; vertical-align: top;">
          <div style="font-weight: 600;">${escapeHtml(item.wasteName)}</div>
          <div style="color: #475569; font-size: 0.9em;">${formatWeight(item.weightKg, item.unit)} x ${formatRupiah(item.pricePerKg)}</div>
        </td>
        <td style="padding: 4px 0; text-align: right; vertical-align: top; white-space: nowrap; font-weight: 600;">
          ${formatRupiah(item.subtotal)}
        </td>
      </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Struk ${escapeHtml(tx.receiptNumber)}</title>
  <style>
    ${pageCss}
    * { box-sizing: border-box; }
    body {
      margin: 0 auto;
      width: ${widthCss};
      font-family: "Courier New", Courier, monospace;
      font-size: ${baseFont};
      line-height: 1.45;
      color: #0f172a;
      background: #ffffff;
      padding: ${paperSize === 'a4' ? '16px' : '6px'};
    }
    .center { text-align: center; }
    .divider { border-top: 1px dashed #64748b; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; gap: 8px; }
    table { width: 100%; border-collapse: collapse; }
    .bold { font-weight: 700; }
  </style>
</head>
<body>
  <div class="center">
    <div class="bold" style="font-size: 1.15em;">${escapeHtml(settings.bankName)}</div>
    <div>${escapeHtml(settings.address)}</div>
    <div>${escapeHtml(settings.unitCode)} · Telp ${escapeHtml(settings.phone)}</div>
  </div>
  <div class="divider"></div>
  <div>
    <div class="row"><span>No. Struk</span><span class="bold">${escapeHtml(tx.receiptNumber)}</span></div>
    <div class="row"><span>Tanggal</span><span>${escapeHtml(formatDateId(tx.date))}</span></div>
    <div class="row"><span>Nasabah</span><span class="bold">${escapeHtml(tx.memberName)}</span></div>
    <div class="row"><span>No. Induk</span><span>${escapeHtml(tx.memberNumber)}</span></div>
    <div class="row"><span>Petugas</span><span>${escapeHtml(tx.recordedBy)}</span></div>
  </div>
  <div class="divider"></div>
  <table>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>
  <div class="divider"></div>
  <div>
    <div class="row"><span>Total Timbangan</span><span class="bold">${formatWeight(tx.totalWeightKg)}</span></div>
    <div class="row bold" style="font-size: 1.15em; margin-top: 4px;">
      <span>TOTAL SETORAN</span>
      <span>${formatRupiah(tx.totalAmount)}</span>
    </div>
    ${
      typeof currentBalance === 'number'
        ? `<div class="row" style="margin-top: 4px;"><span>Saldo Tabungan Kini</span><span class="bold">${formatRupiah(currentBalance)}</span></div>`
        : ''
    }
  </div>
  ${
    tx.notes
      ? `<div class="divider"></div><div>Catatan: ${escapeHtml(tx.notes)}</div>`
      : ''
  }
  <div class="divider"></div>
  <div class="center" style="margin-top: 8px;">
    Terima kasih telah memilah sampah dari rumah.<br/>
    Simpan struk ini sebagai bukti sah setoran.
  </div>
</body>
</html>`;
}

export function buildWithdrawalReceiptHtml(
  tx: WithdrawalTransaction,
  settings: BankSettings,
  paperSize: PaperSize,
  currentBalance?: number
): string {
  const widthCss =
    paperSize === '58mm' ? '54mm' : paperSize === '80mm' ? '74mm' : '148mm';
  const pageCss =
    paperSize === '58mm'
      ? '@page { size: 58mm auto; margin: 2mm; }'
      : paperSize === '80mm'
      ? '@page { size: 80mm auto; margin: 3mm; }'
      : '@page { size: A5 portrait; margin: 12mm; }';
  const baseFont = paperSize === '58mm' ? '10px' : paperSize === '80mm' ? '11px' : '12px';

  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Bukti ${escapeHtml(tx.referenceNumber)}</title>
  <style>
    ${pageCss}
    * { box-sizing: border-box; }
    body {
      margin: 0 auto;
      width: ${widthCss};
      font-family: "Courier New", Courier, monospace;
      font-size: ${baseFont};
      line-height: 1.45;
      color: #0f172a;
      background: #ffffff;
      padding: ${paperSize === 'a4' ? '16px' : '6px'};
    }
    .center { text-align: center; }
    .divider { border-top: 1px dashed #64748b; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; gap: 8px; }
    .bold { font-weight: 700; }
  </style>
</head>
<body>
  <div class="center">
    <div class="bold" style="font-size: 1.15em;">${escapeHtml(settings.bankName)}</div>
    <div>${escapeHtml(settings.address)}</div>
    <div>${escapeHtml(settings.unitCode)} · Telp ${escapeHtml(settings.phone)}</div>
  </div>
  <div class="divider"></div>
  <div class="center bold">BUKTI PENARIKAN SALDO</div>
  <div class="divider"></div>
  <div>
    <div class="row"><span>No. Referensi</span><span class="bold">${escapeHtml(tx.referenceNumber)}</span></div>
    <div class="row"><span>Tanggal</span><span>${escapeHtml(formatDateId(tx.date))}</span></div>
    <div class="row"><span>Nasabah</span><span class="bold">${escapeHtml(tx.memberName)}</span></div>
    <div class="row"><span>No. Induk</span><span>${escapeHtml(tx.memberNumber)}</span></div>
    <div class="row"><span>Metode</span><span class="bold">${escapeHtml(tx.method)}</span></div>
    <div class="row"><span>Petugas</span><span>${escapeHtml(tx.recordedBy)}</span></div>
  </div>
  <div class="divider"></div>
  <div>
    <div class="row bold" style="font-size: 1.15em;">
      <span>NOMINAL PENARIKAN</span>
      <span>${formatRupiah(tx.amount)}</span>
    </div>
    ${
      typeof currentBalance === 'number'
        ? `<div class="row" style="margin-top: 4px;"><span>Sisa Saldo Tabungan</span><span class="bold">${formatRupiah(currentBalance)}</span></div>`
        : ''
    }
  </div>
  ${
    tx.notes
      ? `<div class="divider"></div><div>Keterangan: ${escapeHtml(tx.notes)}</div>`
      : ''
  }
  <div class="divider"></div>
  <div class="center" style="margin-top: 8px;">
    Bukti penarikan saldo tabungan sampah sah.<br/>
    Terima kasih atas partisipasi Anda.
  </div>
</body>
</html>`;
}

export function buildMemberCardHtml(member: Member, settings: BankSettings): string {
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Kartu Nasabah ${escapeHtml(member.memberNumber)}</title>
  <style>
    @page { size: A5 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      font-family: Arial, Helvetica, sans-serif;
      color: #0f172a;
      background: #ffffff;
    }
    .card {
      width: 420px;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      overflow: hidden;
    }
    .header {
      background: #065f46;
      color: #ffffff;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .body {
      padding: 20px;
      font-size: 12px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .label { color: #64748b; font-size: 11px; }
    .val { font-weight: 600; margin-top: 2px; }
    .footer {
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px dashed #cbd5e1;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #475569;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <div style="font-size: 11px; opacity: 0.85;">${escapeHtml(settings.unitCode)}</div>
        <div style="font-size: 15px; font-weight: 700;">${escapeHtml(settings.bankName)}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 10px; opacity: 0.85;">KARTU ANGGOTA</div>
        <div style="font-size: 13px; font-weight: 700; font-family: monospace;">${escapeHtml(member.memberNumber)}</div>
      </div>
    </div>
    <div class="body">
      <div class="grid">
        <div>
          <div class="label">Nama Nasabah</div>
          <div class="val" style="font-size: 14px;">${escapeHtml(member.name)}</div>
        </div>
        <div>
          <div class="label">Jenis Nasabah</div>
          <div class="val">${escapeHtml(member.memberType)}</div>
        </div>
        <div>
          <div class="label">Wilayah / Alamat</div>
          <div class="val">${escapeHtml(member.rtRw)} · ${escapeHtml(member.address)}</div>
        </div>
        <div>
          <div class="label">No. Telepon</div>
          <div class="val" style="font-family: monospace;">${escapeHtml(member.phone)}</div>
        </div>
      </div>
      <div class="footer">
        <span>Terdaftar: ${escapeHtml(formatDateId(member.joinDate))}</span>
        <span>Ketua Unit: ${escapeHtml(settings.chairmanName)}</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export interface PrintResult {
  inEmbeddedFrame: boolean;
  quickReturn: boolean;
}

function cleanupPrintSheet(): void {
  document.body.classList.remove('bs-custom-printing');
  const existingSheet = document.getElementById('bs-print-sheet');
  if (existingSheet?.parentNode) {
    existingSheet.parentNode.removeChild(existingSheet);
  }
  const existingStyle = document.getElementById('bs-print-style');
  if (existingStyle?.parentNode) {
    existingStyle.parentNode.removeChild(existingStyle);
  }
}

export function printHtmlDocument(
  html: string,
  onPrintBlocked?: () => void
): PrintResult {
  cleanupPrintSheet();

  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, 'text/html');
  const rawCss = Array.from(parsed.querySelectorAll('style'))
    .map((s) => s.textContent ?? '')
    .join('\n');

  const scopedCss = rawCss
    .replace(/\bbody\s*\{/g, '#bs-print-sheet .bs-print-body {')
    .replace(/(^|\n)\s*([.#*]?[a-zA-Z0-9_*-]*(?:\s+[.#*]?[a-zA-Z0-9_*-]+)*)\s*\{/g, (full, prefix, sel) => {
      const trimmed = sel.trim();
      if (!trimmed || trimmed.startsWith('@') || trimmed.startsWith('#bs-print-sheet')) {
        return full;
      }
      return `${prefix}#bs-print-sheet ${trimmed} {`;
    });

  const styleEl = document.createElement('style');
  styleEl.id = 'bs-print-style';
  styleEl.textContent = scopedCss;
  document.head.appendChild(styleEl);

  const sheet = document.createElement('div');
  sheet.id = 'bs-print-sheet';
  const bodyWrapper = document.createElement('div');
  bodyWrapper.className = 'bs-print-body';
  bodyWrapper.innerHTML = parsed.body.innerHTML;
  sheet.appendChild(bodyWrapper);
  document.body.appendChild(sheet);

  document.body.classList.add('bs-custom-printing');

  let printStarted = false;
  const handleBeforePrint = () => {
    printStarted = true;
  };
  const handleAfterPrint = () => {
    window.removeEventListener('beforeprint', handleBeforePrint);
    window.removeEventListener('afterprint', handleAfterPrint);
    cleanupPrintSheet();
  };
  window.addEventListener('beforeprint', handleBeforePrint, { once: true });
  window.addEventListener('afterprint', handleAfterPrint);
  window.setTimeout(cleanupPrintSheet, 60000);

  const startMs = Date.now();
  try {
    window.focus();
    window.print();
  } catch {
    cleanupPrintSheet();
  }
  const elapsedMs = Date.now() - startMs;

  if (onPrintBlocked) {
    window.setTimeout(() => {
      if (!printStarted) {
        window.removeEventListener('beforeprint', handleBeforePrint);
        cleanupPrintSheet();
        onPrintBlocked();
      }
    }, 250);
  }

  return {
    inEmbeddedFrame: window.self !== window.top,
    quickReturn: elapsedMs < 80,
  };
}

export function downloadReceiptHtml(html: string, filename: string): void {
  const autoPrintHtml = html.replace(
    '</body>',
    '<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},150);});</script></body>'
  );
  const blob = new Blob([autoPrintHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = words[0];
  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

function renderReceiptCanvas(
  payload:
    | { type: 'deposit'; tx: DepositTransaction }
    | { type: 'withdrawal'; tx: WithdrawalTransaction },
  settings: BankSettings,
  currentBalance?: number
): HTMLCanvasElement | null {
  const width = 560;
  const padX = 32;
  const maxTextWidth = width - padX * 2;

  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  let noteLines: string[] = [];
  if (tempCtx && payload.tx.notes) {
    tempCtx.font = '12px sans-serif';
    const notePrefix = payload.type === 'deposit' ? 'Catatan: ' : 'Keterangan: ';
    noteLines = wrapLines(tempCtx, `${notePrefix}${payload.tx.notes}`, maxTextWidth);
  }

  const baseRows =
    payload.type === 'deposit' ? payload.tx.items.length * 44 + 340 : 340;
  const balanceExtra = typeof currentBalance === 'number' ? 28 : 0;
  const noteExtra = noteLines.length > 0 ? noteLines.length * 18 + 26 : 0;
  const height = Math.max(460, baseRows + balanceExtra + noteExtra + 80);

  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.scale(scale, scale);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  let y = 42;

  const drawCenter = (text: string, font: string, color = '#0f172a') => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(text, width / 2, y);
    ctx.textAlign = 'left';
  };

  const drawRow = (left: string, right: string, bold = false, color = '#0f172a') => {
    ctx.font = bold ? 'bold 14px monospace' : '13px monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.fillText(left, padX, y);
    ctx.textAlign = 'right';
    ctx.fillText(right, width - padX, y);
    ctx.textAlign = 'left';
  };

  const drawDivider = () => {
    ctx.save();
    ctx.strokeStyle = '#cbd5e1';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padX, y);
    ctx.lineTo(width - padX, y);
    ctx.stroke();
    ctx.restore();
    y += 22;
  };

  drawCenter(settings.bankName, 'bold 18px sans-serif', '#0f172a');
  y += 22;
  drawCenter(settings.address, '12px sans-serif', '#475569');
  y += 18;
  drawCenter(`${settings.unitCode} · Telp ${settings.phone}`, '12px sans-serif', '#475569');
  y += 20;
  drawDivider();

  if (payload.type === 'deposit') {
    const { tx } = payload;
    drawCenter('STRUK SETORAN SAMPAH', 'bold 14px monospace', '#065f46');
    y += 26;
    drawRow('No. Struk', tx.receiptNumber, true);
    y += 22;
    drawRow('Tanggal', formatDateId(tx.date));
    y += 22;
    drawRow('Nasabah', `${tx.memberName} (${tx.memberNumber})`);
    y += 22;
    drawRow('Petugas', tx.recordedBy);
    y += 20;
    drawDivider();

    for (const item of tx.items) {
      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(item.wasteName, padX, y);
      y += 20;
      drawRow(
        `  ${formatWeight(item.weightKg, item.unit)} x ${formatRupiah(item.pricePerKg)}`,
        formatRupiah(item.subtotal),
        false,
        '#334155'
      );
      y += 24;
    }

    drawDivider();
    drawRow('Total Berat / Volume', formatWeight(tx.totalWeightKg), true);
    y += 24;
    drawRow('TOTAL SETORAN', formatRupiah(tx.totalAmount), true, '#065f46');
    y += 24;
    if (typeof currentBalance === 'number') {
      drawRow('Saldo Tabungan Kini', formatRupiah(currentBalance), true);
      y += 24;
    }
  } else {
    const { tx } = payload;
    drawCenter('BUKTI PENARIKAN SALDO', 'bold 14px monospace', '#92400e');
    y += 26;
    drawRow('No. Referensi', tx.referenceNumber, true);
    y += 22;
    drawRow('Tanggal', formatDateId(tx.date));
    y += 22;
    drawRow('Nasabah', `${tx.memberName} (${tx.memberNumber})`);
    y += 22;
    drawRow('Metode', tx.method, true);
    y += 20;
    drawDivider();
    drawRow('NOMINAL PENARIKAN', formatRupiah(tx.amount), true, '#92400e');
    y += 24;
    if (typeof currentBalance === 'number') {
      drawRow('Sisa Saldo Tabungan', formatRupiah(currentBalance), true);
      y += 24;
    }
  }

  if (noteLines.length > 0) {
    drawDivider();
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#334155';
    for (const line of noteLines) {
      ctx.fillText(line, padX, y);
      y += 18;
    }
    y += 4;
  }

  y += 4;
  drawDivider();
  drawCenter('Terima kasih telah memilah sampah dari rumah.', '12px sans-serif', '#64748b');

  return canvas;
}

export function downloadReceiptPng(
  payload:
    | { type: 'deposit'; tx: DepositTransaction }
    | { type: 'withdrawal'; tx: WithdrawalTransaction },
  settings: BankSettings,
  currentBalance?: number
): void {
  const canvas = renderReceiptCanvas(payload, settings, currentBalance);
  if (!canvas) return;

  const filename =
    payload.type === 'deposit'
      ? `struk-${payload.tx.receiptNumber}.png`
      : `bukti-${payload.tx.referenceNumber}.png`;

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

export function downloadReceiptPdf(
  payload:
    | { type: 'deposit'; tx: DepositTransaction }
    | { type: 'withdrawal'; tx: WithdrawalTransaction },
  settings: BankSettings,
  paperSize: PaperSize,
  currentBalance?: number
): void {
  const canvas = renderReceiptCanvas(payload, settings, currentBalance);
  if (!canvas) return;

  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const base64 = dataUrl.split(',')[1] ?? '';
  const binStr = atob(base64);
  const jpegBytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) {
    jpegBytes[i] = binStr.charCodeAt(i);
  }

  const mmToPt = 72 / 25.4;
  const pageWidthMm = paperSize === '58mm' ? 58 : paperSize === '80mm' ? 80 : 148;
  const pageW = Number((pageWidthMm * mmToPt).toFixed(2));
  const pageH = Number((pageW * (canvas.height / canvas.width)).toFixed(2));

  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let bytePos = 0;

  const pushStr = (s: string) => {
    const b = enc.encode(s);
    chunks.push(b);
    bytePos += b.length;
  };
  const pushBytes = (b: Uint8Array) => {
    chunks.push(b);
    bytePos += b.length;
  };

  pushStr('%PDF-1.4\n');
  pushBytes(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  offsets[1] = bytePos;
  pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  offsets[2] = bytePos;
  pushStr('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  offsets[3] = bytePos;
  pushStr(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`
  );

  offsets[4] = bytePos;
  pushStr(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  );
  pushBytes(jpegBytes);
  pushStr('\nendstream\nendobj\n');

  const contentStream = `q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q\n`;
  offsets[5] = bytePos;
  pushStr(
    `5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`
  );

  const xrefStart = bytePos;
  pushStr('xref\n0 6\n0000000000 65535 f \n');
  for (let i = 1; i <= 5; i++) {
    pushStr(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  pushStr(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);

  const blob = new Blob(chunks as BlobPart[], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download =
    payload.type === 'deposit'
      ? `struk-${payload.tx.receiptNumber}-${paperSize}.pdf`
      : `bukti-${payload.tx.referenceNumber}-${paperSize}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

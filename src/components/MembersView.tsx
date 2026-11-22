import React, { useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  CreditCard,
  Download,
  Edit3,
  FileText,
  Plus,
  Printer,
  Receipt,
  Search,
  Trash2,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import {
  formatDateId,
  formatRupiah,
  formatWeight,
  MEMBER_TYPES,
} from '../data/seedData';
import { buildMemberCardHtml, downloadReceiptHtml, printHtmlDocument } from '../utils/printHelper';
import {
  BankSettings,
  DepositTransaction,
  Member,
  MemberType,
  WithdrawalTransaction,
} from '../types/bankSampah';

export interface MemberFormPayload {
  memberNumber: string;
  nik: string;
  name: string;
  memberType: MemberType;
  rtRw: string;
  phone: string;
  address: string;
  bankAccount: string;
  notes: string;
  status: 'Aktif' | 'Nonaktif';
}

interface MembersViewProps {
  settings: BankSettings;
  members: Member[];
  deposits: DepositTransaction[];
  withdrawals: WithdrawalTransaction[];
  onAddMember: (payload: MemberFormPayload) => Member;
  onUpdateMember: (memberId: string, payload: MemberFormPayload) => void;
  onDeleteMember: (memberId: string) => void;
  onImportMembers: (rows: Omit<MemberFormPayload, 'status'>[]) => number;
  onUpdateDepositNote: (depositId: string, notes: string) => void;
  onOpenDepositReceipt: (tx: DepositTransaction) => void;
  onOpenWithdrawalReceipt: (tx: WithdrawalTransaction) => void;
  onQuickDepositForMember: (memberId: string) => void;
  onQuickWithdrawForMember: (memberId: string) => void;
}

export const MembersView: React.FC<MembersViewProps> = ({
  settings,
  members,
  deposits,
  withdrawals,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onImportMembers,
  onUpdateDepositNote,
  onOpenDepositReceipt,
  onOpenWithdrawalReceipt,
  onQuickDepositForMember,
  onQuickWithdrawForMember,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Aktif' | 'Nonaktif'>('Semua');
  const [typeFilter, setTypeFilter] = useState<'Semua' | MemberType>('Semua');
  const [rtFilter, setRtFilter] = useState<string>('Semua');

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<'passbook' | 'notes' | 'card'>('passbook');
  const [editingDepositNoteId, setEditingDepositNoteId] = useState<string | null>(null);
  const [editingDepositNoteText, setEditingDepositNoteText] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [memberNumber, setMemberNumber] = useState('');
  const [nik, setNik] = useState('');
  const [name, setName] = useState('');
  const [memberType, setMemberType] = useState<MemberType>('Perorangan');
  const [rtRw, setRtRw] = useState('RT 01 / RW 05');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');
  const [formError, setFormError] = useState('');

  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<Omit<MemberFormPayload, 'status'>[]>([]);
  const [importError, setImportError] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const summary = useMemo(() => {
    const activeCount = members.filter((m) => m.status === 'Aktif').length;
    const totalBalance = members.reduce((s, m) => s + m.balance, 0);
    const totalWeight = members.reduce((s, m) => s + m.totalWeightKg, 0);
    return {
      totalCount: members.length,
      activeCount,
      totalBalance,
      totalWeight,
    };
  }, [members]);

  const rtRwOptions = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => {
      if (m.rtRw && m.rtRw !== '-') set.add(m.rtRw);
    });
    return Array.from(set).sort();
  }, [members]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return members.filter((m) => {
      const matchesStatus = statusFilter === 'Semua' || m.status === statusFilter;
      const matchesType = typeFilter === 'Semua' || m.memberType === typeFilter;
      const matchesRt = rtFilter === 'Semua' || m.rtRw === rtFilter;
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.memberNumber.toLowerCase().includes(q) ||
        m.nik.toLowerCase().includes(q) ||
        m.rtRw.toLowerCase().includes(q) ||
        m.phone.toLowerCase().includes(q) ||
        m.address.toLowerCase().includes(q);
      return matchesStatus && matchesType && matchesRt && matchesSearch;
    });
  }, [members, searchQuery, statusFilter, typeFilter, rtFilter]);

  const selectedMember = members.find((m) => m.id === selectedMemberId) ?? null;

  const memberLedger = useMemo(() => {
    if (!selectedMember) return [];
    const depRows = deposits
      .filter((d) => d.memberId === selectedMember.id)
      .map((d) => ({
        kind: 'deposit' as const,
        tx: d,
        id: d.id,
        date: d.date,
        createdAt: d.createdAt,
        ref: d.receiptNumber,
        description: `Setoran ${formatWeight(d.totalWeightKg)} (${d.items.length} jenis)`,
        notes: d.notes,
        credit: d.totalAmount,
        debit: 0,
      }));

    const wdRows = withdrawals
      .filter((w) => w.memberId === selectedMember.id)
      .map((w) => ({
        kind: 'withdrawal' as const,
        tx: w,
        id: w.id,
        date: w.date,
        createdAt: w.createdAt,
        ref: w.referenceNumber,
        description: `Penarikan ${w.method}`,
        notes: w.notes,
        credit: 0,
        debit: w.amount,
      }));

    const sortedAsc = [...depRows, ...wdRows].sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return cmp !== 0 ? cmp : a.createdAt.localeCompare(b.createdAt);
    });

    const totalNetFromTx = sortedAsc.reduce(
      (sum, row) => sum + row.credit - row.debit,
      0
    );
    let running = (selectedMember.balance ?? 0) - totalNetFromTx;
    const withRunning = sortedAsc.map((row) => {
      running += row.credit - row.debit;
      return { ...row, runningBalance: running };
    });

    return withRunning.reverse();
  }, [selectedMember, deposits, withdrawals]);

  const memberTotals = useMemo(() => {
    return memberLedger.reduce(
      (acc, row) => ({
        credit: acc.credit + row.credit,
        debit: acc.debit + row.debit,
      }),
      { credit: 0, debit: 0 }
    );
  }, [memberLedger]);

  const memberDeposits = useMemo(() => {
    if (!selectedMember) return [];
    return deposits
      .filter((d) => d.memberId === selectedMember.id)
      .sort((a, b) => {
        const cmp = b.date.localeCompare(a.date);
        return cmp !== 0 ? cmp : b.createdAt.localeCompare(a.createdAt);
      });
  }, [selectedMember, deposits]);

  const suggestNextMemberNumber = () => {
    let maxNum = members.length;
    for (const m of members) {
      const match = m.memberNumber.match(/(\d+)$/);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (!Number.isNaN(parsed) && parsed > maxNum) maxNum = parsed;
      }
    }
    return `RLM-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const openCreateModal = () => {
    setEditingMember(null);
    setMemberNumber(suggestNextMemberNumber());
    setNik('');
    setName('');
    setMemberType('Perorangan');
    setRtRw('RT 01 / RW 05');
    setPhone('');
    setAddress('');
    setBankAccount('');
    setNotes('');
    setStatus('Aktif');
    setFormError('');
    setShowFormModal(true);
  };

  const openEditModal = (m: Member) => {
    setEditingMember(m);
    setMemberNumber(m.memberNumber);
    setNik(m.nik);
    setName(m.name);
    setMemberType(m.memberType);
    setRtRw(m.rtRw);
    setPhone(m.phone);
    setAddress(m.address);
    setBankAccount(m.bankAccount);
    setNotes(m.notes);
    setStatus(m.status);
    setFormError('');
    setShowFormModal(true);
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = memberNumber.trim().toUpperCase();
    if (!cleanNum) {
      setFormError('Nomor Induk Nasabah wajib diisi.');
      return;
    }
    const duplicate = members.find(
      (m) => m.memberNumber.toUpperCase() === cleanNum && m.id !== editingMember?.id
    );
    if (duplicate) {
      setFormError(`Nomor Nasabah ${cleanNum} sudah digunakan oleh ${duplicate.name}.`);
      return;
    }
    if (!name.trim()) {
      setFormError('Nama lengkap nasabah wajib diisi.');
      return;
    }
    if (nik.trim() && !/^\d{16}$/.test(nik.trim())) {
      setFormError('NIK harus terdiri dari tepat 16 digit angka (atau kosongkan).');
      return;
    }

    const payload: MemberFormPayload = {
      memberNumber: cleanNum,
      nik: nik.trim(),
      name: name.trim(),
      memberType,
      rtRw: rtRw.trim() || '-',
      phone: phone.trim() || '-',
      address: address.trim() || '-',
      bankAccount: bankAccount.trim(),
      notes: notes.trim(),
      status,
    };

    if (editingMember) {
      onUpdateMember(editingMember.id, payload);
      setFeedbackMsg(`Data nasabah ${payload.name} (${payload.memberNumber}) diperbarui.`);
    } else {
      const created = onAddMember(payload);
      setSelectedMemberId(created.id);
      setDrawerTab('passbook');
      setFeedbackMsg(`Nasabah baru ${created.name} (${created.memberNumber}) berhasil didaftarkan.`);
    }
    setShowFormModal(false);
  };

  const handleExportMasterCsv = () => {
    const header =
      'No Nasabah,NIK,Nama Lengkap,Jenis Nasabah,RT/RW,Telepon,Alamat,Rekening/E-Wallet,Tanggal Daftar,Total Berat (kg),Saldo (Rp),Status,Catatan';
    const lines = filteredMembers.map((m) =>
      [
        m.memberNumber,
        m.nik ? `'${m.nik}` : '',
        `"${m.name.replace(/"/g, '""')}"`,
        `"${m.memberType}"`,
        `"${m.rtRw.replace(/"/g, '""')}"`,
        m.phone,
        `"${m.address.replace(/"/g, '""')}"`,
        `"${(m.bankAccount || '').replace(/"/g, '""')}"`,
        m.joinDate,
        m.totalWeightKg,
        m.balance,
        m.status,
        `"${(m.notes || '').replace(/"/g, '""')}"`,
      ].join(',')
    );
    const blob = new Blob([[header, ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'master-nasabah-maju-bersama-raja-lesmana.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFeedbackMsg(`Master Nasabah (${filteredMembers.length} data) berhasil diunduh ke CSV.`);
  };

  const handleDownloadCsvTemplate = () => {
    const template =
      'No Nasabah,NIK,Nama Lengkap,Jenis Nasabah,RT/RW,Telepon,Alamat,Rekening/E-Wallet,Catatan\n' +
      'RLM-008,3275011122334455,Bapak Slamet Riyadi,Keluarga / KK,RT 02 / RW 05,0812-7788-9900,Jl. Raja Lesmana No. 40,BRI 0421-01-009911-50-1,Warga baru RT 02';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-master-nasabah.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleCsvFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) {
        setImportError('File CSV minimal berisi 1 baris header dan 1 baris data nasabah.');
        setImportPreview([]);
        return;
      }

      const parsedRows: Omit<MemberFormPayload, 'status'>[] = [];
      let autoIdx = members.length + 1;

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const rowName = (cols[2] || '').trim();
        if (!rowName) continue;

        const rawType = (cols[3] || '').trim() as MemberType;
        const validType = MEMBER_TYPES.includes(rawType) ? rawType : 'Perorangan';
        const rawNo = (cols[0] || '').trim().toUpperCase();

        parsedRows.push({
          memberNumber: rawNo || `RLM-${String(autoIdx++).padStart(3, '0')}`,
          nik: (cols[1] || '').replace(/^'/, '').trim(),
          name: rowName,
          memberType: validType,
          rtRw: (cols[4] || '').trim() || 'RT 01 / RW 05',
          phone: (cols[5] || '').trim() || '-',
          address: (cols[6] || '').trim() || '-',
          bankAccount: (cols[7] || '').trim(),
          notes: (cols[8] || '').trim(),
        });
      }

      if (parsedRows.length === 0) {
        setImportError('Tidak ada baris data nasabah yang valid ditemukan pada CSV.');
      }
      setImportPreview(parsedRows);
    } catch {
      setImportError('Gagal membaca berkas CSV.');
    } finally {
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (importPreview.length === 0) return;
    const addedCount = onImportMembers(importPreview);
    setShowImportModal(false);
    setImportPreview([]);
    setFeedbackMsg(`${addedCount} data nasabah baru berhasil diimpor ke Master Nasabah.`);
  };

  return (
    <div className="space-y-6">
      {feedbackMsg && (
        <div className="flex items-center justify-between gap-4 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
          <span>{feedbackMsg}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg('')}
            aria-label="Tutup notifikasi"
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4-Column Master Nasabah KPI Strip */}
      <section aria-label="Ringkasan Master Nasabah" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Total Nasabah Terdaftar</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {summary.totalCount}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            {summary.activeCount} aktif · {summary.totalCount - summary.activeCount} nonaktif
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Total Saldo Nasabah</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700 font-mono tabular-nums">
            {formatRupiah(summary.totalBalance)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            Akumulasi seluruh buku tabungan
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Total Setoran Terkumpul</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {formatWeight(summary.totalWeight)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            Berat sampah dari seluruh nasabah
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Cakupan Wilayah</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {rtRwOptions.length} <span className="text-sm font-normal text-slate-500">RT / Wilayah</span>
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            Wilayah aktif Bank Sampah {settings.unitCode}
          </p>
        </div>
      </section>

      {/* Main Master Nasabah Table Section */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Data Induk Nasabah (Master Nasabah)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola profil anggota, nomor induk, wilayah RT/RW, kartu anggota, dan buku tabungan
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportMasterCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor CSV</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setImportPreview([]);
                setImportError('');
                setShowImportModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Impor CSV</span>
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Nasabah</span>
            </button>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['Semua', 'Aktif', 'Nonaktif'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    statusFilter === tab
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <select
              aria-label="Filter jenis nasabah"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'Semua' | MemberType)}
              className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="Semua">Semua Jenis Nasabah</option>
              {MEMBER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter wilayah RT/RW"
              value={rtFilter}
              onChange={(e) => setRtFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="Semua">Semua Wilayah RT/RW</option>
              {rtRwOptions.map((rt) => (
                <option key={rt} value={rt}>
                  {rt}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Cari nama, kode RLM, NIK, HP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 w-64 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>
        </div>

        {/* High-Density Master Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-600">
                <th className="py-2.5 px-4 whitespace-nowrap">No. Induk</th>
                <th className="py-2.5 px-4">Nama &amp; Identitas</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Wilayah &amp; Kontak</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Total Setor</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Saldo Tabungan</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Status</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-slate-500">
                    {members.length === 0
                      ? 'Belum ada data nasabah terdaftar. Klik Tambah Nasabah atau Impor CSV untuk mulai mendaftarkan nasabah (saldo awal Rp 0).'
                      : 'Tidak ada data nasabah yang sesuai dengan pencarian atau filter.'}
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => {
                      setSelectedMemberId(m.id);
                      setDrawerTab('passbook');
                      setConfirmDeleteId(null);
                    }}
                    className={`cursor-pointer transition-colors ${
                      selectedMemberId === m.id ? 'bg-emerald-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-4 font-mono text-xs font-medium text-slate-700 whitespace-nowrap">
                      <div>{m.memberNumber}</div>
                      <div className="text-[11px] font-sans text-slate-400">
                        {formatDateId(m.joinDate)}
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900 text-xs sm:text-sm">
                        {m.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        <span>{m.memberType}</span>
                        {m.nik && (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span className="font-mono">NIK {m.nik}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-xs">
                      <div className="text-slate-800">{m.rtRw}</div>
                      <div className="text-[11px] font-mono text-slate-500">{m.phone}</div>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-slate-700 whitespace-nowrap">
                      {formatWeight(m.totalWeightKg)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs font-semibold text-emerald-700 whitespace-nowrap">
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
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(m);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Ubah</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMemberId(m.id);
                            setDrawerTab('passbook');
                            setConfirmDeleteId(null);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>
                        <button
                          type="button"
                          aria-label={`Hapus ${m.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(m);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-red-200 bg-white hover:bg-red-50 text-xs font-medium text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Slide-Over Member Detail Drawer (Buku Tabungan + Kartu Nasabah) */}
      {selectedMember && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-slate-900/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Detail Master Nasabah"
        >
          <div className="bg-white w-full max-w-xl h-full border-l border-slate-200 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="min-w-0">
                <p className="text-xs text-slate-500 truncate">
                  <span className="font-mono font-medium text-slate-700">
                    {selectedMember.memberNumber}
                  </span>
                  <span aria-hidden="true"> · </span>
                  <span>{selectedMember.memberType}</span>
                  <span aria-hidden="true"> · </span>
                  <span>Terdaftar {formatDateId(selectedMember.joinDate)}</span>
                </p>
                <h3 className="text-lg font-bold text-slate-900 truncate">
                  {selectedMember.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMemberId(null)}
                aria-label="Tutup detail nasabah"
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 pt-3 border-b border-slate-200 flex items-center gap-1 bg-slate-50/70 overflow-x-auto">
              <button
                type="button"
                onClick={() => setDrawerTab('passbook')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  drawerTab === 'passbook'
                    ? 'border-emerald-700 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Buku Tabungan</span>
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('notes')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  drawerTab === 'notes'
                    ? 'border-emerald-700 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Catatan Setoran ({memberDeposits.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('card')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  drawerTab === 'card'
                    ? 'border-emerald-700 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Kartu Anggota</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {drawerTab === 'passbook' ? (
                <>
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <div>
                      <p className="text-xs text-slate-500">Saldo Tabungan Kini</p>
                      <p className="mt-1 text-xl font-bold font-mono tabular-nums text-emerald-700">
                        {formatRupiah(selectedMember.balance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Akumulasi Sampah Disetor</p>
                      <p className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900">
                        {formatWeight(selectedMember.totalWeightKg)}
                      </p>
                    </div>
                    <div className="pt-2.5 border-t border-slate-200">
                      <p className="text-[11px] text-slate-500">Total Setoran Masuk</p>
                      <p className="mt-0.5 text-sm font-semibold font-mono tabular-nums text-slate-800">
                        {formatRupiah(memberTotals.credit)}
                      </p>
                    </div>
                    <div className="pt-2.5 border-t border-slate-200">
                      <p className="text-[11px] text-slate-500">Total Penarikan Saldo</p>
                      <p className="mt-0.5 text-sm font-semibold font-mono tabular-nums text-amber-700">
                        {formatRupiah(memberTotals.debit)}
                      </p>
                    </div>
                  </div>

                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-xs border border-slate-200 rounded-xl p-4">
                    <div>
                      <dt className="text-slate-500">NIK (KTP)</dt>
                      <dd className="font-mono text-slate-900 mt-0.5">
                        {selectedMember.nik || '-'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">No. Telepon / WA</dt>
                      <dd className="font-mono text-slate-900 mt-0.5">
                        {selectedMember.phone}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-slate-500">Alamat &amp; Wilayah</dt>
                      <dd className="text-slate-900 mt-0.5">
                        {selectedMember.address} · {selectedMember.rtRw}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Rekening / E-Wallet</dt>
                      <dd className="font-mono text-slate-900 mt-0.5">
                        {selectedMember.bankAccount || '-'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Status Keanggotaan</dt>
                      <dd
                        className={`font-medium mt-0.5 ${
                          selectedMember.status === 'Aktif'
                            ? 'text-emerald-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {selectedMember.status}
                      </dd>
                    </div>
                    {selectedMember.notes && (
                      <div className="sm:col-span-2 pt-1 border-t border-slate-100">
                        <dt className="text-slate-500">Catatan Pengurus</dt>
                        <dd className="text-slate-700 mt-0.5">{selectedMember.notes}</dd>
                      </div>
                    )}
                  </dl>

                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const id = selectedMember.id;
                          setSelectedMemberId(null);
                          onQuickDepositForMember(id);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium whitespace-nowrap shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Catat Setoran</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const id = selectedMember.id;
                          setSelectedMemberId(null);
                          onQuickWithdrawForMember(id);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium whitespace-nowrap shrink-0"
                      >
                        <span>Tarik Saldo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(selectedMember)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium whitespace-nowrap shrink-0"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Ubah Profil</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(selectedMember.id)}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-medium whitespace-nowrap shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>

                  {confirmDeleteId === selectedMember.id && (
                    <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 space-y-2.5">
                      <p className="text-xs text-red-800 font-medium">
                        {selectedMember.balance > 0 || memberLedger.length > 0
                          ? `Nasabah ini memiliki saldo ${formatRupiah(selectedMember.balance)} dan ${memberLedger.length} riwayat transaksi. Disarankan ubah status ke Nonaktif, atau lanjutkan hapus dari Master Nasabah?`
                          : `Hapus nasabah ${selectedMember.name} (${selectedMember.memberNumber}) dari Master Nasabah?`}
                      </p>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-3 py-1.5 rounded-md bg-white border border-slate-300 text-xs font-medium text-slate-700"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const deletedName = selectedMember.name;
                            onDeleteMember(selectedMember.id);
                            setSelectedMemberId(null);
                            setConfirmDeleteId(null);
                            setFeedbackMsg(`Data nasabah ${deletedName} dihapus dari Master Nasabah.`);
                          }}
                          className="px-3 py-1.5 rounded-md bg-red-700 hover:bg-red-800 text-white text-xs font-medium"
                        >
                          Ya, Hapus Nasabah
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <h4 className="text-xs font-semibold text-slate-700">
                      Mutasi Buku Tabungan ({memberLedger.length} transaksi)
                    </h4>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                            <th className="py-2 px-3 font-medium">Tanggal</th>
                            <th className="py-2 px-3 font-medium">Keterangan</th>
                            <th className="py-2 px-3 text-right font-medium">Masuk</th>
                            <th className="py-2 px-3 text-right font-medium">Keluar</th>
                            <th className="py-2 px-3 text-right font-medium">Saldo</th>
                            <th className="py-2 px-3 text-right font-medium">Struk</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {memberLedger.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-500">
                                Belum ada mutasi transaksi untuk nasabah ini.
                              </td>
                            </tr>
                          ) : (
                            memberLedger.map((row) => (
                              <tr key={row.id}>
                                <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                                  <div>{formatDateId(row.date)}</div>
                                  <div className="text-[11px] font-mono text-slate-400">{row.ref}</div>
                                </td>
                                <td className="py-2.5 px-3 text-slate-800">
                                  <div>{row.description}</div>
                                  {row.notes && (
                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                      Catatan: {row.notes}
                                    </div>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700 whitespace-nowrap">
                                  {row.credit > 0 ? `+${formatRupiah(row.credit)}` : '-'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-700 whitespace-nowrap">
                                  {row.debit > 0 ? `-${formatRupiah(row.debit)}` : '-'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono tabular-nums font-medium text-slate-800 whitespace-nowrap">
                                  {formatRupiah(row.runningBalance)}
                                </td>
                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      row.kind === 'deposit'
                                        ? onOpenDepositReceipt(row.tx)
                                        : onOpenWithdrawalReceipt(row.tx)
                                    }
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 text-[11px] font-medium text-slate-700"
                                  >
                                    <Receipt className="w-3 h-3" />
                                    <span>Struk</span>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : drawerTab === 'notes' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">
                        Catatan Setoran Sampah — {selectedMember.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Rincian setiap transaksi timbangan beserta catatan kondisi sampah nasabah
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const id = selectedMember.id;
                        setSelectedMemberId(null);
                        onQuickDepositForMember(id);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Setor Baru</span>
                    </button>
                  </div>

                  {memberDeposits.length === 0 ? (
                    <div className="border border-slate-200 rounded-xl p-8 text-center space-y-3">
                      <p className="text-xs text-slate-500">
                        Nasabah ini belum memiliki catatan setoran sampah.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const id = selectedMember.id;
                          setSelectedMemberId(null);
                          onQuickDepositForMember(id);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Catat Setoran Pertama</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {memberDeposits.map((dep) => {
                        const isEditing = editingDepositNoteId === dep.id;
                        return (
                          <div
                            key={dep.id}
                            className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs text-slate-500">
                                  <span className="font-mono font-medium text-slate-800">
                                    {dep.receiptNumber}
                                  </span>
                                  <span aria-hidden="true"> · </span>
                                  <span>{formatDateId(dep.date)}</span>
                                </p>
                                <p className="text-xs text-slate-600 mt-1">
                                  {dep.items
                                    .map(
                                      (i) =>
                                        `${i.wasteName} (${formatWeight(i.weightKg, i.unit)})`
                                    )
                                    .join(' · ')}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-mono tabular-nums text-sm font-bold text-emerald-700">
                                  +{formatRupiah(dep.totalAmount)}
                                </p>
                                <p className="font-mono tabular-nums text-[11px] text-slate-500">
                                  {formatWeight(dep.totalWeightKg)}
                                </p>
                              </div>
                            </div>

                            <div className="pt-2.5 border-t border-slate-100">
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    autoFocus
                                    value={editingDepositNoteText}
                                    onChange={(e) =>
                                      setEditingDepositNoteText(e.target.value)
                                    }
                                    placeholder="Tulis catatan kondisi setoran nasabah..."
                                    className="h-8 px-2.5 rounded-md border border-emerald-600 text-xs text-slate-900 flex-1 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onUpdateDepositNote(dep.id, editingDepositNoteText);
                                      setEditingDepositNoteId(null);
                                      setFeedbackMsg(
                                        `Catatan setoran ${dep.receiptNumber} diperbarui.`
                                      );
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-700 text-white text-xs font-medium"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Simpan</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingDepositNoteId(null)}
                                    className="px-2.5 py-1.5 rounded-md border border-slate-300 text-xs text-slate-600 hover:bg-slate-50"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-xs text-slate-700">
                                    <span className="text-slate-400">Catatan: </span>
                                    <span className={dep.notes ? 'text-slate-800' : 'text-slate-400 italic'}>
                                      {dep.notes || 'Belum ada catatan setoran'}
                                    </span>
                                  </p>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingDepositNoteId(dep.id);
                                        setEditingDepositNoteText(dep.notes || '');
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 text-[11px] font-medium text-slate-700"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                      <span>{dep.notes ? 'Ubah Catatan' : 'Tambah Catatan'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onOpenDepositReceipt(dep)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 text-[11px] font-medium text-slate-700"
                                    >
                                      <Receipt className="w-3 h-3" />
                                      <span>Struk</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  <div
                    id="printable-member-card"
                    className="border border-slate-300 rounded-xl overflow-hidden bg-white"
                  >
                    <div className="bg-emerald-800 text-white px-5 py-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-mono text-emerald-200">{settings.unitCode}</p>
                        <h4 className="text-base font-bold">{settings.bankName}</h4>
                      </div>
                      <div className="text-right text-xs">
                        <p className="text-emerald-200">Kartu Anggota</p>
                        <p className="font-mono font-semibold text-sm">
                          {selectedMember.memberNumber}
                        </p>
                      </div>
                    </div>

                    <div className="p-5 space-y-4 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-slate-400">Nama Nasabah</p>
                          <p className="text-sm font-bold text-slate-900 mt-0.5">
                            {selectedMember.name}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Kategori</p>
                          <p className="font-medium text-slate-800 mt-0.5">
                            {selectedMember.memberType}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Wilayah / Alamat</p>
                          <p className="text-slate-800 mt-0.5">
                            {selectedMember.rtRw} · {selectedMember.address}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">No. Telepon</p>
                          <p className="font-mono text-slate-800 mt-0.5">
                            {selectedMember.phone}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-dashed border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Terdaftar: {formatDateId(selectedMember.joinDate)}</span>
                        <span>Ketua Unit: {settings.chairmanName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">
                      Bawa kartu ini saat penimbangan sampah di {settings.address}.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const html = buildMemberCardHtml(selectedMember, settings);
                        printHtmlDocument(html, () => {
                          downloadReceiptHtml(html, `kartu-${selectedMember.memberNumber}.html`);
                          setFeedbackMsg(
                            `Dialog printer diblokir pratinjau — berkas Kartu Anggota (${selectedMember.memberNumber}) siap cetak telah diunduh.`
                          );
                        });
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium whitespace-nowrap shrink-0"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Cetak Kartu</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Master Nasabah Modal */}
      {showFormModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-label={editingMember ? 'Ubah Master Nasabah' : 'Tambah Master Nasabah'}
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">
                {editingMember
                  ? `Ubah Data Nasabah (${editingMember.memberNumber})`
                  : 'Registrasi Master Nasabah Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                aria-label="Tutup form nasabah"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="m-num" className="block text-xs font-medium text-slate-700 mb-1">
                    No. Induk Nasabah
                  </label>
                  <input
                    id="m-num"
                    type="text"
                    required
                    placeholder="RLM-008"
                    value={memberNumber}
                    onChange={(e) => setMemberNumber(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-mono uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
                <div>
                  <label htmlFor="m-type" className="block text-xs font-medium text-slate-700 mb-1">
                    Jenis Nasabah
                  </label>
                  <select
                    id="m-type"
                    value={memberType}
                    onChange={(e) => setMemberType(e.target.value as MemberType)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  >
                    {MEMBER_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="m-name" className="block text-xs font-medium text-slate-700 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    id="m-name"
                    type="text"
                    required
                    placeholder="Contoh: Ibu Kartini"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
                <div>
                  <label htmlFor="m-nik" className="block text-xs font-medium text-slate-700 mb-1">
                    NIK / KTP (Opsional, 16 digit)
                  </label>
                  <input
                    id="m-nik"
                    type="text"
                    inputMode="numeric"
                    maxLength={16}
                    placeholder="327501xxxxxxxxxx"
                    value={nik}
                    onChange={(e) => setNik(e.target.value.replace(/\D/g, ''))}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="m-rtrw" className="block text-xs font-medium text-slate-700 mb-1">
                    Wilayah RT / RW
                  </label>
                  <input
                    id="m-rtrw"
                    type="text"
                    placeholder="RT 01 / RW 05"
                    value={rtRw}
                    onChange={(e) => setRtRw(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
                <div>
                  <label htmlFor="m-phone" className="block text-xs font-medium text-slate-700 mb-1">
                    No. Telepon / WhatsApp
                  </label>
                  <input
                    id="m-phone"
                    type="text"
                    placeholder="0812-xxxx-xxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="m-address" className="block text-xs font-medium text-slate-700 mb-1">
                  Alamat Lengkap
                </label>
                <input
                  id="m-address"
                  type="text"
                  placeholder="Jl. Raja Lesmana..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="m-bank" className="block text-xs font-medium text-slate-700 mb-1">
                    Rekening / E-Wallet (Opsional)
                  </label>
                  <input
                    id="m-bank"
                    type="text"
                    placeholder="BRI / BCA / DANA..."
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
                <div>
                  <label htmlFor="m-status" className="block text-xs font-medium text-slate-700 mb-1">
                    Status Keanggotaan
                  </label>
                  <select
                    id="m-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'Aktif' | 'Nonaktif')}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="m-notes" className="block text-xs font-medium text-slate-700 mb-1">
                  Catatan Pengurus (Opsional)
                </label>
                <input
                  id="m-notes"
                  type="text"
                  placeholder="Keterangan tambahan..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              {formError && (
                <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium"
                >
                  {editingMember ? 'Simpan Perubahan' : 'Daftarkan Nasabah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Import Modal */}
      {showImportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Impor Master Nasabah CSV"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">
                Impor Massal Master Nasabah (CSV)
              </h3>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                aria-label="Tutup dialog impor"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Unggah file CSV daftar warga untuk menambahkan banyak nasabah sekaligus. Gunakan format kolom: <span className="font-mono text-slate-800">No Nasabah, NIK, Nama Lengkap, Jenis Nasabah, RT/RW, Telepon, Alamat, Rekening/E-Wallet, Catatan</span>.
              </p>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadCsvTemplate}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Template CSV</span>
                </button>

                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => csvInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Pilih File CSV</span>
                </button>
              </div>

              {importError && (
                <p role="alert" className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {importError}
                </p>
              )}

              {importPreview.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 font-medium text-slate-700">
                    Pratinjau {importPreview.length} nasabah siap diimpor
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {importPreview.map((row, idx) => (
                      <div key={`${row.memberNumber}-${idx}`} className="px-3 py-2 flex items-center justify-between gap-2">
                        <div>
                          <span className="font-mono font-medium text-slate-800">{row.memberNumber}</span>
                          <span aria-hidden="true"> · </span>
                          <span className="font-medium text-slate-900">{row.name}</span>
                        </div>
                        <span className="text-slate-500">
                          {row.memberType} · {row.rtRw}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={importPreview.length === 0}
                onClick={handleConfirmImport}
                className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-medium"
              >
                Impor {importPreview.length} Nasabah
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Konfirmasi Hapus Nasabah"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">
                Hapus Data Nasabah
              </h3>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                aria-label="Tutup konfirmasi hapus"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs text-slate-600">
              <p className="text-sm text-slate-900">
                Yakin ingin menghapus{' '}
                <span className="font-semibold">{deleteTarget.name}</span>{' '}
                (<span className="font-mono">{deleteTarget.memberNumber}</span>) dari Master Nasabah?
              </p>

              {(deleteTarget.balance > 0 || deleteTarget.totalWeightKg > 0) && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 leading-relaxed">
                  Nasabah ini tercatat memiliki saldo{' '}
                  <span className="font-mono font-semibold">
                    {formatRupiah(deleteTarget.balance)}
                  </span>{' '}
                  dan akumulasi setoran{' '}
                  <span className="font-mono font-semibold">
                    {formatWeight(deleteTarget.totalWeightKg)}
                  </span>
                  . Jika hanya ingin menghentikan keaktifan sementara, Anda dapat menonaktifkannya.
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-3.5 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Batal
              </button>
              {deleteTarget.status === 'Aktif' && (
                <button
                  type="button"
                  onClick={() => {
                    onUpdateMember(deleteTarget.id, {
                      memberNumber: deleteTarget.memberNumber,
                      nik: deleteTarget.nik,
                      name: deleteTarget.name,
                      memberType: deleteTarget.memberType,
                      rtRw: deleteTarget.rtRw,
                      phone: deleteTarget.phone,
                      address: deleteTarget.address,
                      bankAccount: deleteTarget.bankAccount,
                      notes: deleteTarget.notes,
                      status: 'Nonaktif',
                    });
                    setFeedbackMsg(
                      `Status nasabah ${deleteTarget.name} diubah menjadi Nonaktif.`
                    );
                    setDeleteTarget(null);
                  }}
                  className="px-3.5 py-2 rounded-lg border border-amber-300 bg-amber-50 text-xs font-medium text-amber-900 hover:bg-amber-100"
                >
                  Nonaktifkan Saja
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const deletedName = deleteTarget.name;
                  const deletedCode = deleteTarget.memberNumber;
                  onDeleteMember(deleteTarget.id);
                  if (selectedMemberId === deleteTarget.id) {
                    setSelectedMemberId(null);
                  }
                  setDeleteTarget(null);
                  setFeedbackMsg(
                    `Nasabah ${deletedName} (${deletedCode}) telah dihapus dari Master Nasabah.`
                  );
                }}
                className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-medium"
              >
                Ya, Hapus Nasabah
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import { useEffect, useState } from 'react';
import { CatalogView } from './components/CatalogView';
import { DepositView } from './components/DepositView';
import { HeaderBar } from './components/HeaderBar';
import { MemberFormPayload, MembersView } from './components/MembersView';
import { OverviewDashboard } from './components/OverviewDashboard';
import { ReceiptModal, ReceiptPayload } from './components/ReceiptModal';
import { QuickDepositModal } from './components/QuickDepositModal';
import { ReportsView } from './components/ReportsView';
import { Sidebar } from './components/Sidebar';
import { WithdrawalsView } from './components/WithdrawalsView';
import {
  generateReceiptCode,
  getTodayIsoDate,
  loadBankData,
  resetBankData,
  saveBankData,
} from './data/seedData';
import {
  BankSampahStore,
  BankSettings,
  DepositLineItem,
  DepositTransaction,
  Member,
  NavSection,
  WasteItem,
  WithdrawalMethod,
  WithdrawalTransaction,
} from './types/bankSampah';

export default function App() {
  const [store, setStore] = useState<BankSampahStore>(() => loadBankData());
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptPayload | null>(null);
  const [preselectedMemberId, setPreselectedMemberId] = useState<string | undefined>(
    undefined
  );
  const [quickDepositOpen, setQuickDepositOpen] = useState(false);
  const [quickDepositMemberId, setQuickDepositMemberId] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    saveBankData(store);
    document.title = `${store.settings.bankName} — Sistem Pengelolaan Bank Sampah`;
  }, [store]);

  const openQuickDeposit = (memberId?: string) => {
    setQuickDepositMemberId(memberId);
    setQuickDepositOpen(true);
  };

  const handleCreateDeposit = (payload: {
    memberId: string;
    date: string;
    items: DepositLineItem[];
    notes: string;
  }): DepositTransaction | null => {
    const member = store.members.find((m) => m.id === payload.memberId);
    if (!member || payload.items.length === 0) return null;

    const existingCodes = new Set(store.deposits.map((d) => d.receiptNumber));
    let seqOffset = store.deposits.length;
    let receiptNumber = generateReceiptCode('STR', seqOffset);
    while (existingCodes.has(receiptNumber)) {
      seqOffset += 1;
      receiptNumber = generateReceiptCode('STR', seqOffset);
    }

    const totalWeightKg = Number(
      payload.items.reduce((sum, i) => sum + i.weightKg, 0).toFixed(2)
    );
    const totalAmount = payload.items.reduce((sum, i) => sum + i.subtotal, 0);

    const newDeposit: DepositTransaction = {
      id: `dep-${Date.now()}`,
      receiptNumber,
      memberId: member.id,
      memberName: member.name,
      memberNumber: member.memberNumber,
      date: payload.date,
      createdAt: new Date().toISOString(),
      items: payload.items,
      totalWeightKg,
      totalAmount,
      notes: payload.notes,
      recordedBy: 'Pengurus Unit',
    };

    setStore((prev) => ({
      ...prev,
      deposits: [newDeposit, ...prev.deposits],
      members: prev.members.map((m) =>
        m.id === member.id
          ? {
              ...m,
              balance: m.balance + totalAmount,
              totalWeightKg: Number((m.totalWeightKg + totalWeightKg).toFixed(2)),
            }
          : m
      ),
    }));

    return newDeposit;
  };

  const handleUpdateDepositNote = (depositId: string, notes: string) => {
    setStore((prev) => ({
      ...prev,
      deposits: prev.deposits.map((d) =>
        d.id === depositId ? { ...d, notes: notes.trim() } : d
      ),
    }));
  };

  const handleCreateWithdrawal = (payload: {
    memberId: string;
    date: string;
    amount: number;
    method: WithdrawalMethod;
    notes: string;
  }): WithdrawalTransaction | null => {
    const member = store.members.find((m) => m.id === payload.memberId);
    if (!member || payload.amount <= 0 || payload.amount > member.balance) {
      return null;
    }

    const newWithdrawal: WithdrawalTransaction = {
      id: `wd-${Date.now()}`,
      referenceNumber: generateReceiptCode('TRK', store.withdrawals.length),
      memberId: member.id,
      memberName: member.name,
      memberNumber: member.memberNumber,
      date: payload.date,
      createdAt: new Date().toISOString(),
      amount: payload.amount,
      method: payload.method,
      notes: payload.notes,
      recordedBy: 'Bendahara',
    };

    setStore((prev) => ({
      ...prev,
      withdrawals: [newWithdrawal, ...prev.withdrawals],
      members: prev.members.map((m) =>
        m.id === member.id
          ? { ...m, balance: Math.max(0, m.balance - payload.amount) }
          : m
      ),
    }));

    return newWithdrawal;
  };

  const handleAddMember = (payload: MemberFormPayload): Member => {
    const newMember: Member = {
      id: `m-${Date.now()}`,
      memberNumber: payload.memberNumber,
      nik: payload.nik,
      name: payload.name,
      memberType: payload.memberType,
      rtRw: payload.rtRw,
      phone: payload.phone,
      address: payload.address,
      bankAccount: payload.bankAccount,
      notes: payload.notes,
      joinDate: getTodayIsoDate(),
      balance: 0,
      totalWeightKg: 0,
      status: payload.status,
    };

    setStore((prev) => ({
      ...prev,
      members: [newMember, ...prev.members],
    }));

    return newMember;
  };

  const handleUpdateMember = (memberId: string, payload: MemberFormPayload) => {
    setStore((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        m.id === memberId ? { ...m, ...payload } : m
      ),
    }));
  };

  const handleDeleteMember = (memberId: string) => {
    setStore((prev) => ({
      ...prev,
      members: prev.members.filter((m) => m.id !== memberId),
    }));
  };

  const handleImportMembers = (rows: Omit<MemberFormPayload, 'status'>[]): number => {
    const existingNums = new Set(store.members.map((m) => m.memberNumber.toUpperCase()));
    const today = getTodayIsoDate();
    const toAdd: Member[] = [];

    rows.forEach((row, idx) => {
      let num = row.memberNumber.toUpperCase();
      if (existingNums.has(num)) {
        num = `RLM-${String(store.members.length + toAdd.length + idx + 1).padStart(3, '0')}`;
      }
      existingNums.add(num);
      toAdd.push({
        id: `m-${Date.now()}-${idx}`,
        memberNumber: num,
        nik: row.nik,
        name: row.name,
        memberType: row.memberType,
        rtRw: row.rtRw,
        phone: row.phone,
        address: row.address,
        bankAccount: row.bankAccount,
        notes: row.notes,
        joinDate: today,
        balance: 0,
        totalWeightKg: 0,
        status: 'Aktif',
      });
    });

    if (toAdd.length > 0) {
      setStore((prev) => ({
        ...prev,
        members: [...toAdd, ...prev.members],
      }));
    }
    return toAdd.length;
  };

  const handleSaveWasteItem = (
    itemData: Omit<WasteItem, 'id'> & { id?: string }
  ) => {
    setStore((prev) => {
      if (itemData.id) {
        return {
          ...prev,
          wasteItems: prev.wasteItems.map((w) =>
            w.id === itemData.id ? { ...w, ...itemData, id: w.id } : w
          ),
        };
      }
      const created: WasteItem = {
        ...itemData,
        id: `w-${Date.now()}`,
      };
      return {
        ...prev,
        wasteItems: [created, ...prev.wasteItems],
      };
    });
  };

  const handleToggleWasteActive = (id: string) => {
    setStore((prev) => ({
      ...prev,
      wasteItems: prev.wasteItems.map((w) =>
        w.id === id ? { ...w, active: !w.active } : w
      ),
    }));
  };

  const handleUpdateSettings = (settings: BankSettings) => {
    setStore((prev) => {
      const next = { ...prev, settings };
      saveBankData(next);
      return next;
    });
  };

  const handleImportStore = (imported: BankSampahStore) => {
    setStore(imported);
  };

  const handleResetStore = () => {
    const fresh = resetBankData();
    setStore(fresh);
  };

  const navigateToSection = (section: NavSection, memberId?: string) => {
    setPreselectedMemberId(memberId);
    setActiveSection(section);
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAF9] text-slate-900">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={(sec) => navigateToSection(sec)}
        settings={store.settings}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <HeaderBar
          activeSection={activeSection}
          bankName={store.settings.bankName}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onQuickDeposit={() => openQuickDeposit()}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          {activeSection === 'overview' && (
            <OverviewDashboard
              store={store}
              onNavigate={(sec) => {
                if (sec === 'deposits' && store.deposits.length === 0) {
                  openQuickDeposit();
                } else {
                  navigateToSection(sec);
                }
              }}
              onOpenReceipt={(payload) => setReceipt(payload)}
            />
          )}

          {activeSection === 'deposits' && (
            <DepositView
              key={`dep-${preselectedMemberId ?? 'none'}`}
              members={store.members}
              wasteItems={store.wasteItems}
              deposits={store.deposits}
              preselectedMemberId={preselectedMemberId}
              onCreateDeposit={handleCreateDeposit}
              onUpdateDepositNote={handleUpdateDepositNote}
              onOpenReceipt={(tx) => setReceipt({ type: 'deposit', tx })}
            />
          )}

          {activeSection === 'members' && (
            <MembersView
              settings={store.settings}
              members={store.members}
              deposits={store.deposits}
              withdrawals={store.withdrawals}
              onAddMember={handleAddMember}
              onUpdateMember={handleUpdateMember}
              onDeleteMember={handleDeleteMember}
              onImportMembers={handleImportMembers}
              onUpdateDepositNote={handleUpdateDepositNote}
              onOpenDepositReceipt={(tx) => setReceipt({ type: 'deposit', tx })}
              onOpenWithdrawalReceipt={(tx) => setReceipt({ type: 'withdrawal', tx })}
              onQuickDepositForMember={(id) => openQuickDeposit(id)}
              onQuickWithdrawForMember={(id) => navigateToSection('withdrawals', id)}
            />
          )}

          {activeSection === 'withdrawals' && (
            <WithdrawalsView
              key={`wd-${preselectedMemberId ?? 'none'}`}
              members={store.members}
              withdrawals={store.withdrawals}
              preselectedMemberId={preselectedMemberId}
              onCreateWithdrawal={handleCreateWithdrawal}
              onOpenReceipt={(tx) => setReceipt({ type: 'withdrawal', tx })}
            />
          )}

          {activeSection === 'catalog' && (
            <CatalogView
              wasteItems={store.wasteItems}
              deposits={store.deposits}
              onSaveWasteItem={handleSaveWasteItem}
              onToggleActive={handleToggleWasteActive}
            />
          )}

          {activeSection === 'reports' && (
            <ReportsView
              store={store}
              onUpdateSettings={handleUpdateSettings}
              onImportStore={handleImportStore}
              onResetStore={handleResetStore}
            />
          )}
        </main>
      </div>

      <QuickDepositModal
        open={quickDepositOpen}
        members={store.members}
        wasteItems={store.wasteItems}
        deposits={store.deposits}
        initialMemberId={quickDepositMemberId}
        onClose={() => setQuickDepositOpen(false)}
        onCreateDeposit={handleCreateDeposit}
        onCreated={(tx) => setReceipt({ type: 'deposit', tx })}
      />

      <ReceiptModal
        receipt={receipt}
        settings={store.settings}
        memberBalance={
          receipt
            ? store.members.find((m) => m.id === receipt.tx.memberId)?.balance
            : undefined
        }
        onClose={() => setReceipt(null)}
      />
    </div>
  );
}

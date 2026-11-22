export type WasteCategory =
  | 'Plastik'
  | 'Kertas'
  | 'Logam'
  | 'Kaca'
  | 'Minyak Jelantah'
  | 'Elektronik';

export interface WasteItem {
  id: string;
  code: string;
  name: string;
  category: WasteCategory;
  pricePerKg: number;
  sellPricePerKg: number;
  unit: 'kg' | 'liter';
  active: boolean;
  description: string;
}

export type MemberType =
  | 'Perorangan'
  | 'Keluarga / KK'
  | 'Sekolah / Instansi'
  | 'Warung / UMKM';

export interface Member {
  id: string;
  memberNumber: string;
  nik: string;
  name: string;
  memberType: MemberType;
  rtRw: string;
  phone: string;
  address: string;
  bankAccount: string;
  notes: string;
  joinDate: string; // YYYY-MM-DD
  balance: number;
  totalWeightKg: number;
  status: 'Aktif' | 'Nonaktif';
}

export interface DepositLineItem {
  wasteItemId: string;
  wasteName: string;
  category: WasteCategory;
  weightKg: number;
  unit: 'kg' | 'liter';
  pricePerKg: number;
  subtotal: number;
}

export interface DepositTransaction {
  id: string;
  receiptNumber: string;
  memberId: string;
  memberName: string;
  memberNumber: string;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO string
  items: DepositLineItem[];
  totalWeightKg: number;
  totalAmount: number;
  notes: string;
  recordedBy: string;
}

export type WithdrawalMethod = 'Tunai' | 'Transfer Bank' | 'Tukar Sembako';

export interface WithdrawalTransaction {
  id: string;
  referenceNumber: string;
  memberId: string;
  memberName: string;
  memberNumber: string;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO string
  amount: number;
  method: WithdrawalMethod;
  notes: string;
  recordedBy: string;
}

export interface BankSettings {
  bankName: string;
  unitCode: string;
  address: string;
  chairmanName: string;
  operationalHours: string;
  phone: string;
}

export interface BankSampahStore {
  settings: BankSettings;
  wasteItems: WasteItem[];
  members: Member[];
  deposits: DepositTransaction[];
  withdrawals: WithdrawalTransaction[];
}

export type NavSection =
  | 'overview'
  | 'deposits'
  | 'members'
  | 'withdrawals'
  | 'catalog'
  | 'reports';

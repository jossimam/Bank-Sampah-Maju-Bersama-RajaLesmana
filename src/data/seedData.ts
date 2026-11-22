import {
  BankSampahStore,
  BankSettings,
  DepositTransaction,
  Member,
  MemberType,
  WasteCategory,
  WasteItem,
  WithdrawalTransaction,
} from '../types/bankSampah';

const STORAGE_KEY = 'bank_sampah_maju_bersama_v2';
const LEGACY_STORAGE_KEY = 'bank_sampah_raja_lesmana_maju_v1';

export const MEMBER_TYPES: MemberType[] = [
  'Perorangan',
  'Keluarga / KK',
  'Warung / UMKM',
  'Sekolah / Instansi',
];

export const WASTE_CATEGORIES: WasteCategory[] = [
  'Plastik',
  'Kertas',
  'Logam',
  'Kaca',
  'Minyak Jelantah',
  'Elektronik',
];

export const INITIAL_WASTE_ITEMS: WasteItem[] = [
  {
    id: 'w-pet-bening',
    code: 'PL-01',
    name: 'Botol Plastik PET Bening',
    category: 'Plastik',
    pricePerKg: 4200,
    sellPricePerKg: 5400,
    unit: 'kg',
    active: true,
    description: 'Botol air mineral bersih, tanpa tutup & label terpisah.',
  },
  {
    id: 'w-hdpe-warna',
    code: 'PL-02',
    name: 'Plastik Keras HDPE / Jerigen',
    category: 'Plastik',
    pricePerKg: 3500,
    sellPricePerKg: 4500,
    unit: 'kg',
    active: true,
    description: 'Botol sampo, jerigen bersih, dan tutup botol terpilah.',
  },
  {
    id: 'w-gelas-pp',
    code: 'PL-03',
    name: 'Gelas Plastik PP Bening',
    category: 'Plastik',
    pricePerKg: 5000,
    sellPricePerKg: 6200,
    unit: 'kg',
    active: true,
    description: 'Gelas air minum kemasan dalam kondisi kering dan bersih.',
  },
  {
    id: 'w-kardus',
    code: 'KT-01',
    name: 'Kardus Cokelat Kering',
    category: 'Kertas',
    pricePerKg: 2600,
    sellPricePerKg: 3300,
    unit: 'kg',
    active: true,
    description: 'Kardus bekas kemasan dilipat rapi dan tidak basah.',
  },
  {
    id: 'w-hvs',
    code: 'KT-02',
    name: 'Kertas HVS / Buku Bekas',
    category: 'Kertas',
    pricePerKg: 3200,
    sellPricePerKg: 4100,
    unit: 'kg',
    active: true,
    description: 'Kertas putih arsip, buku tulis tanpa sampul plastik.',
  },
  {
    id: 'w-koran',
    code: 'KT-03',
    name: 'Koran & Majalah Bekas',
    category: 'Kertas',
    pricePerKg: 2200,
    sellPricePerKg: 2800,
    unit: 'kg',
    active: true,
    description: 'Tumpukan koran kering dan majalah bersih.',
  },
  {
    id: 'w-aluminium',
    code: 'LG-01',
    name: 'Kaleng Aluminium Minuman',
    category: 'Logam',
    pricePerKg: 14500,
    sellPricePerKg: 17500,
    unit: 'kg',
    active: true,
    description: 'Kaleng minuman ringan dipipihkan agar hemat ruang.',
  },
  {
    id: 'w-besi',
    code: 'LG-02',
    name: 'Besi & Kaleng Susu/Biskuit',
    category: 'Logam',
    pricePerKg: 4800,
    sellPricePerKg: 6000,
    unit: 'kg',
    active: true,
    description: 'Logam besi ringan, kaleng makanan bebas sisa minyak.',
  },
  {
    id: 'w-kaca',
    code: 'KC-01',
    name: 'Botol Kaca / Beling Utuh',
    category: 'Kaca',
    pricePerKg: 1200,
    sellPricePerKg: 1700,
    unit: 'kg',
    active: true,
    description: 'Botol sirup, kecap, atau selai yang telah dibilas.',
  },
  {
    id: 'w-jelantah',
    code: 'MJ-01',
    name: 'Minyak Jelantah Saring',
    category: 'Minyak Jelantah',
    pricePerKg: 6500,
    sellPricePerKg: 8200,
    unit: 'liter',
    active: true,
    description: 'Minyak goreng bekas pakai, sudah disaring dari ampas.',
  },
  {
    id: 'w-kabel',
    code: 'EL-01',
    name: 'Kabel & Perangkat Elektronik Kecil',
    category: 'Elektronik',
    pricePerKg: 9500,
    sellPricePerKg: 12000,
    unit: 'kg',
    active: true,
    description: 'Kabel bekas, charger rusak, atau adaptor tidak terpakai.',
  },
];

const INITIAL_DEPOSITS: DepositTransaction[] = [];

const INITIAL_WITHDRAWALS: WithdrawalTransaction[] = [];

const INITIAL_MEMBERS: Member[] = [];

export const DEFAULT_STORE: BankSampahStore = {
  settings: {
    bankName: 'Bank Sampah Maju Bersama Raja Lesmana',
    unitCode: 'UNIT-RLM-05',
    address: 'Balai Warga RW 05, Jl. Raja Lesmana No. 01',
    chairmanName: 'Ibu Suryani Kusuma',
    operationalHours: 'Rabu & Sabtu, 08.00 – 12.00 WIB',
    phone: '0812-8800-4500',
  },
  wasteItems: INITIAL_WASTE_ITEMS,
  members: INITIAL_MEMBERS,
  deposits: INITIAL_DEPOSITS,
  withdrawals: INITIAL_WITHDRAWALS,
};

function normalizeWasteItems(items?: WasteItem[]): WasteItem[] {
  return (items ?? DEFAULT_STORE.wasteItems).map((w) => {
    const seedMatch = INITIAL_WASTE_ITEMS.find((s) => s.id === w.id);
    return {
      ...w,
      sellPricePerKg:
        typeof w.sellPricePerKg === 'number'
          ? w.sellPricePerKg
          : seedMatch?.sellPricePerKg ?? Math.round(w.pricePerKg * 1.25),
    };
  });
}

function migrateSettings(settings?: BankSettings): BankSettings {
  const loadedSettings = settings ?? DEFAULT_STORE.settings;
  return loadedSettings.bankName === 'Bank Sampah Raja Lesmana Maju'
    ? { ...loadedSettings, bankName: DEFAULT_STORE.settings.bankName }
    : loadedSettings;
}

export function loadBankData(): BankSampahStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw) as Partial<BankSampahStore>;
        const cleanMigrated: BankSampahStore = {
          settings: migrateSettings(legacyParsed.settings),
          wasteItems: normalizeWasteItems(legacyParsed.wasteItems),
          members: [],
          deposits: [],
          withdrawals: [],
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanMigrated));
        return cleanMigrated;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STORE));
      return DEFAULT_STORE;
    }
    const parsed = JSON.parse(raw) as Partial<BankSampahStore>;
    const normalizedMembers: Member[] = (parsed.members ?? []).map((m) => ({
      ...m,
      nik: m.nik ?? '',
      memberType: m.memberType ?? 'Perorangan',
      bankAccount: m.bankAccount ?? '',
      notes: m.notes ?? '',
      balance: typeof m.balance === 'number' ? m.balance : 0,
      totalWeightKg: typeof m.totalWeightKg === 'number' ? m.totalWeightKg : 0,
    }));
    return {
      settings: migrateSettings(parsed.settings),
      wasteItems: normalizeWasteItems(parsed.wasteItems),
      members: normalizedMembers,
      deposits: parsed.deposits ?? [],
      withdrawals: parsed.withdrawals ?? [],
    };
  } catch {
    return DEFAULT_STORE;
  }
}

export function saveBankData(store: BankSampahStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function resetBankData(): BankSampahStore {
  saveBankData(DEFAULT_STORE);
  return DEFAULT_STORE;
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatWeight(kg: number, unit: 'kg' | 'liter' = 'kg'): string {
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: kg % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2,
  }).format(kg);
  return `${formatted} ${unit}`;
}

export function formatDateId(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function generateReceiptCode(prefix: 'STR' | 'TRK', count: number): string {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const seq = String(count + 1).padStart(3, '0');
  return `${prefix}-${ym}-${seq}`;
}

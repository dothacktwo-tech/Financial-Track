import {
  Account,
  AuditLog,
  Category,
  Debt,
  DebtPayment,
  Profile,
  UserRole,
  UserStatus,
  Receivable,
  ReceivablePayment,
  Receipt,
  SavingGoal,
  SavingGoalTransaction,
  Transaction,
  TransactionItem,
} from '../types/database';
import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEY = 'fintrack_personal_v1_db';

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // fallback
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface DatabaseState {
  profiles: Profile[];
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  transaction_items: TransactionItem[];
  debts: Debt[];
  debt_payments: DebtPayment[];
  receivables: Receivable[];
  receivable_payments: ReceivablePayment[];
  saving_goals: SavingGoal[];
  saving_goal_transactions: SavingGoalTransaction[];
  receipts: Receipt[];
  receipt_items: any[];
  audit_logs: AuditLog[];
}

// Initial seed data
const initialCategories: Category[] = [
  { id: 'cat-inc-1', name: 'Gaji Pokok', type: 'income', icon: 'Briefcase', is_active: true, created_at: new Date().toISOString() },
  { id: 'cat-inc-2', name: 'Bonus & THR', type: 'income', icon: 'Gift', is_active: true, created_at: new Date().toISOString() },
  { id: 'cat-inc-3', name: 'Freelance & Side Hustle', type: 'income', icon: 'Laptop', is_active: true, created_at: new Date().toISOString() },
  { id: 'cat-inc-4', name: 'Investasi & Dividen', type: 'income', icon: 'TrendingUp', is_active: true, created_at: new Date().toISOString() },
  { id: 'cat-exp-1', name: 'Belanja & Groceries', type: 'expense', icon: 'ShoppingCart', is_active: true, created_at: new Date().toISOString() },
  { id: 'cat-exp-2', name: 'Makanan & Minuman', type: 'expense', icon: 'Utensils', is_active: true, created_at: new Date().toISOString() },
  { id: 'cat-exp-3', name: 'Transportasi & Bensin', type: 'expense', icon: 'Car', is_active: true, created_at: new Date().toISOString() },
  { id: 'cat-exp-4', name: 'Tagihan & Utilitas', type: 'expense', icon: 'Zap', is_active: true, created_at: new Date().toISOString() },
  { id: 'cat-exp-5', name: 'Kesehatan & Obat', type: 'expense', icon: 'HeartPulse', is_active: true, created_at: new Date().toISOString() },
  { id: 'cat-exp-6', name: 'Kebutuhan Rumah', type: 'expense', icon: 'Home', is_active: true, created_at: new Date().toISOString() },
  { id: 'cat-exp-7', name: 'Hiburan & Liburan', type: 'expense', icon: 'Film', is_active: true, created_at: new Date().toISOString() },
  { id: 'cat-exp-8', name: 'Pendidikan & Kursus', type: 'expense', icon: 'GraduationCap', is_active: true, created_at: new Date().toISOString() },
  { id: 'cat-exp-9', name: 'Lainnya', type: 'expense', icon: 'MoreHorizontal', is_active: true, created_at: new Date().toISOString() },
];

export const DEFAULT_USER_ID = 'a0045f93-61b0-4170-bee5-9995aacfd65c';
export const DEFAULT_ADMIN_ID = '3ef3d2c4-fc59-4505-918f-46d13f453c50';

export const DEFAULT_ACCOUNT_IDS = {
  BCA: 'bca00000-0000-4000-8000-000000000001',
  DANA: 'bca00000-0000-4000-8000-000000000002',
  CASH: 'bca00000-0000-4000-8000-000000000003',
  MANDIRI: 'bca00000-0000-4000-8000-000000000004',
};

export const defaultUsers: Profile[] = [
  {
    id: DEFAULT_USER_ID,
    username: 'user',
    email: 'user@fintrack.id',
    full_name: 'Budi Santoso',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    role: 'user',
    status: 'active',
    password: 'user123',
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
  {
    id: DEFAULT_ADMIN_ID,
    username: 'admin',
    email: 'admin@fintrack.id',
    full_name: 'Admin FinTrack',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    role: 'admin',
    status: 'active',
    password: 'admin123',
    created_at: '2026-08-15T08:00:00Z',
    updated_at: '2026-08-15T08:00:00Z',
  },
];

const sampleAccounts: Account[] = [
  {
    id: DEFAULT_ACCOUNT_IDS.BCA,
    user_id: DEFAULT_USER_ID,
    name: 'BCA Tahapan',
    type: 'Bank',
    opening_balance: 8500000,
    description: 'Rekening operasional harian & gaji',
    is_active: true,
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
  {
    id: DEFAULT_ACCOUNT_IDS.DANA,
    user_id: DEFAULT_USER_ID,
    name: 'DANA E-Wallet',
    type: 'E-Wallet',
    opening_balance: 750000,
    description: 'Dompet digital untuk jajan & promo',
    is_active: true,
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
  {
    id: DEFAULT_ACCOUNT_IDS.CASH,
    user_id: DEFAULT_USER_ID,
    name: 'Dompet Tunai (Cash)',
    type: 'Cash',
    opening_balance: 500000,
    description: 'Uang fisik di dompet',
    is_active: true,
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
  {
    id: DEFAULT_ACCOUNT_IDS.MANDIRI,
    user_id: DEFAULT_USER_ID,
    name: 'Bank Mandiri Tabungan',
    type: 'Bank',
    opening_balance: 5000000,
    description: 'Tabungan dana darurat',
    is_active: true,
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
];

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = String(now.getMonth() + 1).padStart(2, '0');

const sampleTransactions: Transaction[] = [
  {
    id: 'tx-1',
    user_id: DEFAULT_USER_ID,
    account_id: DEFAULT_ACCOUNT_IDS.BCA,
    category_id: 'cat-inc-1',
    type: 'income',
    amount: 9500000,
    transaction_date: `${currentYear}-${currentMonth}-01`,
    description: 'Gaji Bulanan PT Maju Bersama',
    payment_method: 'BCA',
    source: 'manual',
    notes: 'Transfer payroll bulanan',
    created_at: `${currentYear}-${currentMonth}-01T09:00:00Z`,
    updated_at: `${currentYear}-${currentMonth}-01T09:00:00Z`,
  },
  {
    id: 'tx-2',
    user_id: DEFAULT_USER_ID,
    account_id: DEFAULT_ACCOUNT_IDS.BCA,
    category_id: 'cat-exp-4',
    type: 'expense',
    amount: 650000,
    transaction_date: `${currentYear}-${currentMonth}-02`,
    description: 'Tagihan Listrik PLN & Air PAM',
    payment_method: 'BCA Mobile',
    source: 'manual',
    created_at: `${currentYear}-${currentMonth}-02T10:30:00Z`,
    updated_at: `${currentYear}-${currentMonth}-02T10:30:00Z`,
  },
  {
    id: 'tx-3',
    user_id: DEFAULT_USER_ID,
    account_id: DEFAULT_ACCOUNT_IDS.BCA,
    category_id: 'cat-exp-1',
    type: 'expense',
    amount: 1250000,
    transaction_date: `${currentYear}-${currentMonth}-03`,
    description: 'Belanja Bulanan Superindo',
    payment_method: 'Debit BCA',
    source: 'receipt_ai',
    notes: 'Struk di-scan melalui AI FinTrack',
    created_at: `${currentYear}-${currentMonth}-03T15:20:00Z`,
    updated_at: `${currentYear}-${currentMonth}-03T15:20:00Z`,
  },
  {
    id: 'tx-4',
    user_id: DEFAULT_USER_ID,
    account_id: DEFAULT_ACCOUNT_IDS.DANA,
    category_id: 'cat-exp-2',
    type: 'expense',
    amount: 95000,
    transaction_date: `${currentYear}-${currentMonth}-04`,
    description: 'Makan Siang Bareng Rekan Kerja',
    payment_method: 'QRIS DANA',
    source: 'manual',
    created_at: `${currentYear}-${currentMonth}-04T12:45:00Z`,
    updated_at: `${currentYear}-${currentMonth}-04T12:45:00Z`,
  },
  {
    id: 'tx-5',
    user_id: DEFAULT_USER_ID,
    account_id: DEFAULT_ACCOUNT_IDS.BCA,
    destination_account_id: DEFAULT_ACCOUNT_IDS.DANA,
    type: 'transfer',
    amount: 500000,
    transaction_date: `${currentYear}-${currentMonth}-04`,
    description: 'Top up DANA dari BCA',
    payment_method: 'Virtual Account',
    source: 'manual',
    notes: 'Pemindahan dana pribadi',
    created_at: `${currentYear}-${currentMonth}-04T11:00:00Z`,
    updated_at: `${currentYear}-${currentMonth}-04T11:00:00Z`,
  },
  {
    id: 'tx-6',
    user_id: DEFAULT_USER_ID,
    account_id: DEFAULT_ACCOUNT_IDS.BCA,
    category_id: 'cat-exp-3',
    type: 'expense',
    amount: 250000,
    transaction_date: `${currentYear}-${currentMonth}-05`,
    description: 'Isi Bensin Pertamax',
    payment_method: 'Cash',
    source: 'manual',
    created_at: `${currentYear}-${currentMonth}-05T08:15:00Z`,
    updated_at: `${currentYear}-${currentMonth}-05T08:15:00Z`,
  },
  {
    id: 'tx-7',
    user_id: DEFAULT_USER_ID,
    account_id: DEFAULT_ACCOUNT_IDS.BCA,
    category_id: 'cat-inc-3',
    type: 'income',
    amount: 1500000,
    transaction_date: `${currentYear}-${currentMonth}-05`,
    description: 'Fee Proyek Website Landing Page',
    payment_method: 'Transfer Bank',
    source: 'manual',
    created_at: `${currentYear}-${currentMonth}-05T14:30:00Z`,
    updated_at: `${currentYear}-${currentMonth}-05T14:30:00Z`,
  },
];

const sampleDebts: Debt[] = [
  {
    id: 'debt-1',
    user_id: DEFAULT_USER_ID,
    person_name: 'Pak Hendra (Cicilan Laptop)',
    description: 'Sisa cicilan pembelian laptop kantor',
    amount: 4500000,
    remaining_amount: 1500000,
    transaction_date: '2026-08-10',
    due_date: '2026-11-10',
    status: 'partial',
    notes: 'Sudah dibayar 3.000.000 via BCA',
    created_at: '2026-08-10T10:00:00Z',
    updated_at: '2026-09-10T10:00:00Z',
  },
  {
    id: 'debt-2',
    user_id: DEFAULT_USER_ID,
    person_name: 'Dian Nugraha',
    description: 'Pinjam uang untuk servis motor',
    amount: 800000,
    remaining_amount: 800000,
    transaction_date: '2026-09-25',
    due_date: '2026-10-25',
    status: 'unpaid',
    notes: 'Janji bayar akhir bulan',
    created_at: '2026-09-25T14:00:00Z',
    updated_at: '2026-09-25T14:00:00Z',
  },
];

const sampleReceivables: Receivable[] = [
  {
    id: 'rec-1',
    user_id: DEFAULT_USER_ID,
    person_name: 'Rudi Pratama',
    description: 'Talangan beli tiket konser musik',
    amount: 1200000,
    remaining_amount: 600000,
    transaction_date: '2026-09-15',
    due_date: '2026-10-20',
    status: 'partial',
    notes: 'Sudah ditransfer 600rb minggu lalu',
    created_at: '2026-09-15T09:00:00Z',
    updated_at: '2026-09-28T09:00:00Z',
  },
  {
    id: 'rec-2',
    user_id: DEFAULT_USER_ID,
    person_name: 'Siti Aminah',
    description: 'Pinjaman darurat modal usaha kue',
    amount: 1500000,
    remaining_amount: 1500000,
    transaction_date: '2026-09-05',
    due_date: '2026-11-05',
    status: 'unpaid',
    notes: 'Tempo 2 bulan',
    created_at: '2026-09-05T11:00:00Z',
    updated_at: '2026-09-05T11:00:00Z',
  },
];

const sampleSavingGoals: SavingGoal[] = [
  {
    id: 'goal-1',
    user_id: DEFAULT_USER_ID,
    name: 'Liburan Jepang 2027',
    target_amount: 20000000,
    current_amount: 8500000,
    target_date: '2027-04-15',
    description: 'Tiket pesawat PP + JR Pass + Hotel Tokyo & Kyoto',
    status: 'active',
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
  {
    id: 'goal-2',
    user_id: DEFAULT_USER_ID,
    name: 'Dana Darurat 6 Bulan',
    target_amount: 30000000,
    current_amount: 18000000,
    target_date: '2026-12-31',
    description: 'Disimpan di instrumen reksadana pasar uang & deposito',
    status: 'active',
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
];

const legacyAccountMap: Record<string, string> = {
  'acc-1': DEFAULT_ACCOUNT_IDS.BCA,
  'acc-2': DEFAULT_ACCOUNT_IDS.DANA,
  'acc-3': DEFAULT_ACCOUNT_IDS.CASH,
  'acc-4': DEFAULT_ACCOUNT_IDS.MANDIRI,
};

function migrateLegacyIds(db: DatabaseState): DatabaseState {
  if (!db) return db;
  let modified = false;

  // 1. Ensure profiles array exists and migrate legacy IDs
  if (!Array.isArray(db.profiles)) {
    db.profiles = [...defaultUsers];
    modified = true;
  } else {
    db.profiles = db.profiles.map((p) => {
      let updated = { ...p };
      if (updated.id === 'user-demo-1') {
        modified = true;
        updated.id = DEFAULT_USER_ID;
      }
      if (updated.id === 'admin-demo-1') {
        modified = true;
        updated.id = DEFAULT_ADMIN_ID;
      }
      if (updated.id === DEFAULT_USER_ID) {
        if (!updated.username) {
          updated.username = 'user';
          modified = true;
        }
        if (!updated.password) {
          updated.password = 'user123';
          modified = true;
        }
      }
      if (updated.id === DEFAULT_ADMIN_ID) {
        if (!updated.username) {
          updated.username = 'admin';
          modified = true;
        }
        if (!updated.password) {
          updated.password = 'admin123';
          modified = true;
        }
      }
      if (!updated.username) {
        updated.username = (updated.email ? updated.email.split('@')[0] : 'user_' + updated.id.slice(0, 5)).toLowerCase().replace(/\s+/g, '');
        modified = true;
      }
      if (!updated.status) {
        updated.status = 'active';
        modified = true;
      }
      if (!updated.role) {
        updated.role = 'user';
        modified = true;
      }
      return updated;
    });

    if (!db.profiles.some((p) => p.id === DEFAULT_USER_ID)) {
      db.profiles.push(defaultUsers[0]);
      modified = true;
    }
    if (!db.profiles.some((p) => p.id === DEFAULT_ADMIN_ID)) {
      db.profiles.push(defaultUsers[1]);
      modified = true;
    }
  }

  // 2. Migrate user_id in related tables
  const migrateUserId = (item: any) => {
    if (!item) return item;
    if (item.user_id === 'user-demo-1') {
      modified = true;
      return { ...item, user_id: DEFAULT_USER_ID };
    }
    if (item.user_id === 'admin-demo-1') {
      modified = true;
      return { ...item, user_id: DEFAULT_ADMIN_ID };
    }
    return item;
  };

  // 3. Migrate account IDs to valid UUIDs
  db.accounts = (db.accounts || []).map((acc) => {
    let item = migrateUserId(acc);
    if (legacyAccountMap[item.id]) {
      modified = true;
      item = { ...item, id: legacyAccountMap[item.id] };
    }
    return item;
  });

  db.transactions = (db.transactions || []).map((tx) => {
    let item = migrateUserId(tx);
    if (item.account_id && legacyAccountMap[item.account_id]) {
      modified = true;
      item = { ...item, account_id: legacyAccountMap[item.account_id] };
    }
    if (item.destination_account_id && legacyAccountMap[item.destination_account_id]) {
      modified = true;
      item = { ...item, destination_account_id: legacyAccountMap[item.destination_account_id] };
    }
    return item;
  });

  db.debts = (db.debts || []).map(migrateUserId);
  db.receivables = (db.receivables || []).map(migrateUserId);
  db.saving_goals = (db.saving_goals || []).map(migrateUserId);
  db.receipts = (db.receipts || []).map(migrateUserId);
  db.audit_logs = (db.audit_logs || []).map(migrateUserId);

  if (modified && typeof window !== 'undefined') {
    const currentSavedId = localStorage.getItem('fintrack_current_user_id');
    if (currentSavedId === 'user-demo-1') {
      localStorage.setItem('fintrack_current_user_id', DEFAULT_USER_ID);
    } else if (currentSavedId === 'admin-demo-1') {
      localStorage.setItem('fintrack_current_user_id', DEFAULT_ADMIN_ID);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  return db;
}

function loadDatabase(): DatabaseState {
  if (typeof window === 'undefined') {
    return {
      profiles: defaultUsers,
      accounts: sampleAccounts,
      categories: initialCategories,
      transactions: sampleTransactions,
      transaction_items: [],
      debts: sampleDebts,
      debt_payments: [],
      receivables: sampleReceivables,
      receivable_payments: [],
      saving_goals: sampleSavingGoals,
      saving_goal_transactions: [],
      receipts: [],
      receipt_items: [],
      audit_logs: [
        {
          id: 'log-init',
          user_id: DEFAULT_USER_ID,
          user_email: 'user@fintrack.id',
          action: 'LOGIN',
          entity: 'auth',
          metadata: { note: 'Inisialisasi sistem demo' },
          created_at: new Date().toISOString(),
        },
      ],
    };
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const fresh: DatabaseState = {
      profiles: defaultUsers,
      accounts: sampleAccounts,
      categories: initialCategories,
      transactions: sampleTransactions,
      transaction_items: [],
      debts: sampleDebts,
      debt_payments: [],
      receivables: sampleReceivables,
      receivable_payments: [],
      saving_goals: sampleSavingGoals,
      saving_goal_transactions: [],
      receipts: [],
      receipt_items: [],
      audit_logs: [
        {
          id: 'log-init',
          user_id: DEFAULT_USER_ID,
          user_email: 'user@fintrack.id',
          action: 'LOGIN',
          entity: 'auth',
          metadata: { note: 'Inisialisasi sistem' },
          created_at: new Date().toISOString(),
        },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    return fresh;
  }

  try {
    const parsed = JSON.parse(raw);
    return migrateLegacyIds(parsed);
  } catch {
    return {
      profiles: defaultUsers,
      accounts: sampleAccounts,
      categories: initialCategories,
      transactions: sampleTransactions,
      transaction_items: [],
      debts: sampleDebts,
      debt_payments: [],
      receivables: sampleReceivables,
      receivable_payments: [],
      saving_goals: sampleSavingGoals,
      saving_goal_transactions: [],
      receipts: [],
      receipt_items: [],
      audit_logs: [],
    };
  }
}

function saveDatabase(db: DatabaseState) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    window.dispatchEvent(new Event('fintrack_db_updated'));
  }
}

/**
 * Calculates current balance for accounts per PRD Section 28:
 * Saldo Akhir = Opening Balance + Income + Transfer In - Expense - Transfer Out
 */
export function calculateAccountBalances(accounts: Account[], transactions: Transaction[]): Account[] {
  return accounts.map((account) => {
    let balance = Number(account.opening_balance) || 0;

    for (const tx of transactions) {
      const amount = Number(tx.amount) || 0;
      if (tx.type === 'income' && tx.account_id === account.id) {
        balance += amount;
      } else if (tx.type === 'expense' && tx.account_id === account.id) {
        balance -= amount;
      } else if (tx.type === 'transfer') {
        if (tx.account_id === account.id) {
          balance -= amount; // Transfer keluar
        }
        if (tx.destination_account_id === account.id) {
          balance += amount; // Transfer masuk
        }
      }
    }

    return {
      ...account,
      current_balance: balance,
    };
  });
}

// DataStore API implementation
export const dataStore = {
  // Profiles & Users (Admin & Auth)
  async getProfiles(): Promise<Profile[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          const db = loadDatabase();
          data.forEach((remoteP: Profile) => {
            const idx = db.profiles.findIndex((x) => x.id === remoteP.id);
            if (idx !== -1) {
              db.profiles[idx] = { ...db.profiles[idx], ...remoteP };
            } else {
              db.profiles.push(remoteP);
            }
          });
          // Cache quietly to localStorage without firing change event during read
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
          }
          return db.profiles;
        }
      } catch (e) {
        console.warn('[dataStore] Supabase getProfiles warning:', e);
      }
    }
    const db = loadDatabase();
    return db.profiles;
  },

  async getProfile(userId: string): Promise<Profile | null> {
    const effectiveId =
      userId === 'user-demo-1' ? DEFAULT_USER_ID : userId === 'admin-demo-1' ? DEFAULT_ADMIN_ID : userId;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', effectiveId).maybeSingle();
        if (!error && data) {
          const db = loadDatabase();
          const idx = db.profiles.findIndex((p) => p.id === effectiveId);
          if (idx !== -1) {
            db.profiles[idx] = { ...db.profiles[idx], ...data };
          } else {
            db.profiles.push(data);
          }
          // Cache quietly to localStorage without firing change event during read
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
          }
          return data;
        }
      } catch (e) {
        console.warn('[dataStore] Supabase getProfile warning:', e);
      }
    }
    const db = loadDatabase();
    return db.profiles.find((p) => p.id === effectiveId || p.id === userId) || null;
  },

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const effectiveId =
      userId === 'user-demo-1' ? DEFAULT_USER_ID : userId === 'admin-demo-1' ? DEFAULT_ADMIN_ID : userId;

    const nowIso = new Date().toISOString();
    const cleanUpdates: Partial<Profile> = {
      ...updates,
      updated_at: nowIso,
    };
    if (cleanUpdates.avatar_url === '') {
      cleanUpdates.avatar_url = null as any;
    }

    // 1. Update or create in local persistent database state
    const db = loadDatabase();
    let idx = db.profiles.findIndex((p) => p.id === effectiveId || p.id === userId);
    let targetProfile: Profile;
    if (idx !== -1) {
      db.profiles[idx] = {
        ...db.profiles[idx],
        ...cleanUpdates,
        id: effectiveId,
      };
      targetProfile = db.profiles[idx];
    } else {
      targetProfile = {
        id: effectiveId,
        full_name: cleanUpdates.full_name || 'Pengguna FinTrack',
        email: cleanUpdates.email || 'user@fintrack.id',
        avatar_url: cleanUpdates.avatar_url,
        role: cleanUpdates.role || 'user',
        status: cleanUpdates.status || 'active',
        created_at: cleanUpdates.created_at || nowIso,
        updated_at: nowIso,
      };
      db.profiles.push(targetProfile);
    }
    saveDatabase(db);

    // 2. Persist to Supabase PostgreSQL database
    let supabaseSaved = false;
    let supabaseError: any = null;

    if (isSupabaseConfigured && supabase) {
      try {
        const payload: Record<string, any> = {
          id: effectiveId,
          full_name: targetProfile.full_name,
          email: targetProfile.email,
          role: targetProfile.role,
          status: targetProfile.status,
          avatar_url: targetProfile.avatar_url || null,
          updated_at: nowIso,
        };

        // Remove undefined keys
        Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

        // Upsert into Supabase profiles table
        const { data, error } = await supabase
          .from('profiles')
          .upsert(payload, { onConflict: 'id' })
          .select()
          .maybeSingle();

        if (error) {
          console.warn('[dataStore] Supabase profiles upsert notice:', error);
          supabaseError = error;

          // Secondary attempt: standard update in case upsert was restricted
          const { data: updateData, error: updateError } = await supabase
            .from('profiles')
            .update({
              full_name: targetProfile.full_name,
              avatar_url: targetProfile.avatar_url || null,
              role: targetProfile.role,
              status: targetProfile.status,
              updated_at: nowIso,
            })
            .eq('id', effectiveId)
            .select()
            .maybeSingle();

          if (!updateError && updateData) {
            targetProfile = { ...targetProfile, ...updateData };
            supabaseSaved = true;
            supabaseError = null;
          }
        } else if (data) {
          targetProfile = { ...targetProfile, ...data };
          supabaseSaved = true;
        }
      } catch (err: any) {
        console.error('[dataStore] Supabase profile sync exception:', err);
        supabaseError = err;
      }
    }

    // 3. Sync returned row back to local db
    const finalIdx = db.profiles.findIndex((p) => p.id === effectiveId);
    if (finalIdx !== -1) {
      db.profiles[finalIdx] = { ...db.profiles[finalIdx], ...targetProfile };
      saveDatabase(db);
    }

    // 4. Audit log
    await this.addAuditLog(effectiveId, 'UPDATE_PROFILE', 'profiles', effectiveId, {
      full_name: targetProfile.full_name,
      avatar_url: targetProfile.avatar_url,
      supabaseSaved,
      supabaseError: supabaseError?.message,
    });

    // Notify listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fintrack_profile_updated', { detail: targetProfile }));
    }

    if (supabaseError && !supabaseSaved) {
      (targetProfile as any)._dbSyncWarning = supabaseError.message || 'Gagal menyimpan ke database Supabase';
    }

    return targetProfile;
  },

  async createUser(payload: {
    username: string;
    full_name: string;
    password: string;
    role: UserRole;
    status: UserStatus;
    email?: string;
    avatar_url?: string;
    phone?: string;
    notes?: string;
  }): Promise<Profile> {
    const db = loadDatabase();
    const cleanUsername = (payload.username || '').trim().toLowerCase().replace(/\s+/g, '');

    if (!cleanUsername || cleanUsername.length < 3) {
      throw new Error('Username minimal 3 karakter (tanpa spasi).');
    }

    // Periksa apakah username sudah digunakan
    const existingUser = db.profiles.find((p) => p.username?.trim().toLowerCase() === cleanUsername);
    if (existingUser) {
      throw new Error(`Username "${cleanUsername}" sudah digunakan oleh akun lain.`);
    }

    const cleanEmail = payload.email?.trim().toLowerCase() || undefined;
    if (cleanEmail) {
      const existingEmail = db.profiles.find((p) => p.email?.trim().toLowerCase() === cleanEmail);
      if (existingEmail) {
        throw new Error(`Email ${cleanEmail} sudah digunakan oleh akun lain.`);
      }
    }

    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'usr-' + Date.now();
    const nowIso = new Date().toISOString();

    const newProfile: Profile = {
      id: newId,
      username: cleanUsername,
      email: cleanEmail,
      full_name: payload.full_name.trim(),
      password: payload.password,
      role: payload.role,
      status: payload.status,
      avatar_url: payload.avatar_url?.trim() || undefined,
      phone: payload.phone?.trim() || undefined,
      notes: payload.notes?.trim() || undefined,
      created_at: nowIso,
      updated_at: nowIso,
    };

    db.profiles.unshift(newProfile);
    saveDatabase(db);

    // Sync ke Supabase PostgreSQL profiles jika terhubung
    let supabaseSaved = false;
    let supabaseError: any = null;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .insert({
            id: newId,
            username: cleanUsername,
            email: cleanEmail || null,
            full_name: newProfile.full_name,
            role: newProfile.role,
            status: newProfile.status,
            avatar_url: newProfile.avatar_url || null,
            phone: newProfile.phone || null,
            notes: newProfile.notes || null,
            created_at: nowIso,
            updated_at: nowIso,
          })
          .select()
          .maybeSingle();

        if (error) {
          console.warn('[dataStore] Supabase createUser insert notice:', error);
          supabaseError = error;
        } else if (data) {
          supabaseSaved = true;
        }
      } catch (err: any) {
        console.error('[dataStore] Supabase createUser exception:', err);
        supabaseError = err;
      }
    }

    await this.addAuditLog(newId, 'CREATE_USER', 'profiles', newId, {
      username: cleanUsername,
      role: payload.role,
      status: payload.status,
      supabaseSaved,
      supabaseError: supabaseError?.message,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fintrack_profile_updated', { detail: newProfile }));
    }

    if (supabaseError && !supabaseSaved) {
      (newProfile as any)._dbSyncWarning = supabaseError.message;
    }

    return newProfile;
  },

  async deleteUser(userId: string, currentAdminId?: string): Promise<boolean> {
    if (userId === currentAdminId) {
      throw new Error('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.');
    }
    const db = loadDatabase();
    const targetIdx = db.profiles.findIndex((p) => p.id === userId);
    if (targetIdx === -1) {
      throw new Error('Pengguna tidak ditemukan.');
    }

    const removed = db.profiles.splice(targetIdx, 1)[0];
    saveDatabase(db);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('profiles').delete().eq('id', userId);
      } catch (err) {
        console.warn('[dataStore] Supabase deleteUser exception:', err);
      }
    }

    await this.addAuditLog(currentAdminId || 'system', 'DELETE_USER', 'profiles', userId, {
      deleted_email: removed.email,
      deleted_name: removed.full_name,
    });

    return true;
  },

  async resetUserPassword(userId: string, newPassword: string): Promise<boolean> {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password baru minimal 6 karakter.');
    }

    const db = loadDatabase();
    const idx = db.profiles.findIndex((p) => p.id === userId);
    if (idx === -1) {
      throw new Error('Pengguna tidak ditemukan.');
    }

    const nowIso = new Date().toISOString();
    db.profiles[idx] = {
      ...db.profiles[idx],
      password: newPassword,
      updated_at: nowIso,
    };
    saveDatabase(db);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('profiles')
          .update({ updated_at: nowIso })
          .eq('id', userId);
      } catch (err) {
        console.warn('[dataStore] Supabase resetUserPassword notice:', err);
      }
    }

    await this.addAuditLog(userId, 'RESET_PASSWORD', 'profiles', userId, {
      email: db.profiles[idx].email,
    });

    return true;
  },

  async authenticateUser(identifier: string, password?: string): Promise<Profile> {
    const cleanId = (identifier || '').trim().toLowerCase();
    if (!cleanId) {
      throw new Error('Masukkan username Anda untuk login.');
    }

    const profiles = await this.getProfiles();
    // Prioritas pencocokan berdasarkan username, lalu email jika ada
    const matched = profiles.find(
      (p) =>
        (p.username && p.username.trim().toLowerCase() === cleanId) ||
        (p.email && p.email.trim().toLowerCase() === cleanId)
    );

    if (!matched) {
      throw new Error(`Username "${identifier}" tidak terdaftar dalam sistem. Hubungi administrator.`);
    }

    if (matched.status === 'inactive') {
      throw new Error(`Akun dengan username "${matched.username || identifier}" dinonaktifkan oleh Administrator. Silakan hubungi admin.`);
    }

    // Verify password if user has password set
    if (matched.password && password) {
      if (matched.password !== password) {
        throw new Error(`Password untuk username "${matched.username || identifier}" salah. Periksa kembali huruf besar dan kecil.`);
      }
    } else if (matched.password && !password) {
      throw new Error('Masukkan password untuk login ke akun ini.');
    }

    // Update last login
    const nowIso = new Date().toISOString();
    await this.updateProfile(matched.id, { last_login_at: nowIso });
    matched.last_login_at = nowIso;

    return matched;
  },

  // Accounts (Rekening & Dompet)
  async getAccounts(userId: string): Promise<Account[]> {
    const effectiveUserId =
      userId === 'user-demo-1' ? DEFAULT_USER_ID : userId === 'admin-demo-1' ? DEFAULT_ADMIN_ID : userId;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('accounts')
          .select('*')
          .or(`user_id.eq.${effectiveUserId},user_id.eq.${userId}`)
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          const db = loadDatabase();
          data.forEach((remoteA: any) => {
            const parsed: Account = {
              ...remoteA,
              opening_balance: Number(remoteA.opening_balance) || 0,
            };
            const idx = db.accounts.findIndex((x) => x.id === parsed.id);
            if (idx !== -1) {
              db.accounts[idx] = { ...db.accounts[idx], ...parsed };
            } else {
              db.accounts.push(parsed);
            }
          });
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
          }
        }
      } catch (e) {
        console.warn('[dataStore] Supabase getAccounts notice:', e);
      }
    }

    const db = loadDatabase();
    const userAccounts = db.accounts.filter((a) => a.user_id === userId || a.user_id === effectiveUserId);
    const userTxs = db.transactions.filter((t) => t.user_id === userId || t.user_id === effectiveUserId);
    return calculateAccountBalances(userAccounts, userTxs);
  },

  async createAccount(account: Omit<Account, 'id' | 'created_at' | 'updated_at'>): Promise<Account> {
    const effectiveUserId =
      account.user_id === 'user-demo-1'
        ? DEFAULT_USER_ID
        : account.user_id === 'admin-demo-1'
        ? DEFAULT_ADMIN_ID
        : account.user_id;

    // Generate valid UUID to ensure PostgreSQL/Supabase compatibility
    const newId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : '00000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0');

    const nowIso = new Date().toISOString();
    const cleanOpeningBalance = Number(account.opening_balance) || 0;

    let newAccount: Account = {
      ...account,
      id: newId,
      user_id: effectiveUserId,
      name: account.name.trim(),
      type: account.type,
      opening_balance: cleanOpeningBalance,
      description: account.description ? account.description.trim() : '',
      is_active: account.is_active ?? true,
      created_at: nowIso,
      updated_at: nowIso,
      current_balance: cleanOpeningBalance,
    };

    let supabaseSaved = false;
    let supabaseError: any = null;

    if (isSupabaseConfigured && supabase) {
      try {
        const payload = {
          id: newAccount.id,
          user_id: effectiveUserId,
          name: newAccount.name,
          type: newAccount.type,
          opening_balance: cleanOpeningBalance,
          description: newAccount.description || null,
          is_active: newAccount.is_active,
        };

        const { data, error } = await supabase.from('accounts').insert(payload).select().maybeSingle();

        if (error) {
          console.warn('[dataStore] Supabase createAccount error:', error);
          supabaseError = error;
        } else if (data) {
          newAccount = {
            ...data,
            opening_balance: Number(data.opening_balance) || 0,
            current_balance: Number(data.opening_balance) || 0,
          };
          supabaseSaved = true;
        }
      } catch (e: any) {
        console.warn('[dataStore] Supabase createAccount exception:', e);
        supabaseError = e;
      }
    }

    if (supabaseError && !supabaseSaved) {
      if (supabaseError.code === '42501') {
        (newAccount as any)._dbSyncWarning =
          'Tersimpan lokal. RLS Supabase memblokir insert (error 42501). Jalankan skrip SQL perbaikan rekening di Pengaturan.';
      } else {
        (newAccount as any)._dbSyncWarning = supabaseError.message || 'Gagal menyimpan ke Supabase';
      }
    }

    const db = loadDatabase();
    db.accounts.push(newAccount);
    saveDatabase(db);

    await this.addAuditLog(effectiveUserId, 'CREATE_ACCOUNT', 'accounts', newAccount.id, {
      name: newAccount.name,
      type: newAccount.type,
      opening_balance: cleanOpeningBalance,
      supabaseSaved,
      supabaseError: supabaseError?.message,
    });

    return newAccount;
  },

  async updateAccount(accountId: string, updates: Partial<Account>): Promise<Account> {
    const nowIso = new Date().toISOString();
    let supabaseSaved = false;
    let supabaseError: any = null;

    // Filter clean updates for Supabase (exclude calculated fields like current_balance)
    const cleanUpdates: any = {
      updated_at: nowIso,
    };
    if (updates.name !== undefined) cleanUpdates.name = updates.name.trim();
    if (updates.type !== undefined) cleanUpdates.type = updates.type;
    if (updates.opening_balance !== undefined) cleanUpdates.opening_balance = Number(updates.opening_balance) || 0;
    if (updates.description !== undefined) cleanUpdates.description = updates.description ? updates.description.trim() : null;
    if (updates.is_active !== undefined) cleanUpdates.is_active = updates.is_active;

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('accounts').update(cleanUpdates).eq('id', accountId);
        if (error) {
          console.warn('[dataStore] Supabase updateAccount error:', error);
          supabaseError = error;
        } else {
          supabaseSaved = true;
        }
      } catch (e: any) {
        console.warn('[dataStore] Supabase updateAccount exception:', e);
        supabaseError = e;
      }
    }

    const db = loadDatabase();
    const idx = db.accounts.findIndex((a) => a.id === accountId);
    if (idx === -1) throw new Error('Rekening tidak ditemukan');

    db.accounts[idx] = {
      ...db.accounts[idx],
      ...updates,
      name: updates.name ? updates.name.trim() : db.accounts[idx].name,
      opening_balance:
        updates.opening_balance !== undefined ? Number(updates.opening_balance) || 0 : db.accounts[idx].opening_balance,
      description: updates.description !== undefined ? updates.description : db.accounts[idx].description,
      updated_at: nowIso,
    };

    if (supabaseError && !supabaseSaved) {
      (db.accounts[idx] as any)._dbSyncWarning =
        supabaseError.code === '42501'
          ? 'Tersimpan lokal. RLS Supabase memblokir update rekening (42501). Jalankan skrip SQL di Pengaturan.'
          : supabaseError.message || 'Gagal menyimpan pembaruan ke Supabase';
    } else {
      delete (db.accounts[idx] as any)._dbSyncWarning;
    }

    saveDatabase(db);
    await this.addAuditLog(db.accounts[idx].user_id, 'UPDATE_ACCOUNT', 'accounts', accountId, {
      ...updates,
      supabaseSaved,
      supabaseError: supabaseError?.message,
    });

    return db.accounts[idx];
  },

  async deleteAccount(accountId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('accounts').delete().eq('id', accountId);
        if (error) {
          console.warn('[dataStore] Supabase deleteAccount error:', error);
        }
      } catch (e) {
        console.warn('[dataStore] Supabase deleteAccount notice:', e);
      }
    }

    const db = loadDatabase();
    const account = db.accounts.find((a) => a.id === accountId);
    if (!account) return;

    db.accounts = db.accounts.filter((a) => a.id !== accountId);

    // Clean references in transactions to prevent dangling ids
    db.transactions = db.transactions.map((tx) => {
      let updated = false;
      const mod = { ...tx };
      if (mod.account_id === accountId) {
        mod.account_id = null as any;
        updated = true;
      }
      if (mod.destination_account_id === accountId) {
        mod.destination_account_id = null as any;
        updated = true;
      }
      return updated ? mod : tx;
    });

    saveDatabase(db);
    await this.addAuditLog(account.user_id, 'DELETE_ACCOUNT', 'accounts', accountId, { name: account.name });
  },

  // Categories
  async getCategories(userId: string): Promise<Category[]> {
    const effectiveUserId =
      userId === 'user-demo-1' ? DEFAULT_USER_ID : userId === 'admin-demo-1' ? DEFAULT_ADMIN_ID : userId;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .or(`user_id.eq.${effectiveUserId},user_id.is.null`)
          .order('name', { ascending: true });

        if (!error && data && data.length > 0) {
          const db = loadDatabase();
          data.forEach((remoteC: any) => {
            const idx = db.categories.findIndex((x) => x.id === remoteC.id || x.name === remoteC.name);
            if (idx !== -1) {
              db.categories[idx] = { ...db.categories[idx], ...remoteC };
            } else {
              db.categories.push(remoteC);
            }
          });
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
          }
        }
      } catch (e) {
        console.warn('[dataStore] Supabase getCategories notice:', e);
      }
    }

    const db = loadDatabase();
    return db.categories.filter((c) => !c.user_id || c.user_id === userId || c.user_id === effectiveUserId);
  },

  async createCategory(cat: Omit<Category, 'id' | 'created_at'>): Promise<Category> {
    const newId = generateUUID();
    const nowIso = new Date().toISOString();
    let newCat: Category = {
      ...cat,
      id: newId,
      created_at: nowIso,
      updated_at: nowIso,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const payload: any = {
          id: newId,
          name: cat.name.trim(),
          type: cat.type,
          icon: cat.icon || null,
          is_active: cat.is_active ?? true,
          user_id: cat.user_id || null,
        };
        const { data, error } = await supabase.from('categories').insert(payload).select().maybeSingle();
        if (!error && data) {
          newCat = { ...newCat, ...data };
        } else if (error) {
          console.warn('[dataStore] Supabase createCategory notice:', error);
        }
      } catch (e) {
        console.warn('[dataStore] Supabase createCategory exception:', e);
      }
    }

    const db = loadDatabase();
    db.categories.push(newCat);
    saveDatabase(db);
    return newCat;
  },

  async updateCategory(categoryId: string, updates: Partial<Category>): Promise<Category> {
    const nowIso = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      try {
        const cleanUpdates: any = { ...updates, updated_at: nowIso };
        delete cleanUpdates.id;
        await supabase.from('categories').update(cleanUpdates).eq('id', categoryId);
      } catch (e) {
        console.warn('[dataStore] Supabase updateCategory notice:', e);
      }
    }

    const db = loadDatabase();
    const idx = db.categories.findIndex((c) => c.id === categoryId);
    if (idx === -1) throw new Error('Kategori tidak ditemukan');
    db.categories[idx] = {
      ...db.categories[idx],
      ...updates,
      updated_at: nowIso,
    };
    saveDatabase(db);
    return db.categories[idx];
  },

  async deleteCategory(categoryId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('categories').delete().eq('id', categoryId);
      } catch (e) {
        console.warn('[dataStore] Supabase deleteCategory notice:', e);
      }
    }

    const db = loadDatabase();
    db.categories = db.categories.filter((c) => c.id !== categoryId);
    saveDatabase(db);
  },

  // Transactions
  async getTransactions(userId: string): Promise<Transaction[]> {
    const effectiveUserId =
      userId === 'user-demo-1' ? DEFAULT_USER_ID : userId === 'admin-demo-1' ? DEFAULT_ADMIN_ID : userId;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*, transaction_items(*)')
          .or(`user_id.eq.${effectiveUserId},user_id.eq.${userId}`)
          .order('transaction_date', { ascending: false });

        if (!error && data && data.length > 0) {
          const db = loadDatabase();
          data.forEach((remoteTx: any) => {
            const parsed: Transaction = {
              id: remoteTx.id,
              user_id: remoteTx.user_id,
              account_id: remoteTx.account_id || undefined,
              destination_account_id: remoteTx.destination_account_id || undefined,
              category_id: remoteTx.category_id || undefined,
              type: remoteTx.type,
              amount: Number(remoteTx.amount) || 0,
              transaction_date: remoteTx.transaction_date,
              description: remoteTx.description || undefined,
              payment_method: remoteTx.payment_method || undefined,
              source: remoteTx.source || 'manual',
              receipt_id: remoteTx.receipt_id || undefined,
              notes: remoteTx.notes || undefined,
              created_at: remoteTx.created_at,
              updated_at: remoteTx.updated_at,
            };

            const idx = db.transactions.findIndex((x) => x.id === parsed.id);
            if (idx !== -1) {
              db.transactions[idx] = { ...db.transactions[idx], ...parsed };
            } else {
              db.transactions.push(parsed);
            }

            if (remoteTx.transaction_items && Array.isArray(remoteTx.transaction_items)) {
              remoteTx.transaction_items.forEach((item: any) => {
                const itemIdx = db.transaction_items.findIndex((x) => x.id === item.id);
                const parsedItem: TransactionItem = {
                  id: item.id,
                  transaction_id: item.transaction_id,
                  name: item.name,
                  quantity: Number(item.quantity) || 1,
                  unit_price: Number(item.unit_price) || 0,
                  subtotal: Number(item.subtotal) || 0,
                  created_at: item.created_at,
                };
                if (itemIdx !== -1) {
                  db.transaction_items[itemIdx] = parsedItem;
                } else {
                  db.transaction_items.push(parsedItem);
                }
              });
            }
          });

          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
          }
        }
      } catch (e) {
        console.warn('[dataStore] Supabase getTransactions notice:', e);
      }
    }

    const db = loadDatabase();
    const txs = db.transactions.filter((t) => t.user_id === userId || t.user_id === effectiveUserId);
    const accounts = db.accounts.filter((a) => a.user_id === userId || a.user_id === effectiveUserId);
    const categories = db.categories;

    return txs
      .map((t) => ({
        ...t,
        category: categories.find((c) => c.id === t.category_id),
        account: accounts.find((a) => a.id === t.account_id),
        destination_account: t.destination_account_id ? accounts.find((a) => a.id === t.destination_account_id) : undefined,
        items: db.transaction_items.filter((item) => item.transaction_id === t.id),
      }))
      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  },

  async createTransaction(tx: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>, items?: Omit<TransactionItem, 'id' | 'transaction_id'>[]): Promise<Transaction> {
    const effectiveUserId =
      tx.user_id === 'user-demo-1' ? DEFAULT_USER_ID : tx.user_id === 'admin-demo-1' ? DEFAULT_ADMIN_ID : tx.user_id;

    const newTxId = generateUUID();
    const nowIso = new Date().toISOString();
    let newTx: Transaction = {
      ...tx,
      id: newTxId,
      user_id: effectiveUserId,
      amount: Number(tx.amount) || 0,
      created_at: nowIso,
      updated_at: nowIso,
    };

    let supabaseSaved = false;
    let supabaseError: any = null;

    if (isSupabaseConfigured && supabase) {
      try {
        const payload: Record<string, any> = {
          id: newTxId,
          user_id: effectiveUserId,
          account_id: tx.account_id || null,
          destination_account_id: tx.destination_account_id || null,
          category_id: tx.category_id || null,
          type: tx.type,
          amount: Number(tx.amount) || 0,
          transaction_date: tx.transaction_date,
          description: tx.description || null,
          payment_method: tx.payment_method || null,
          source: tx.source || 'manual',
          receipt_id: tx.receipt_id || null,
          notes: tx.notes || null,
        };

        const { data, error } = await supabase.from('transactions').insert(payload).select().maybeSingle();

        if (error) {
          console.warn('[dataStore] Supabase createTransaction notice:', error);
          supabaseError = error;
        } else if (data) {
          newTx = {
            ...newTx,
            id: data.id,
            amount: Number(data.amount) || newTx.amount,
          };
          supabaseSaved = true;

          if (items && items.length > 0) {
            const itemsPayload = items.map((it) => ({
              id: generateUUID(),
              transaction_id: data.id,
              name: it.name,
              quantity: Number(it.quantity) || 1,
              unit_price: Number(it.unit_price) || 0,
              subtotal: Number(it.subtotal) || 0,
            }));
            await supabase.from('transaction_items').insert(itemsPayload);
          }
        }
      } catch (e: any) {
        console.warn('[dataStore] Supabase createTransaction exception:', e);
        supabaseError = e;
      }
    }

    const db = loadDatabase();
    db.transactions.unshift(newTx);

    if (items && items.length > 0) {
      items.forEach((item) => {
        db.transaction_items.push({
          id: generateUUID(),
          transaction_id: newTx.id,
          name: item.name,
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unit_price) || 0,
          subtotal: Number(item.subtotal) || 0,
          created_at: nowIso,
        });
      });
    }

    saveDatabase(db);
    await this.addAuditLog(effectiveUserId, 'CREATE_TRANSACTION', 'transactions', newTx.id, {
      type: tx.type,
      amount: tx.amount,
      description: tx.description,
      supabaseSaved,
      supabaseError: supabaseError?.message,
    });
    return newTx;
  },

  async updateTransaction(txId: string, updates: Partial<Transaction>): Promise<Transaction> {
    const nowIso = new Date().toISOString();
    let supabaseSaved = false;
    let supabaseError: any = null;

    if (isSupabaseConfigured && supabase) {
      try {
        const cleanUpdates: Record<string, any> = {
          updated_at: nowIso,
        };
        if (updates.account_id !== undefined) cleanUpdates.account_id = updates.account_id || null;
        if (updates.destination_account_id !== undefined) cleanUpdates.destination_account_id = updates.destination_account_id || null;
        if (updates.category_id !== undefined) cleanUpdates.category_id = updates.category_id || null;
        if (updates.type !== undefined) cleanUpdates.type = updates.type;
        if (updates.amount !== undefined) cleanUpdates.amount = Number(updates.amount) || 0;
        if (updates.transaction_date !== undefined) cleanUpdates.transaction_date = updates.transaction_date;
        if (updates.description !== undefined) cleanUpdates.description = updates.description || null;
        if (updates.payment_method !== undefined) cleanUpdates.payment_method = updates.payment_method || null;
        if (updates.source !== undefined) cleanUpdates.source = updates.source;
        if (updates.notes !== undefined) cleanUpdates.notes = updates.notes || null;

        const { error } = await supabase.from('transactions').update(cleanUpdates).eq('id', txId);
        if (error) {
          console.warn('[dataStore] Supabase updateTransaction error:', error);
          supabaseError = error;
        } else {
          supabaseSaved = true;
        }
      } catch (e: any) {
        console.warn('[dataStore] Supabase updateTransaction exception:', e);
        supabaseError = e;
      }
    }

    const db = loadDatabase();
    const idx = db.transactions.findIndex((t) => t.id === txId);
    if (idx === -1) throw new Error('Transaksi tidak ditemukan');
    db.transactions[idx] = {
      ...db.transactions[idx],
      ...updates,
      amount: updates.amount !== undefined ? Number(updates.amount) || 0 : db.transactions[idx].amount,
      updated_at: nowIso,
    };
    saveDatabase(db);
    await this.addAuditLog(db.transactions[idx].user_id, 'UPDATE_TRANSACTION', 'transactions', txId, {
      ...updates,
      supabaseSaved,
      supabaseError: supabaseError?.message,
    });
    return db.transactions[idx];
  },

  async deleteTransaction(txId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('transaction_items').delete().eq('transaction_id', txId);
        await supabase.from('transactions').delete().eq('id', txId);
      } catch (e) {
        console.warn('[dataStore] Supabase deleteTransaction notice:', e);
      }
    }

    const db = loadDatabase();
    const tx = db.transactions.find((t) => t.id === txId);
    if (!tx) return;
    db.transactions = db.transactions.filter((t) => t.id !== txId);
    db.transaction_items = db.transaction_items.filter((item) => item.transaction_id !== txId);
    saveDatabase(db);
    await this.addAuditLog(tx.user_id, 'DELETE_TRANSACTION', 'transactions', txId, { description: tx.description, amount: tx.amount });
  },

  // Debts
  async getDebts(userId: string): Promise<Debt[]> {
    const effectiveUserId =
      userId === 'user-demo-1' ? DEFAULT_USER_ID : userId === 'admin-demo-1' ? DEFAULT_ADMIN_ID : userId;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('debts')
          .select('*, debt_payments(*)')
          .or(`user_id.eq.${effectiveUserId},user_id.eq.${userId}`)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const db = loadDatabase();
          data.forEach((remoteD: any) => {
            const parsedDebt: Debt = {
              id: remoteD.id,
              user_id: remoteD.user_id,
              person_name: remoteD.person_name,
              description: remoteD.description || undefined,
              amount: Number(remoteD.amount) || 0,
              remaining_amount: Number(remoteD.remaining_amount) || 0,
              transaction_date: remoteD.transaction_date,
              due_date: remoteD.due_date || undefined,
              status: remoteD.status,
              notes: remoteD.notes || undefined,
              created_at: remoteD.created_at,
              updated_at: remoteD.updated_at,
            };

            const idx = db.debts.findIndex((x) => x.id === parsedDebt.id);
            if (idx !== -1) {
              db.debts[idx] = { ...db.debts[idx], ...parsedDebt };
            } else {
              db.debts.push(parsedDebt);
            }

            if (remoteD.debt_payments && Array.isArray(remoteD.debt_payments)) {
              remoteD.debt_payments.forEach((p: any) => {
                const pIdx = db.debt_payments.findIndex((x) => x.id === p.id);
                const parsedPayment: DebtPayment = {
                  id: p.id,
                  debt_id: p.debt_id,
                  account_id: p.account_id || undefined,
                  amount: Number(p.amount) || 0,
                  payment_date: p.payment_date,
                  notes: p.notes || undefined,
                  created_at: p.created_at,
                };
                if (pIdx !== -1) {
                  db.debt_payments[pIdx] = parsedPayment;
                } else {
                  db.debt_payments.push(parsedPayment);
                }
              });
            }
          });

          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
          }
        }
      } catch (e) {
        console.warn('[dataStore] Supabase getDebts notice:', e);
      }
    }

    const db = loadDatabase();
    const accounts = db.accounts.filter((a) => a.user_id === userId || a.user_id === effectiveUserId);
    return db.debts
      .filter((d) => d.user_id === userId || d.user_id === effectiveUserId)
      .map((debt) => {
        const payments = db.debt_payments
          .filter((p) => p.debt_id === debt.id)
          .map((p) => ({
            ...p,
            account: accounts.find((a) => a.id === p.account_id),
          }));

        // Dynamically compute remaining and status
        const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount), 0);
        const rem = Math.max(0, Number(debt.amount) - totalPaid);
        let status = debt.status;
        if (rem === 0) {
          status = 'paid';
        } else if (rem < debt.amount) {
          status = 'partial';
        } else if (debt.due_date && new Date(debt.due_date) < new Date()) {
          status = 'overdue';
        } else {
          status = 'unpaid';
        }

        return {
          ...debt,
          remaining_amount: rem,
          status,
          payments,
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async createDebt(debt: Omit<Debt, 'id' | 'remaining_amount' | 'status' | 'created_at' | 'updated_at'>): Promise<Debt> {
    const effectiveUserId =
      debt.user_id === 'user-demo-1' ? DEFAULT_USER_ID : debt.user_id === 'admin-demo-1' ? DEFAULT_ADMIN_ID : debt.user_id;

    const newId = generateUUID();
    const nowIso = new Date().toISOString();
    const cleanAmount = Number(debt.amount) || 0;

    let newDebt: Debt = {
      ...debt,
      id: newId,
      user_id: effectiveUserId,
      amount: cleanAmount,
      remaining_amount: cleanAmount,
      status: 'unpaid',
      created_at: nowIso,
      updated_at: nowIso,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const payload: Record<string, any> = {
          id: newId,
          user_id: effectiveUserId,
          person_name: debt.person_name.trim(),
          description: debt.description ? debt.description.trim() : null,
          amount: cleanAmount,
          remaining_amount: cleanAmount,
          transaction_date: debt.transaction_date,
          due_date: debt.due_date || null,
          status: 'unpaid',
          notes: debt.notes ? debt.notes.trim() : null,
        };
        const { data, error } = await supabase.from('debts').insert(payload).select().maybeSingle();
        if (!error && data) {
          newDebt = {
            ...newDebt,
            id: data.id,
            amount: Number(data.amount) || newDebt.amount,
            remaining_amount: Number(data.remaining_amount) || newDebt.remaining_amount,
          };
        } else if (error) {
          console.warn('[dataStore] Supabase createDebt notice:', error);
        }
      } catch (e) {
        console.warn('[dataStore] Supabase createDebt exception:', e);
      }
    }

    const db = loadDatabase();
    db.debts.unshift(newDebt);
    saveDatabase(db);
    await this.addAuditLog(effectiveUserId, 'CREATE_DEBT', 'debts', newDebt.id, { person: debt.person_name, amount: debt.amount });
    return newDebt;
  },

  async updateDebt(debtId: string, updates: Partial<Debt>): Promise<Debt> {
    const nowIso = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      try {
        const cleanUpdates: Record<string, any> = { updated_at: nowIso };
        if (updates.person_name !== undefined) cleanUpdates.person_name = updates.person_name;
        if (updates.description !== undefined) cleanUpdates.description = updates.description || null;
        if (updates.amount !== undefined) cleanUpdates.amount = Number(updates.amount) || 0;
        if (updates.remaining_amount !== undefined) cleanUpdates.remaining_amount = Number(updates.remaining_amount) || 0;
        if (updates.transaction_date !== undefined) cleanUpdates.transaction_date = updates.transaction_date;
        if (updates.due_date !== undefined) cleanUpdates.due_date = updates.due_date || null;
        if (updates.status !== undefined) cleanUpdates.status = updates.status;
        if (updates.notes !== undefined) cleanUpdates.notes = updates.notes || null;

        await supabase.from('debts').update(cleanUpdates).eq('id', debtId);
      } catch (e) {
        console.warn('[dataStore] Supabase updateDebt notice:', e);
      }
    }

    const db = loadDatabase();
    const idx = db.debts.findIndex((d) => d.id === debtId);
    if (idx === -1) throw new Error('Data hutang tidak ditemukan');
    db.debts[idx] = {
      ...db.debts[idx],
      ...updates,
      updated_at: nowIso,
    };
    saveDatabase(db);
    return db.debts[idx];
  },

  async deleteDebt(debtId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('debt_payments').delete().eq('debt_id', debtId);
        await supabase.from('debts').delete().eq('id', debtId);
      } catch (e) {
        console.warn('[dataStore] Supabase deleteDebt notice:', e);
      }
    }

    const db = loadDatabase();
    const debt = db.debts.find((d) => d.id === debtId);
    if (!debt) return;
    db.debts = db.debts.filter((d) => d.id !== debtId);
    db.debt_payments = db.debt_payments.filter((p) => p.debt_id !== debtId);
    saveDatabase(db);
    await this.addAuditLog(debt.user_id, 'DELETE_DEBT', 'debts', debtId, { person: debt.person_name });
  },

  async payDebt(debtId: string, payment: { account_id?: string; amount: number; payment_date: string; notes?: string; user_id: string }): Promise<void> {
    const effectiveUserId =
      payment.user_id === 'user-demo-1' ? DEFAULT_USER_ID : payment.user_id === 'admin-demo-1' ? DEFAULT_ADMIN_ID : payment.user_id;

    const db = loadDatabase();
    const debt = db.debts.find((d) => d.id === debtId);
    if (!debt) throw new Error('Data hutang tidak ditemukan');

    // Calculate current remaining amount
    const payments = db.debt_payments.filter((p) => p.debt_id === debtId);
    const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount), 0);
    const remaining = debt.amount - totalPaid;

    if (payment.amount > remaining) {
      throw new Error(`Pembayaran (Rp ${payment.amount}) melebihi sisa hutang (Rp ${remaining})`);
    }

    const newPaymentId = generateUUID();
    const nowIso = new Date().toISOString();

    db.debt_payments.push({
      id: newPaymentId,
      debt_id: debtId,
      account_id: payment.account_id,
      amount: payment.amount,
      payment_date: payment.payment_date,
      notes: payment.notes,
      created_at: nowIso,
    });

    const newRemaining = remaining - payment.amount;
    debt.remaining_amount = newRemaining;
    debt.status = newRemaining === 0 ? 'paid' : 'partial';
    debt.updated_at = nowIso;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('debt_payments').insert({
          id: newPaymentId,
          debt_id: debtId,
          account_id: payment.account_id || null,
          amount: payment.amount,
          payment_date: payment.payment_date,
          notes: payment.notes || null,
        });

        await supabase.from('debts').update({
          remaining_amount: newRemaining,
          status: debt.status,
          updated_at: nowIso,
        }).eq('id', debtId);
      } catch (e) {
        console.warn('[dataStore] Supabase payDebt notice:', e);
      }
    }

    // If account_id provided, record expense transaction for this payment
    if (payment.account_id) {
      await this.createTransaction({
        user_id: effectiveUserId,
        account_id: payment.account_id,
        type: 'expense',
        amount: payment.amount,
        transaction_date: payment.payment_date,
        description: `Bayar Hutang: ${debt.person_name}`,
        notes: payment.notes,
        source: 'system',
      });
    }

    saveDatabase(db);
    await this.addAuditLog(effectiveUserId, 'PAY_DEBT', 'debts', debtId, { amount: payment.amount, remaining: newRemaining });
  },

  // Receivables (Piutang)
  async getReceivables(userId: string): Promise<Receivable[]> {
    const effectiveUserId =
      userId === 'user-demo-1' ? DEFAULT_USER_ID : userId === 'admin-demo-1' ? DEFAULT_ADMIN_ID : userId;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('receivables')
          .select('*, receivable_payments(*)')
          .or(`user_id.eq.${effectiveUserId},user_id.eq.${userId}`)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const db = loadDatabase();
          data.forEach((remoteR: any) => {
            const parsedRec: Receivable = {
              id: remoteR.id,
              user_id: remoteR.user_id,
              person_name: remoteR.person_name,
              description: remoteR.description || undefined,
              amount: Number(remoteR.amount) || 0,
              remaining_amount: Number(remoteR.remaining_amount) || 0,
              transaction_date: remoteR.transaction_date,
              due_date: remoteR.due_date || undefined,
              status: remoteR.status,
              notes: remoteR.notes || undefined,
              created_at: remoteR.created_at,
              updated_at: remoteR.updated_at,
            };

            const idx = db.receivables.findIndex((x) => x.id === parsedRec.id);
            if (idx !== -1) {
              db.receivables[idx] = { ...db.receivables[idx], ...parsedRec };
            } else {
              db.receivables.push(parsedRec);
            }

            if (remoteR.receivable_payments && Array.isArray(remoteR.receivable_payments)) {
              remoteR.receivable_payments.forEach((p: any) => {
                const pIdx = db.receivable_payments.findIndex((x) => x.id === p.id);
                const parsedPayment: ReceivablePayment = {
                  id: p.id,
                  receivable_id: p.receivable_id,
                  account_id: p.account_id || undefined,
                  amount: Number(p.amount) || 0,
                  payment_date: p.payment_date,
                  notes: p.notes || undefined,
                  created_at: p.created_at,
                };
                if (pIdx !== -1) {
                  db.receivable_payments[pIdx] = parsedPayment;
                } else {
                  db.receivable_payments.push(parsedPayment);
                }
              });
            }
          });

          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
          }
        }
      } catch (e) {
        console.warn('[dataStore] Supabase getReceivables notice:', e);
      }
    }

    const db = loadDatabase();
    const accounts = db.accounts.filter((a) => a.user_id === userId || a.user_id === effectiveUserId);
    return db.receivables
      .filter((r) => r.user_id === userId || r.user_id === effectiveUserId)
      .map((rec) => {
        const payments = db.receivable_payments
          .filter((p) => p.receivable_id === rec.id)
          .map((p) => ({
            ...p,
            account: accounts.find((a) => a.id === p.account_id),
          }));

        const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount), 0);
        const rem = Math.max(0, Number(rec.amount) - totalPaid);
        let status = rec.status;
        if (rem === 0) {
          status = 'paid';
        } else if (rem < rec.amount) {
          status = 'partial';
        } else if (rec.due_date && new Date(rec.due_date) < new Date()) {
          status = 'overdue';
        } else {
          status = 'unpaid';
        }

        return {
          ...rec,
          remaining_amount: rem,
          status,
          payments,
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async createReceivable(rec: Omit<Receivable, 'id' | 'remaining_amount' | 'status' | 'created_at' | 'updated_at'>): Promise<Receivable> {
    const effectiveUserId =
      rec.user_id === 'user-demo-1' ? DEFAULT_USER_ID : rec.user_id === 'admin-demo-1' ? DEFAULT_ADMIN_ID : rec.user_id;

    const newId = generateUUID();
    const nowIso = new Date().toISOString();
    const cleanAmount = Number(rec.amount) || 0;

    let newRec: Receivable = {
      ...rec,
      id: newId,
      user_id: effectiveUserId,
      amount: cleanAmount,
      remaining_amount: cleanAmount,
      status: 'unpaid',
      created_at: nowIso,
      updated_at: nowIso,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const payload: Record<string, any> = {
          id: newId,
          user_id: effectiveUserId,
          person_name: rec.person_name.trim(),
          description: rec.description ? rec.description.trim() : null,
          amount: cleanAmount,
          remaining_amount: cleanAmount,
          transaction_date: rec.transaction_date,
          due_date: rec.due_date || null,
          status: 'unpaid',
          notes: rec.notes ? rec.notes.trim() : null,
        };
        const { data, error } = await supabase.from('receivables').insert(payload).select().maybeSingle();
        if (!error && data) {
          newRec = {
            ...newRec,
            id: data.id,
            amount: Number(data.amount) || newRec.amount,
            remaining_amount: Number(data.remaining_amount) || newRec.remaining_amount,
          };
        } else if (error) {
          console.warn('[dataStore] Supabase createReceivable notice:', error);
        }
      } catch (e) {
        console.warn('[dataStore] Supabase createReceivable exception:', e);
      }
    }

    const db = loadDatabase();
    db.receivables.unshift(newRec);
    saveDatabase(db);
    await this.addAuditLog(effectiveUserId, 'CREATE_RECEIVABLE', 'receivables', newRec.id, { person: rec.person_name, amount: rec.amount });
    return newRec;
  },

  async updateReceivable(recId: string, updates: Partial<Receivable>): Promise<Receivable> {
    const nowIso = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      try {
        const cleanUpdates: Record<string, any> = { updated_at: nowIso };
        if (updates.person_name !== undefined) cleanUpdates.person_name = updates.person_name;
        if (updates.description !== undefined) cleanUpdates.description = updates.description || null;
        if (updates.amount !== undefined) cleanUpdates.amount = Number(updates.amount) || 0;
        if (updates.remaining_amount !== undefined) cleanUpdates.remaining_amount = Number(updates.remaining_amount) || 0;
        if (updates.transaction_date !== undefined) cleanUpdates.transaction_date = updates.transaction_date;
        if (updates.due_date !== undefined) cleanUpdates.due_date = updates.due_date || null;
        if (updates.status !== undefined) cleanUpdates.status = updates.status;
        if (updates.notes !== undefined) cleanUpdates.notes = updates.notes || null;

        await supabase.from('receivables').update(cleanUpdates).eq('id', recId);
      } catch (e) {
        console.warn('[dataStore] Supabase updateReceivable notice:', e);
      }
    }

    const db = loadDatabase();
    const idx = db.receivables.findIndex((r) => r.id === recId);
    if (idx === -1) throw new Error('Data piutang tidak ditemukan');
    db.receivables[idx] = {
      ...db.receivables[idx],
      ...updates,
      updated_at: nowIso,
    };
    saveDatabase(db);
    return db.receivables[idx];
  },

  async deleteReceivable(recId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('receivable_payments').delete().eq('receivable_id', recId);
        await supabase.from('receivables').delete().eq('id', recId);
      } catch (e) {
        console.warn('[dataStore] Supabase deleteReceivable notice:', e);
      }
    }

    const db = loadDatabase();
    const rec = db.receivables.find((r) => r.id === recId);
    if (!rec) return;
    db.receivables = db.receivables.filter((r) => r.id !== recId);
    db.receivable_payments = db.receivable_payments.filter((p) => p.receivable_id !== recId);
    saveDatabase(db);
    await this.addAuditLog(rec.user_id, 'DELETE_RECEIVABLE', 'receivables', recId, { person: rec.person_name });
  },

  async payReceivable(recId: string, payment: { account_id?: string; amount: number; payment_date: string; notes?: string; user_id: string }): Promise<void> {
    const effectiveUserId =
      payment.user_id === 'user-demo-1' ? DEFAULT_USER_ID : payment.user_id === 'admin-demo-1' ? DEFAULT_ADMIN_ID : payment.user_id;

    const db = loadDatabase();
    const rec = db.receivables.find((r) => r.id === recId);
    if (!rec) throw new Error('Data piutang tidak ditemukan');

    const payments = db.receivable_payments.filter((p) => p.receivable_id === recId);
    const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount), 0);
    const remaining = rec.amount - totalPaid;

    if (payment.amount > remaining) {
      throw new Error(`Pembayaran (Rp ${payment.amount}) melebihi sisa piutang (Rp ${remaining})`);
    }

    const newPaymentId = generateUUID();
    const nowIso = new Date().toISOString();

    db.receivable_payments.push({
      id: newPaymentId,
      receivable_id: recId,
      account_id: payment.account_id,
      amount: payment.amount,
      payment_date: payment.payment_date,
      notes: payment.notes,
      created_at: nowIso,
    });

    const newRemaining = remaining - payment.amount;
    rec.remaining_amount = newRemaining;
    rec.status = newRemaining === 0 ? 'paid' : 'partial';
    rec.updated_at = nowIso;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('receivable_payments').insert({
          id: newPaymentId,
          receivable_id: recId,
          account_id: payment.account_id || null,
          amount: payment.amount,
          payment_date: payment.payment_date,
          notes: payment.notes || null,
        });

        await supabase.from('receivables').update({
          remaining_amount: newRemaining,
          status: rec.status,
          updated_at: nowIso,
        }).eq('id', recId);
      } catch (e) {
        console.warn('[dataStore] Supabase payReceivable notice:', e);
      }
    }

    // If account_id provided, record income transaction for receivable paid to user
    if (payment.account_id) {
      await this.createTransaction({
        user_id: effectiveUserId,
        account_id: payment.account_id,
        type: 'income',
        amount: payment.amount,
        transaction_date: payment.payment_date,
        description: `Terima Piutang: ${rec.person_name}`,
        notes: payment.notes,
        source: 'system',
      });
    }

    saveDatabase(db);
    await this.addAuditLog(effectiveUserId, 'PAY_RECEIVABLE', 'receivables', recId, { amount: payment.amount, remaining: newRemaining });
  },

  // Saving Goals (Target Tabungan)
  async getSavingGoals(userId: string): Promise<SavingGoal[]> {
    const db = loadDatabase();
    const accounts = db.accounts.filter((a) => a.user_id === userId);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('saving_goals')
          .select('*, saving_goal_transactions(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((g: any) => {
            const currentAmount = Number(g.current_amount || 0);
            const targetAmount = Number(g.target_amount || 0);
            const isCompleted = currentAmount >= targetAmount && targetAmount > 0;
            return {
              id: g.id,
              user_id: g.user_id,
              name: g.name,
              target_amount: targetAmount,
              current_amount: currentAmount,
              target_date: g.target_date,
              description: g.description,
              status: isCompleted ? 'completed' : g.status || 'active',
              created_at: g.created_at,
              updated_at: g.updated_at,
              transactions: (g.saving_goal_transactions || []).map((t: any) => ({
                ...t,
                amount: Number(t.amount),
                account: accounts.find((a) => a.id === t.account_id),
              })),
            };
          });
        }
      } catch (e) {
        console.warn('Supabase getSavingGoals error, using local data:', e);
      }
    }

    return db.saving_goals
      .filter((g) => g.user_id === userId)
      .map((goal) => {
        const txs = db.saving_goal_transactions
          .filter((t) => t.saving_goal_id === goal.id)
          .map((t) => ({
            ...t,
            account: accounts.find((a) => a.id === t.account_id),
          }));

        // Exact running balance calculation without double counting
        const currentAmount = Number(goal.current_amount || 0);
        const targetAmount = Number(goal.target_amount || 0);
        const isCompleted = currentAmount >= targetAmount && targetAmount > 0;
        const status = isCompleted ? 'completed' : goal.status || 'active';

        return {
          ...goal,
          target_amount: targetAmount,
          current_amount: currentAmount,
          status,
          transactions: txs,
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async createSavingGoal(goal: Omit<SavingGoal, 'id' | 'current_amount' | 'status' | 'created_at' | 'updated_at'>): Promise<SavingGoal> {
    const effectiveUserId =
      goal.user_id === 'user-demo-1' ? DEFAULT_USER_ID : goal.user_id === 'admin-demo-1' ? DEFAULT_ADMIN_ID : goal.user_id;

    const newId = generateUUID();
    const nowIso = new Date().toISOString();
    const cleanTargetAmount = Number(goal.target_amount) || 0;

    let newGoal: SavingGoal = {
      ...goal,
      id: newId,
      user_id: effectiveUserId,
      target_amount: cleanTargetAmount,
      current_amount: 0,
      status: 'active',
      created_at: nowIso,
      updated_at: nowIso,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const payload: Record<string, any> = {
          id: newId,
          user_id: effectiveUserId,
          name: goal.name.trim(),
          target_amount: cleanTargetAmount,
          current_amount: 0,
          target_date: goal.target_date || null,
          description: goal.description ? goal.description.trim() : null,
          status: 'active',
        };
        const { data, error } = await supabase.from('saving_goals').insert(payload).select().maybeSingle();

        if (!error && data) {
          newGoal = {
            id: data.id,
            user_id: data.user_id,
            name: data.name,
            target_amount: Number(data.target_amount),
            current_amount: Number(data.current_amount || 0),
            target_date: data.target_date,
            description: data.description,
            status: data.status,
            created_at: data.created_at,
            updated_at: data.updated_at,
          };
        } else if (error) {
          console.warn('[dataStore] Supabase createSavingGoal notice:', error);
        }
      } catch (e) {
        console.warn('[dataStore] Supabase createSavingGoal exception:', e);
      }
    }

    const db = loadDatabase();
    db.saving_goals.unshift(newGoal);
    saveDatabase(db);
    await this.addAuditLog(effectiveUserId, 'CREATE_SAVING_GOAL', 'saving_goals', newGoal.id, { name: goal.name, target: goal.target_amount });
    return newGoal;
  },

  async updateSavingGoal(goalId: string, updates: Partial<SavingGoal>): Promise<SavingGoal> {
    const nowIso = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      try {
        const cleanUpdates: Record<string, any> = { updated_at: nowIso };
        if (updates.name !== undefined) cleanUpdates.name = updates.name.trim();
        if (updates.target_amount !== undefined) cleanUpdates.target_amount = Number(updates.target_amount) || 0;
        if (updates.current_amount !== undefined) cleanUpdates.current_amount = Number(updates.current_amount) || 0;
        if (updates.target_date !== undefined) cleanUpdates.target_date = updates.target_date || null;
        if (updates.description !== undefined) cleanUpdates.description = updates.description || null;
        if (updates.status !== undefined) cleanUpdates.status = updates.status;

        await supabase.from('saving_goals').update(cleanUpdates).eq('id', goalId);
      } catch (e) {
        console.warn('[dataStore] Supabase updateSavingGoal notice:', e);
      }
    }

    const db = loadDatabase();
    const idx = db.saving_goals.findIndex((g) => g.id === goalId);
    if (idx === -1) throw new Error('Target tabungan tidak ditemukan');
    db.saving_goals[idx] = {
      ...db.saving_goals[idx],
      ...updates,
      target_amount: updates.target_amount !== undefined ? Number(updates.target_amount) || 0 : db.saving_goals[idx].target_amount,
      current_amount: updates.current_amount !== undefined ? Number(updates.current_amount) || 0 : db.saving_goals[idx].current_amount,
      updated_at: nowIso,
    };
    saveDatabase(db);
    return db.saving_goals[idx];
  },

  async deleteSavingGoal(goalId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('saving_goal_transactions').delete().eq('saving_goal_id', goalId);
        await supabase.from('saving_goals').delete().eq('id', goalId);
      } catch (e) {
        console.warn('[dataStore] Supabase deleteSavingGoal notice:', e);
      }
    }

    const db = loadDatabase();
    const goal = db.saving_goals.find((g) => g.id === goalId);
    if (!goal) return;
    db.saving_goals = db.saving_goals.filter((g) => g.id !== goalId);
    db.saving_goal_transactions = db.saving_goal_transactions.filter((t) => t.saving_goal_id !== goalId);
    saveDatabase(db);
    await this.addAuditLog(goal.user_id, 'DELETE_SAVING_GOAL', 'saving_goals', goalId, { name: goal.name });
  },

  async contributeSavingGoal(goalId: string, payload: {
    account_id?: string;
    amount: number;
    type: 'deposit' | 'withdrawal';
    transaction_date: string;
    notes?: string;
    user_id: string;
  }): Promise<void> {
    const effectiveUserId =
      payload.user_id === 'user-demo-1' ? DEFAULT_USER_ID : payload.user_id === 'admin-demo-1' ? DEFAULT_ADMIN_ID : payload.user_id;

    const db = loadDatabase();
    const goal = db.saving_goals.find((g) => g.id === goalId);
    if (!goal) throw new Error('Target tabungan tidak ditemukan');

    const amountNum = Number(payload.amount);
    const currentNum = Number(goal.current_amount || 0);

    if (payload.type === 'withdrawal' && amountNum > currentNum) {
      throw new Error(`Nominal penarikan (Rp ${amountNum.toLocaleString('id-ID')}) melebihi saldo tabungan saat ini (Rp ${currentNum.toLocaleString('id-ID')})`);
    }

    const newAmount = payload.type === 'deposit'
      ? currentNum + amountNum
      : Math.max(0, currentNum - amountNum);

    const isCompleted = newAmount >= Number(goal.target_amount) && Number(goal.target_amount) > 0;
    const newStatus = isCompleted ? 'completed' : 'active';
    const nowIso = new Date().toISOString();

    goal.current_amount = newAmount;
    goal.status = newStatus;
    goal.updated_at = nowIso;

    const newTxId = generateUUID();
    db.saving_goal_transactions.unshift({
      id: newTxId,
      saving_goal_id: goalId,
      account_id: payload.account_id,
      type: payload.type,
      amount: amountNum,
      transaction_date: payload.transaction_date,
      notes: payload.notes,
      created_at: nowIso,
    });

    // Supabase cloud sync
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('saving_goal_transactions').insert({
          id: newTxId,
          saving_goal_id: goalId,
          account_id: payload.account_id || null,
          amount: amountNum,
          type: payload.type,
          transaction_date: payload.transaction_date,
          notes: payload.notes || null,
        });

        await supabase.from('saving_goals').update({
          current_amount: newAmount,
          status: newStatus,
          updated_at: nowIso,
        }).eq('id', goalId);
      } catch (e) {
        console.warn('[dataStore] Supabase contributeSavingGoal notice:', e);
      }
    }

    // If account_id provided, create corresponding transaction
    if (payload.account_id) {
      await this.createTransaction({
        user_id: effectiveUserId,
        account_id: payload.account_id,
        type: payload.type === 'deposit' ? 'expense' : 'income',
        amount: amountNum,
        transaction_date: payload.transaction_date,
        description: payload.type === 'deposit' ? `Setoran Tabungan: ${goal.name}` : `Tarik Tabungan: ${goal.name}`,
        notes: payload.notes,
        source: 'system',
      });
    }

    saveDatabase(db);
    await this.addAuditLog(effectiveUserId, 'UPDATE_SAVING_GOAL', 'saving_goals', goalId, {
      type: payload.type,
      amount: amountNum,
      newTotal: newAmount,
    });
  },

  // Receipts
  async getReceipts(userId: string): Promise<Receipt[]> {
    const effectiveUserId =
      userId === 'user-demo-1' ? DEFAULT_USER_ID : userId === 'admin-demo-1' ? DEFAULT_ADMIN_ID : userId;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('receipts')
          .select('*, receipt_items(*)')
          .or(`user_id.eq.${effectiveUserId},user_id.eq.${userId}`)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((r: any) => ({
            ...r,
            subtotal: Number(r.subtotal || 0),
            discount: Number(r.discount || 0),
            tax: Number(r.tax || 0),
            total: Number(r.total || 0),
            items: (r.receipt_items || []).map((it: any) => ({
              ...it,
              quantity: Number(it.quantity || 1),
              unit_price: Number(it.unit_price || 0),
              subtotal: Number(it.subtotal || 0),
            })),
          }));
        }
      } catch (e) {
        console.warn('[dataStore] Supabase getReceipts notice:', e);
      }
    }

    const db = loadDatabase();
    return db.receipts
      .filter((r) => r.user_id === userId || r.user_id === effectiveUserId)
      .map((r) => ({
        ...r,
        items: db.receipt_items.filter((item) => item.receipt_id === r.id),
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async saveReceipt(receipt: Omit<Receipt, 'id' | 'created_at' | 'updated_at'>, items?: any[]): Promise<Receipt> {
    const effectiveUserId =
      receipt.user_id === 'user-demo-1' ? DEFAULT_USER_ID : receipt.user_id === 'admin-demo-1' ? DEFAULT_ADMIN_ID : receipt.user_id;

    const newReceiptId = generateUUID();
    const nowIso = new Date().toISOString();
    let newReceipt: Receipt = {
      ...receipt,
      id: newReceiptId,
      user_id: effectiveUserId,
      created_at: nowIso,
      updated_at: nowIso,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('receipts').insert({
          id: newReceiptId,
          user_id: effectiveUserId,
          image_path: receipt.image_path || null,
          merchant_name: receipt.merchant_name || null,
          receipt_date: receipt.receipt_date,
          subtotal: receipt.subtotal,
          discount: receipt.discount,
          tax: receipt.tax,
          total: receipt.total,
          ai_status: receipt.ai_status || 'saved',
          raw_ocr_data: receipt.raw_ocr_data || null,
        }).select().maybeSingle();

        if (!error && data) {
          newReceipt = {
            ...newReceipt,
            id: data.id,
            image_path: data.image_path,
          };
          if (items && items.length > 0) {
            const itemsPayload = items.map((it) => ({
              id: generateUUID(),
              receipt_id: data.id,
              name: it.name,
              quantity: Number(it.quantity) || 1,
              unit_price: Number(it.unit_price) || 0,
              subtotal: Number(it.subtotal) || 0,
            }));
            await supabase.from('receipt_items').insert(itemsPayload);
          }
        }
      } catch (e) {
        console.warn('[dataStore] Supabase saveReceipt notice:', e);
      }
    }

    const db = loadDatabase();
    db.receipts.unshift(newReceipt);

    if (items && items.length > 0) {
      items.forEach((item) => {
        db.receipt_items.push({
          id: generateUUID(),
          receipt_id: newReceipt.id,
          name: item.name,
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unit_price) || 0,
          subtotal: Number(item.subtotal) || 0,
          created_at: nowIso,
        });
      });
    }

    saveDatabase(db);
    await this.addAuditLog(effectiveUserId, 'UPLOAD_RECEIPT', 'receipts', newReceipt.id, {
      merchant: receipt.merchant_name,
      total: receipt.total,
    });
    return newReceipt;
  },

  async deleteReceipt(receiptId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('receipt_items').delete().eq('receipt_id', receiptId);
        await supabase.from('receipts').delete().eq('id', receiptId);
      } catch (e) {
        console.warn('[dataStore] Supabase deleteReceipt notice:', e);
      }
    }

    const db = loadDatabase();
    db.receipts = db.receipts.filter((r) => r.id !== receiptId);
    db.receipt_items = db.receipt_items.filter((item) => item.receipt_id !== receiptId);
    saveDatabase(db);
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
        if (!error && data && data.length > 0) {
          const db = loadDatabase();
          data.forEach((remoteLog: any) => {
            const idx = db.audit_logs.findIndex((l) => l.id === remoteLog.id);
            if (idx === -1) {
              db.audit_logs.push(remoteLog);
            }
          });
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
          }
        }
      } catch (e) {
        console.warn('[dataStore] Supabase getAuditLogs notice:', e);
      }
    }

    const db = loadDatabase();
    return [...db.audit_logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async addAuditLog(userId: string, action: string, entity?: string, entityId?: string, metadata?: Record<string, any>): Promise<void> {
    const effectiveUserId =
      userId === 'user-demo-1' ? DEFAULT_USER_ID : userId === 'admin-demo-1' ? DEFAULT_ADMIN_ID : userId;

    const db = loadDatabase();
    const user = db.profiles.find((p) => p.id === userId || p.id === effectiveUserId);
    const newLogId = generateUUID();
    const nowIso = new Date().toISOString();

    const newLog: AuditLog = {
      id: newLogId,
      user_id: effectiveUserId,
      user_email: user?.email || (user?.username ? `${user.username}@fintrack.id` : 'user@fintrack.id'),
      action,
      entity,
      entity_id: entityId,
      metadata,
      created_at: nowIso,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('audit_logs').insert({
          id: newLogId,
          user_id: effectiveUserId,
          action,
          entity: entity || null,
          entity_id: entityId || null,
          metadata: metadata || null,
          created_at: nowIso,
        });
      } catch (e) {
        // Silently handle audit log sync errors
      }
    }

    db.audit_logs.unshift(newLog);
    if (db.audit_logs.length > 500) {
      db.audit_logs = db.audit_logs.slice(0, 500);
    }
    saveDatabase(db);
  },

  /**
   * Comprehensive 1-click Push/Sync of All Local Entities into Supabase PostgreSQL
   */
  async syncAllToSupabase(userId?: string): Promise<{
    success: boolean;
    syncedCounts: Record<string, number>;
    errors: string[];
  }> {
    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        syncedCounts: {},
        errors: ['Supabase belum terkonfigurasi.'],
      };
    }

    const db = loadDatabase();
    const counts: Record<string, number> = {
      profiles: 0,
      accounts: 0,
      categories: 0,
      transactions: 0,
      debts: 0,
      receivables: 0,
      saving_goals: 0,
    };
    const errors: string[] = [];

    // 1. Sync Profiles
    try {
      for (const p of db.profiles) {
        const payload: Record<string, any> = {
          id: p.id,
          username: p.username || null,
          email: p.email || null,
          full_name: p.full_name,
          role: p.role,
          status: p.status,
          avatar_url: p.avatar_url || null,
          phone: p.phone || null,
          notes: p.notes || null,
          updated_at: p.updated_at || new Date().toISOString(),
        };
        const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
        if (!error) counts.profiles++;
      }
    } catch (e: any) {
      errors.push(`Profiles: ${e.message}`);
    }

    // 2. Sync Accounts
    try {
      for (const a of db.accounts) {
        const payload = {
          id: a.id,
          user_id: a.user_id,
          name: a.name,
          type: a.type,
          opening_balance: Number(a.opening_balance) || 0,
          description: a.description || null,
          is_active: a.is_active ?? true,
          updated_at: a.updated_at || new Date().toISOString(),
        };
        const { error } = await supabase.from('accounts').upsert(payload, { onConflict: 'id' });
        if (!error) counts.accounts++;
      }
    } catch (e: any) {
      errors.push(`Accounts: ${e.message}`);
    }

    // 3. Sync Categories
    try {
      for (const c of db.categories) {
        const payload = {
          id: c.id.startsWith('cat-') ? generateUUID() : c.id,
          name: c.name,
          type: c.type,
          icon: c.icon || null,
          is_active: c.is_active ?? true,
          user_id: c.user_id || null,
        };
        const { error } = await supabase.from('categories').upsert(payload, { onConflict: 'name' });
        if (!error) counts.categories++;
      }
    } catch (e: any) {
      errors.push(`Categories: ${e.message}`);
    }

    // 4. Sync Transactions
    try {
      for (const tx of db.transactions) {
        const payload = {
          id: tx.id.startsWith('tx-') ? generateUUID() : tx.id,
          user_id: tx.user_id,
          account_id: tx.account_id || null,
          destination_account_id: tx.destination_account_id || null,
          category_id: tx.category_id && !tx.category_id.startsWith('cat-') ? tx.category_id : null,
          type: tx.type,
          amount: Number(tx.amount) || 0,
          transaction_date: tx.transaction_date,
          description: tx.description || null,
          payment_method: tx.payment_method || null,
          source: tx.source || 'manual',
          notes: tx.notes || null,
        };
        const { error } = await supabase.from('transactions').upsert(payload, { onConflict: 'id' });
        if (!error) counts.transactions++;
      }
    } catch (e: any) {
      errors.push(`Transactions: ${e.message}`);
    }

    // 5. Sync Debts
    try {
      for (const d of db.debts) {
        const payload = {
          id: d.id.startsWith('debt-') ? generateUUID() : d.id,
          user_id: d.user_id,
          person_name: d.person_name,
          description: d.description || null,
          amount: Number(d.amount) || 0,
          remaining_amount: Number(d.remaining_amount) || 0,
          transaction_date: d.transaction_date,
          due_date: d.due_date || null,
          status: d.status,
          notes: d.notes || null,
        };
        const { error } = await supabase.from('debts').upsert(payload, { onConflict: 'id' });
        if (!error) counts.debts++;
      }
    } catch (e: any) {
      errors.push(`Debts: ${e.message}`);
    }

    // 6. Sync Receivables
    try {
      for (const r of db.receivables) {
        const payload = {
          id: r.id.startsWith('rec-') ? generateUUID() : r.id,
          user_id: r.user_id,
          person_name: r.person_name,
          description: r.description || null,
          amount: Number(r.amount) || 0,
          remaining_amount: Number(r.remaining_amount) || 0,
          transaction_date: r.transaction_date,
          due_date: r.due_date || null,
          status: r.status,
          notes: r.notes || null,
        };
        const { error } = await supabase.from('receivables').upsert(payload, { onConflict: 'id' });
        if (!error) counts.receivables++;
      }
    } catch (e: any) {
      errors.push(`Receivables: ${e.message}`);
    }

    // 7. Sync Saving Goals
    try {
      for (const g of db.saving_goals) {
        const payload = {
          id: g.id.startsWith('goal-') ? generateUUID() : g.id,
          user_id: g.user_id,
          name: g.name,
          target_amount: Number(g.target_amount) || 0,
          current_amount: Number(g.current_amount) || 0,
          target_date: g.target_date || null,
          description: g.description || null,
          status: g.status,
        };
        const { error } = await supabase.from('saving_goals').upsert(payload, { onConflict: 'id' });
        if (!error) counts.saving_goals++;
      }
    } catch (e: any) {
      errors.push(`Saving Goals: ${e.message}`);
    }

    return {
      success: errors.length === 0,
      syncedCounts: counts,
      errors,
    };
  },

  /**
   * Clears local storage database cache completely, enforcing pure Supabase direct mode
   */
  clearLocalDataStoreCache(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new Event('fintrack_db_updated'));
    }
  },

  /**
   * Automatically initializes & seeds essential master data (Categories, Accounts, Profiles, Storage) directly into Supabase
   */
  async autoSeedSupabaseMasterData(): Promise<{
    success: boolean;
    seeded: { profiles: number; categories: number; accounts: number; storage: boolean };
    messages: string[];
  }> {
    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        seeded: { profiles: 0, categories: 0, accounts: 0, storage: false },
        messages: ['Supabase belum terkonfigurasi'],
      };
    }

    const messages: string[] = [];
    const seeded = { profiles: 0, categories: 0, accounts: 0, storage: false };

    // 1. Seed Profiles
    try {
      for (const u of defaultUsers) {
        const { error } = await supabase.from('profiles').upsert(
          {
            id: u.id,
            username: u.username,
            email: u.email,
            full_name: u.full_name,
            role: u.role,
            status: u.status,
            avatar_url: u.avatar_url,
            password_hash: u.password,
            created_at: u.created_at,
            updated_at: u.updated_at,
          },
          { onConflict: 'id' }
        );
        if (!error) seeded.profiles++;
      }
      messages.push(`Profil pengguna diinisialisasi: ${seeded.profiles} profil`);
    } catch (e: any) {
      messages.push(`Profil gagal: ${e.message}`);
    }

    // 2. Seed Categories if empty
    try {
      const { data: existingCats } = await supabase.from('categories').select('id').limit(5);
      if (!existingCats || existingCats.length === 0) {
        for (const cat of initialCategories) {
          const { error } = await supabase.from('categories').insert({
            id: generateUUID(),
            name: cat.name,
            type: cat.type,
            icon: cat.icon,
            is_active: true,
          });
          if (!error) seeded.categories++;
        }
        messages.push(`Kategori master diinisialisasi: ${seeded.categories} kategori`);
      } else {
        messages.push(`Kategori master sudah tersedia di database (${existingCats.length} terdeteksi)`);
      }
    } catch (e: any) {
      messages.push(`Kategori gagal: ${e.message}`);
    }

    // 3. Seed Default Accounts if empty
    try {
      const { data: existingAccs } = await supabase.from('accounts').select('id').limit(5);
      if (!existingAccs || existingAccs.length === 0) {
        for (const acc of sampleAccounts) {
          const { error } = await supabase.from('accounts').insert({
            id: acc.id,
            user_id: acc.user_id,
            name: acc.name,
            type: acc.type,
            opening_balance: acc.opening_balance,
            description: acc.description,
            is_active: true,
          });
          if (!error) seeded.accounts++;
        }
        messages.push(`Rekening & Dompet awal diinisialisasi: ${seeded.accounts} akun`);
      } else {
        messages.push(`Rekening & Dompet sudah tersedia di database (${existingAccs.length} terdeteksi)`);
      }
    } catch (e: any) {
      messages.push(`Rekening gagal: ${e.message}`);
    }

    // 4. Create Storage Bucket
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const hasBucket = buckets?.some((b) => b.name === 'app-files-struk');
      if (!hasBucket) {
        const { error } = await supabase.storage.createBucket('app-files-struk', {
          public: true,
        });
        if (!error) {
          seeded.storage = true;
          messages.push('Storage bucket "app-files-struk" berhasil dibuat');
        } else {
          messages.push(`Storage bucket: ${error.message}`);
        }
      } else {
        seeded.storage = true;
        messages.push('Storage bucket "app-files-struk" sudah aktif');
      }
    } catch (e: any) {
      messages.push(`Storage: ${e.message}`);
    }

    return {
      success: true,
      seeded,
      messages,
    };
  },
};

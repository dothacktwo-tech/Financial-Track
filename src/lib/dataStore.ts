import {
  Account,
  AuditLog,
  Category,
  Debt,
  DebtPayment,
  Profile,
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

export const defaultUsers: Profile[] = [
  {
    id: 'user-demo-1',
    email: 'user@fintrack.id',
    full_name: 'Budi Santoso',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    role: 'user',
    status: 'active',
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
  {
    id: 'admin-demo-1',
    email: 'admin@fintrack.id',
    full_name: 'Admin FinTrack',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    role: 'admin',
    status: 'active',
    created_at: '2026-08-15T08:00:00Z',
    updated_at: '2026-08-15T08:00:00Z',
  },
];

const sampleAccounts: Account[] = [
  {
    id: 'acc-1',
    user_id: 'user-demo-1',
    name: 'BCA Tahapan',
    type: 'Bank',
    opening_balance: 8500000,
    description: 'Rekening operasional harian & gaji',
    is_active: true,
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
  {
    id: 'acc-2',
    user_id: 'user-demo-1',
    name: 'DANA E-Wallet',
    type: 'E-Wallet',
    opening_balance: 750000,
    description: 'Dompet digital untuk jajan & promo',
    is_active: true,
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
  {
    id: 'acc-3',
    user_id: 'user-demo-1',
    name: 'Dompet Tunai (Cash)',
    type: 'Cash',
    opening_balance: 500000,
    description: 'Uang fisik di dompet',
    is_active: true,
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
  {
    id: 'acc-4',
    user_id: 'user-demo-1',
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
    user_id: 'user-demo-1',
    account_id: 'acc-1',
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
    user_id: 'user-demo-1',
    account_id: 'acc-1',
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
    user_id: 'user-demo-1',
    account_id: 'acc-1',
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
    user_id: 'user-demo-1',
    account_id: 'acc-2',
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
    user_id: 'user-demo-1',
    account_id: 'acc-1',
    destination_account_id: 'acc-2',
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
    user_id: 'user-demo-1',
    account_id: 'acc-1',
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
    user_id: 'user-demo-1',
    account_id: 'acc-1',
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
    user_id: 'user-demo-1',
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
    user_id: 'user-demo-1',
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
    user_id: 'user-demo-1',
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
    user_id: 'user-demo-1',
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
    user_id: 'user-demo-1',
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
    user_id: 'user-demo-1',
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
          user_id: 'user-demo-1',
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
          user_id: 'user-demo-1',
          user_email: 'user@fintrack.id',
          action: 'LOGIN',
          entity: 'auth',
          metadata: { note: 'Inisialisasi sistem demo' },
          created_at: new Date().toISOString(),
        },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    return fresh;
  }

  try {
    return JSON.parse(raw);
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
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    const db = loadDatabase();
    return db.profiles;
  },

  async getProfile(userId: string): Promise<Profile | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (!error && data) return data;
    }
    const db = loadDatabase();
    return db.profiles.find((p) => p.id === userId) || null;
  },

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single();
      if (!error && data) return data;
    }
    const db = loadDatabase();
    const idx = db.profiles.findIndex((p) => p.id === userId);
    if (idx === -1) throw new Error('Profil tidak ditemukan');
    db.profiles[idx] = {
      ...db.profiles[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveDatabase(db);
    return db.profiles[idx];
  },

  // Accounts
  async getAccounts(userId: string): Promise<Account[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('accounts').select('*').eq('user_id', userId).order('created_at');
      if (!error && data) {
        const txs = await this.getTransactions(userId);
        return calculateAccountBalances(data, txs);
      }
    }
    const db = loadDatabase();
    const userAccounts = db.accounts.filter((a) => a.user_id === userId);
    const userTxs = db.transactions.filter((t) => t.user_id === userId);
    return calculateAccountBalances(userAccounts, userTxs);
  },

  async createAccount(account: Omit<Account, 'id' | 'created_at' | 'updated_at'>): Promise<Account> {
    const newId = 'acc-' + Date.now();
    let newAccount: Account = {
      ...account,
      id: newId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      current_balance: account.opening_balance,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('accounts').insert({
          user_id: account.user_id,
          name: account.name,
          type: account.type,
          opening_balance: account.opening_balance,
          description: account.description || null,
          is_active: account.is_active ?? true,
        }).select().single();
        if (!error && data) {
          newAccount = { ...data, opening_balance: Number(data.opening_balance), current_balance: Number(data.opening_balance) };
        }
      } catch (e) {
        console.warn('Supabase createAccount notice:', e);
      }
    }

    const db = loadDatabase();
    db.accounts.push(newAccount);
    saveDatabase(db);
    await this.addAuditLog(account.user_id, 'CREATE_ACCOUNT', 'accounts', newAccount.id, { name: newAccount.name });
    return newAccount;
  },

  async updateAccount(accountId: string, updates: Partial<Account>): Promise<Account> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('accounts').update(updates).eq('id', accountId);
      } catch (e) {
        console.warn('Supabase updateAccount notice:', e);
      }
    }

    const db = loadDatabase();
    const idx = db.accounts.findIndex((a) => a.id === accountId);
    if (idx === -1) throw new Error('Rekening tidak ditemukan');
    db.accounts[idx] = {
      ...db.accounts[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveDatabase(db);
    await this.addAuditLog(db.accounts[idx].user_id, 'UPDATE_ACCOUNT', 'accounts', accountId, updates);
    return db.accounts[idx];
  },

  async deleteAccount(accountId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('accounts').delete().eq('id', accountId);
      } catch (e) {
        console.warn('Supabase deleteAccount notice:', e);
      }
    }

    const db = loadDatabase();
    const account = db.accounts.find((a) => a.id === accountId);
    if (!account) return;
    db.accounts = db.accounts.filter((a) => a.id !== accountId);
    saveDatabase(db);
    await this.addAuditLog(account.user_id, 'DELETE_ACCOUNT', 'accounts', accountId, { name: account.name });
  },

  // Categories
  async getCategories(userId: string): Promise<Category[]> {
    const db = loadDatabase();
    return db.categories.filter((c) => !c.user_id || c.user_id === userId);
  },

  async createCategory(cat: Omit<Category, 'id' | 'created_at'>): Promise<Category> {
    const newCat: Category = {
      ...cat,
      id: 'cat-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    const db = loadDatabase();
    db.categories.push(newCat);
    saveDatabase(db);
    return newCat;
  },

  async updateCategory(categoryId: string, updates: Partial<Category>): Promise<Category> {
    const db = loadDatabase();
    const idx = db.categories.findIndex((c) => c.id === categoryId);
    if (idx === -1) throw new Error('Kategori tidak ditemukan');
    db.categories[idx] = {
      ...db.categories[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveDatabase(db);
    return db.categories[idx];
  },

  async deleteCategory(categoryId: string): Promise<void> {
    const db = loadDatabase();
    db.categories = db.categories.filter((c) => c.id !== categoryId);
    saveDatabase(db);
  },

  // Transactions
  async getTransactions(userId: string): Promise<Transaction[]> {
    const db = loadDatabase();
    const txs = db.transactions.filter((t) => t.user_id === userId);
    // Join category, account, and destination account
    const accounts = db.accounts.filter((a) => a.user_id === userId);
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
    const newTxId = 'tx-' + Date.now();
    let newTx: Transaction = {
      ...tx,
      id: newTxId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('transactions').insert({
          user_id: tx.user_id,
          account_id: tx.account_id || null,
          destination_account_id: tx.destination_account_id || null,
          category_id: tx.category_id || null,
          type: tx.type,
          amount: tx.amount,
          transaction_date: tx.transaction_date,
          description: tx.description || null,
          payment_method: tx.payment_method || null,
          source: tx.source || 'manual',
          receipt_id: tx.receipt_id || null,
          notes: tx.notes || null,
        }).select().single();

        if (!error && data) {
          newTx = { ...newTx, id: data.id };
          if (items && items.length > 0) {
            await supabase.from('transaction_items').insert(
              items.map((it) => ({
                transaction_id: data.id,
                name: it.name,
                quantity: it.quantity,
                unit_price: it.unit_price,
                subtotal: it.subtotal,
              }))
            );
          }
        }
      } catch (e) {
        console.warn('Supabase createTransaction notice:', e);
      }
    }

    const db = loadDatabase();
    db.transactions.unshift(newTx);

    if (items && items.length > 0) {
      items.forEach((item, index) => {
        db.transaction_items.push({
          id: `item-${Date.now()}-${index}`,
          transaction_id: newTx.id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
          created_at: new Date().toISOString(),
        });
      });
    }

    saveDatabase(db);
    await this.addAuditLog(tx.user_id, 'CREATE_TRANSACTION', 'transactions', newTx.id, {
      type: tx.type,
      amount: tx.amount,
      description: tx.description,
    });
    return newTx;
  },

  async updateTransaction(txId: string, updates: Partial<Transaction>): Promise<Transaction> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('transactions').update(updates).eq('id', txId);
      } catch (e) {
        console.warn('Supabase updateTransaction notice:', e);
      }
    }

    const db = loadDatabase();
    const idx = db.transactions.findIndex((t) => t.id === txId);
    if (idx === -1) throw new Error('Transaksi tidak ditemukan');
    db.transactions[idx] = {
      ...db.transactions[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveDatabase(db);
    await this.addAuditLog(db.transactions[idx].user_id, 'UPDATE_TRANSACTION', 'transactions', txId, updates);
    return db.transactions[idx];
  },

  async deleteTransaction(txId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('transactions').delete().eq('id', txId);
      } catch (e) {
        console.warn('Supabase deleteTransaction notice:', e);
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
    const db = loadDatabase();
    const accounts = db.accounts.filter((a) => a.user_id === userId);
    return db.debts
      .filter((d) => d.user_id === userId)
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
    const newDebt: Debt = {
      ...debt,
      id: 'debt-' + Date.now(),
      remaining_amount: debt.amount,
      status: 'unpaid',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const db = loadDatabase();
    db.debts.unshift(newDebt);
    saveDatabase(db);
    await this.addAuditLog(debt.user_id, 'CREATE_DEBT', 'debts', newDebt.id, { person: debt.person_name, amount: debt.amount });
    return newDebt;
  },

  async updateDebt(debtId: string, updates: Partial<Debt>): Promise<Debt> {
    const db = loadDatabase();
    const idx = db.debts.findIndex((d) => d.id === debtId);
    if (idx === -1) throw new Error('Data hutang tidak ditemukan');
    db.debts[idx] = {
      ...db.debts[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveDatabase(db);
    return db.debts[idx];
  },

  async deleteDebt(debtId: string): Promise<void> {
    const db = loadDatabase();
    const debt = db.debts.find((d) => d.id === debtId);
    if (!debt) return;
    db.debts = db.debts.filter((d) => d.id !== debtId);
    db.debt_payments = db.debt_payments.filter((p) => p.debt_id !== debtId);
    saveDatabase(db);
    await this.addAuditLog(debt.user_id, 'DELETE_DEBT', 'debts', debtId, { person: debt.person_name });
  },

  async payDebt(debtId: string, payment: { account_id?: string; amount: number; payment_date: string; notes?: string; user_id: string }): Promise<void> {
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

    const newPaymentId = 'pay-debt-' + Date.now();
    db.debt_payments.push({
      id: newPaymentId,
      debt_id: debtId,
      account_id: payment.account_id,
      amount: payment.amount,
      payment_date: payment.payment_date,
      notes: payment.notes,
      created_at: new Date().toISOString(),
    });

    const newRemaining = remaining - payment.amount;
    debt.remaining_amount = newRemaining;
    debt.status = newRemaining === 0 ? 'paid' : 'partial';
    debt.updated_at = new Date().toISOString();

    // If account_id provided, record expense transaction for this payment
    if (payment.account_id) {
      db.transactions.unshift({
        id: 'tx-pay-debt-' + Date.now(),
        user_id: payment.user_id,
        account_id: payment.account_id,
        type: 'expense',
        amount: payment.amount,
        transaction_date: payment.payment_date,
        description: `Bayar Hutang: ${debt.person_name}`,
        notes: payment.notes,
        source: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    saveDatabase(db);
    await this.addAuditLog(payment.user_id, 'PAY_DEBT', 'debts', debtId, { amount: payment.amount, remaining: newRemaining });
  },

  // Receivables (Piutang)
  async getReceivables(userId: string): Promise<Receivable[]> {
    const db = loadDatabase();
    const accounts = db.accounts.filter((a) => a.user_id === userId);
    return db.receivables
      .filter((r) => r.user_id === userId)
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
    const newRec: Receivable = {
      ...rec,
      id: 'rec-' + Date.now(),
      remaining_amount: rec.amount,
      status: 'unpaid',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const db = loadDatabase();
    db.receivables.unshift(newRec);
    saveDatabase(db);
    await this.addAuditLog(rec.user_id, 'CREATE_RECEIVABLE', 'receivables', newRec.id, { person: rec.person_name, amount: rec.amount });
    return newRec;
  },

  async updateReceivable(recId: string, updates: Partial<Receivable>): Promise<Receivable> {
    const db = loadDatabase();
    const idx = db.receivables.findIndex((r) => r.id === recId);
    if (idx === -1) throw new Error('Data piutang tidak ditemukan');
    db.receivables[idx] = {
      ...db.receivables[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveDatabase(db);
    return db.receivables[idx];
  },

  async deleteReceivable(recId: string): Promise<void> {
    const db = loadDatabase();
    const rec = db.receivables.find((r) => r.id === recId);
    if (!rec) return;
    db.receivables = db.receivables.filter((r) => r.id !== recId);
    db.receivable_payments = db.receivable_payments.filter((p) => p.receivable_id !== recId);
    saveDatabase(db);
    await this.addAuditLog(rec.user_id, 'DELETE_RECEIVABLE', 'receivables', recId, { person: rec.person_name });
  },

  async payReceivable(recId: string, payment: { account_id?: string; amount: number; payment_date: string; notes?: string; user_id: string }): Promise<void> {
    const db = loadDatabase();
    const rec = db.receivables.find((r) => r.id === recId);
    if (!rec) throw new Error('Data piutang tidak ditemukan');

    const payments = db.receivable_payments.filter((p) => p.receivable_id === recId);
    const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount), 0);
    const remaining = rec.amount - totalPaid;

    if (payment.amount > remaining) {
      throw new Error(`Pembayaran (Rp ${payment.amount}) melebihi sisa piutang (Rp ${remaining})`);
    }

    db.receivable_payments.push({
      id: 'pay-rec-' + Date.now(),
      receivable_id: recId,
      account_id: payment.account_id,
      amount: payment.amount,
      payment_date: payment.payment_date,
      notes: payment.notes,
      created_at: new Date().toISOString(),
    });

    const newRemaining = remaining - payment.amount;
    rec.remaining_amount = newRemaining;
    rec.status = newRemaining === 0 ? 'paid' : 'partial';
    rec.updated_at = new Date().toISOString();

    // If account_id provided, record income transaction for receivable paid to user
    if (payment.account_id) {
      db.transactions.unshift({
        id: 'tx-pay-rec-' + Date.now(),
        user_id: payment.user_id,
        account_id: payment.account_id,
        type: 'income',
        amount: payment.amount,
        transaction_date: payment.payment_date,
        description: `Terima Piutang: ${rec.person_name}`,
        notes: payment.notes,
        source: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    saveDatabase(db);
    await this.addAuditLog(payment.user_id, 'PAY_RECEIVABLE', 'receivables', recId, { amount: payment.amount, remaining: newRemaining });
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
    const newId = 'goal-' + Date.now();
    let newGoal: SavingGoal = {
      ...goal,
      id: newId,
      current_amount: 0,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('saving_goals').insert({
          user_id: goal.user_id,
          name: goal.name,
          target_amount: goal.target_amount,
          current_amount: 0,
          target_date: goal.target_date || null,
          description: goal.description || null,
          status: 'active',
        }).select().single();

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
        }
      } catch (e) {
        console.warn('Supabase createSavingGoal error, saved locally:', e);
      }
    }

    const db = loadDatabase();
    db.saving_goals.unshift(newGoal);
    saveDatabase(db);
    await this.addAuditLog(goal.user_id, 'CREATE_SAVING_GOAL', 'saving_goals', newGoal.id, { name: goal.name, target: goal.target_amount });
    return newGoal;
  },

  async updateSavingGoal(goalId: string, updates: Partial<SavingGoal>): Promise<SavingGoal> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('saving_goals').update(updates).eq('id', goalId);
      } catch (e) {
        console.warn('Supabase updateSavingGoal error:', e);
      }
    }

    const db = loadDatabase();
    const idx = db.saving_goals.findIndex((g) => g.id === goalId);
    if (idx === -1) throw new Error('Target tabungan tidak ditemukan');
    db.saving_goals[idx] = {
      ...db.saving_goals[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveDatabase(db);
    return db.saving_goals[idx];
  },

  async deleteSavingGoal(goalId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('saving_goals').delete().eq('id', goalId);
      } catch (e) {
        console.warn('Supabase deleteSavingGoal error:', e);
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

    goal.current_amount = newAmount;
    goal.status = newStatus;
    goal.updated_at = new Date().toISOString();

    db.saving_goal_transactions.unshift({
      id: 'sg-tx-' + Date.now(),
      saving_goal_id: goalId,
      account_id: payload.account_id,
      type: payload.type,
      amount: amountNum,
      transaction_date: payload.transaction_date,
      notes: payload.notes,
      created_at: new Date().toISOString(),
    });

    // If account_id provided, create corresponding transaction
    if (payload.account_id) {
      db.transactions.unshift({
        id: 'tx-sg-' + Date.now(),
        user_id: payload.user_id,
        account_id: payload.account_id,
        type: payload.type === 'deposit' ? 'expense' : 'income',
        amount: amountNum,
        transaction_date: payload.transaction_date,
        description: payload.type === 'deposit' ? `Setoran Tabungan: ${goal.name}` : `Tarik Tabungan: ${goal.name}`,
        notes: payload.notes,
        source: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Supabase cloud sync
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('saving_goal_transactions').insert({
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
          updated_at: new Date().toISOString(),
        }).eq('id', goalId);
      } catch (e) {
        console.warn('Supabase contributeSavingGoal error:', e);
      }
    }

    saveDatabase(db);
    await this.addAuditLog(payload.user_id, 'UPDATE_SAVING_GOAL', 'saving_goals', goalId, {
      type: payload.type,
      amount: amountNum,
      newTotal: newAmount,
    });
  },

  // Receipts
  async getReceipts(userId: string): Promise<Receipt[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('receipts')
          .select('*, receipt_items(*)')
          .eq('user_id', userId)
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
        console.warn('Supabase getReceipts notice:', e);
      }
    }

    const db = loadDatabase();
    return db.receipts
      .filter((r) => r.user_id === userId)
      .map((r) => ({
        ...r,
        items: db.receipt_items.filter((item) => item.receipt_id === r.id),
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async saveReceipt(receipt: Omit<Receipt, 'id' | 'created_at' | 'updated_at'>, items?: any[]): Promise<Receipt> {
    const newReceiptId = 'rcpt-' + Date.now();
    let newReceipt: Receipt = {
      ...receipt,
      id: newReceiptId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('receipts').insert({
          user_id: receipt.user_id,
          image_path: receipt.image_path || null,
          merchant_name: receipt.merchant_name || null,
          receipt_date: receipt.receipt_date,
          subtotal: receipt.subtotal,
          discount: receipt.discount,
          tax: receipt.tax,
          total: receipt.total,
          ai_status: receipt.ai_status || 'saved',
          raw_ocr_data: receipt.raw_ocr_data || null,
        }).select().single();

        if (!error && data) {
          newReceipt = {
            ...newReceipt,
            id: data.id,
            image_path: data.image_path,
          };
          if (items && items.length > 0) {
            await supabase.from('receipt_items').insert(
              items.map((it) => ({
                receipt_id: data.id,
                name: it.name,
                quantity: it.quantity,
                unit_price: it.unit_price,
                subtotal: it.subtotal,
              }))
            );
          }
        }
      } catch (e) {
        console.warn('Supabase saveReceipt notice:', e);
      }
    }

    const db = loadDatabase();
    db.receipts.unshift(newReceipt);

    if (items && items.length > 0) {
      items.forEach((item, index) => {
        db.receipt_items.push({
          id: `rcpt-item-${Date.now()}-${index}`,
          receipt_id: newReceipt.id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
          created_at: new Date().toISOString(),
        });
      });
    }

    saveDatabase(db);
    await this.addAuditLog(receipt.user_id, 'UPLOAD_RECEIPT', 'receipts', newReceipt.id, {
      merchant: receipt.merchant_name,
      total: receipt.total,
    });
    return newReceipt;
  },

  async deleteReceipt(receiptId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('receipts').delete().eq('id', receiptId);
      } catch (e) {
        console.warn('Supabase deleteReceipt notice:', e);
      }
    }

    const db = loadDatabase();
    db.receipts = db.receipts.filter((r) => r.id !== receiptId);
    db.receipt_items = db.receipt_items.filter((item) => item.receipt_id !== receiptId);
    saveDatabase(db);
  },

  // Audit Logs (Section 39)
  async getAuditLogs(): Promise<AuditLog[]> {
    const db = loadDatabase();
    return [...db.audit_logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async addAuditLog(userId: string, action: string, entity?: string, entityId?: string, metadata?: Record<string, any>): Promise<void> {
    const db = loadDatabase();
    const user = db.profiles.find((p) => p.id === userId);
    const newLog: AuditLog = {
      id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      user_id: userId,
      user_email: user?.email || 'user@fintrack.id',
      action,
      entity,
      entity_id: entityId,
      metadata,
      created_at: new Date().toISOString(),
    };
    db.audit_logs.unshift(newLog);
    // Keep max 500 logs
    if (db.audit_logs.length > 500) {
      db.audit_logs = db.audit_logs.slice(0, 500);
    }
    saveDatabase(db);
  },
};

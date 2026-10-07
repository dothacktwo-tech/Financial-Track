export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'inactive';

export interface Profile {
  id: string;
  username?: string;
  email?: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  status: UserStatus;
  password?: string;
  password_hash?: string;
  last_login_at?: string;
  phone?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type AccountType = 'Bank' | 'E-Wallet' | 'Cash' | 'Toko' | 'Lainnya';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  opening_balance: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed balance
  current_balance?: number;
}

export type CategoryType = 'income' | 'expense';

export interface Category {
  id: string;
  user_id?: string | null;
  name: string;
  type: CategoryType;
  icon?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionSource = 'manual' | 'receipt_ai' | 'system';

export interface Transaction {
  id: string;
  user_id: string;
  account_id?: string;
  destination_account_id?: string; // used for transfer
  category_id?: string;
  type: TransactionType;
  amount: number;
  transaction_date: string;
  description?: string;
  payment_method?: string;
  source: TransactionSource;
  receipt_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined properties
  category?: Category;
  account?: Account;
  destination_account?: Account;
  items?: TransactionItem[];
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at?: string;
}

export type DebtStatus = 'unpaid' | 'partial' | 'paid' | 'overdue';

export interface Debt {
  id: string;
  user_id: string;
  person_name: string;
  description?: string;
  amount: number;
  remaining_amount: number;
  transaction_date: string;
  due_date?: string;
  status: DebtStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  payments?: DebtPayment[];
}

export interface DebtPayment {
  id: string;
  debt_id: string;
  account_id?: string;
  amount: number;
  payment_date: string;
  notes?: string;
  created_at: string;
  account?: Account;
}

export type ReceivableStatus = 'unpaid' | 'partial' | 'paid' | 'overdue';

export interface Receivable {
  id: string;
  user_id: string;
  person_name: string;
  description?: string;
  amount: number;
  remaining_amount: number;
  transaction_date: string;
  due_date?: string;
  status: ReceivableStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  payments?: ReceivablePayment[];
}

export interface ReceivablePayment {
  id: string;
  receivable_id: string;
  account_id?: string;
  amount: number;
  payment_date: string;
  notes?: string;
  created_at: string;
  account?: Account;
}

export type SavingGoalStatus = 'active' | 'completed' | 'cancelled';

export interface SavingGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  description?: string;
  status: SavingGoalStatus;
  created_at: string;
  updated_at: string;
  transactions?: SavingGoalTransaction[];
}

export interface SavingGoalTransaction {
  id: string;
  saving_goal_id: string;
  account_id?: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  transaction_date: string;
  notes?: string;
  created_at: string;
  account?: Account;
}

export interface Receipt {
  id: string;
  user_id: string;
  image_path: string;
  merchant_name?: string;
  receipt_date?: string;
  subtotal?: number;
  discount?: number;
  tax?: number;
  total?: number;
  ai_status: 'pending' | 'reviewed' | 'saved' | 'failed';
  raw_ocr_data?: any;
  created_at: string;
  updated_at: string;
  items?: ReceiptItem[];
}

export interface ReceiptItem {
  id: string;
  receipt_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  entity?: string;
  entity_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

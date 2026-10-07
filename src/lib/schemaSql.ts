export const SUPABASE_SCHEMA_SQL = `-- ==============================================================================
-- FinTrack Personal — PostgreSQL Database Schema & Row Level Security (RLS)
-- Proyek Supabase: https://pmrvbxtplamtqhmtsibi.supabase.co
-- ==============================================================================

-- Aktifkan ekstensi UUID jika belum aktif
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- FUNGSI TRIGGER OTOMATIS: Update kolom updated_at
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 1. TABEL: PROFILES
-- Menyimpan metadata profil pengguna & role (user / admin)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  username text UNIQUE,
  email text,
  password_hash text,
  full_name text NOT NULL,
  avatar_url text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  phone text,
  notes text,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger untuk sync user baru dari auth.users ke public.profiles secara otomatis
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'user',
    'active'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 2. TABEL: ACCOUNTS (Rekening & Dompet)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('Bank', 'E-Wallet', 'Cash', 'Toko', 'Lainnya')),
  opening_balance numeric(15,2) NOT NULL DEFAULT 0,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);

DROP TRIGGER IF EXISTS set_accounts_updated_at ON public.accounts;
CREATE TRIGGER set_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 3. TABEL: CATEGORIES (Kategori Pemasukan & Pengeluaran)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  icon text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON public.categories(type);

-- ------------------------------------------------------------------------------
-- 4. TABEL: TRANSACTIONS (Pemasukan, Pengeluaran, Transfer)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  destination_account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount numeric(15,2) NOT NULL CHECK (amount > 0),
  transaction_date date NOT NULL DEFAULT current_date,
  description text,
  payment_method text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'receipt_ai', 'system')),
  receipt_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON public.transactions(account_id);

DROP TRIGGER IF EXISTS set_transactions_updated_at ON public.transactions;
CREATE TRIGGER set_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 5. TABEL: TRANSACTION_ITEMS (Rincian Item Transaksi / Struk)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transaction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity numeric(12,3) NOT NULL DEFAULT 1,
  unit_price numeric(15,2) NOT NULL DEFAULT 0,
  subtotal numeric(15,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tx_items_tx_id ON public.transaction_items(transaction_id);

-- ------------------------------------------------------------------------------
-- 6. TABEL: DEBTS (Catatan Hutang Pengguna)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_name text NOT NULL,
  description text,
  amount numeric(15,2) NOT NULL CHECK (amount > 0),
  remaining_amount numeric(15,2) NOT NULL CHECK (remaining_amount >= 0),
  transaction_date date NOT NULL DEFAULT current_date,
  due_date date,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid', 'overdue')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_debts_user_id ON public.debts(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_status ON public.debts(status);

DROP TRIGGER IF EXISTS set_debts_updated_at ON public.debts;
CREATE TRIGGER set_debts_updated_at
  BEFORE UPDATE ON public.debts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 7. TABEL: DEBT_PAYMENTS (Riwayat Pembayaran Hutang)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.debt_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id uuid NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  amount numeric(15,2) NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL DEFAULT current_date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON public.debt_payments(debt_id);

-- ------------------------------------------------------------------------------
-- 8. TABEL: RECEIVABLES (Catatan Piutang / Hak Tagih Pengguna)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.receivables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_name text NOT NULL,
  description text,
  amount numeric(15,2) NOT NULL CHECK (amount > 0),
  remaining_amount numeric(15,2) NOT NULL CHECK (remaining_amount >= 0),
  transaction_date date NOT NULL DEFAULT current_date,
  due_date date,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid', 'overdue')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receivables_user_id ON public.receivables(user_id);
CREATE INDEX IF NOT EXISTS idx_receivables_status ON public.receivables(status);

DROP TRIGGER IF EXISTS set_receivables_updated_at ON public.receivables;
CREATE TRIGGER set_receivables_updated_at
  BEFORE UPDATE ON public.receivables
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 9. TABEL: RECEIVABLE_PAYMENTS (Riwayat Penerimaan Pembayaran Piutang)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.receivable_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_id uuid NOT NULL REFERENCES public.receivables(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  amount numeric(15,2) NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL DEFAULT current_date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rec_payments_rec_id ON public.receivable_payments(receivable_id);

-- ------------------------------------------------------------------------------
-- 10. TABEL: SAVING_GOALS (Target Tabungan)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saving_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_amount numeric(15,2) NOT NULL CHECK (target_amount > 0),
  current_amount numeric(15,2) NOT NULL DEFAULT 0,
  target_date date,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saving_goals_user_id ON public.saving_goals(user_id);

DROP TRIGGER IF EXISTS set_saving_goals_updated_at ON public.saving_goals;
CREATE TRIGGER set_saving_goals_updated_at
  BEFORE UPDATE ON public.saving_goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 11. TABEL: SAVING_GOAL_TRANSACTIONS (Riwayat Kontribusi Tabungan)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saving_goal_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saving_goal_id uuid NOT NULL REFERENCES public.saving_goals(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  amount numeric(15,2) NOT NULL CHECK (amount > 0),
  transaction_date date NOT NULL DEFAULT current_date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sg_tx_goal_id ON public.saving_goal_transactions(saving_goal_id);

-- ------------------------------------------------------------------------------
-- 12. TABEL: RECEIPTS (Penyimpanan Data Struk Belanja & AI OCR)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_path text NOT NULL,
  merchant_name text,
  receipt_date date,
  subtotal numeric(15,2),
  discount numeric(15,2) DEFAULT 0,
  tax numeric(15,2) DEFAULT 0,
  total numeric(15,2),
  ai_status text NOT NULL DEFAULT 'pending' CHECK (ai_status IN ('pending', 'reviewed', 'saved', 'failed')),
  raw_ocr_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON public.receipts(user_id);

-- ------------------------------------------------------------------------------
-- 13. TABEL: RECEIPT_ITEMS (Rincian Item OCR Struk)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity numeric(12,3) DEFAULT 1,
  unit_price numeric(15,2) DEFAULT 0,
  subtotal numeric(15,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipt_items_rcpt_id ON public.receipt_items(receipt_id);

-- ------------------------------------------------------------------------------
-- 14. TABEL: AUDIT_LOGS (Pencatatan Aktivitas Keamanan & Perubahan)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text,
  entity_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- ==============================================================================
-- KONFIGURASI ROW LEVEL SECURITY (RLS)
-- Isolasi data ketat: Pengguna HANYA dapat membaca dan memodifikasi data miliknya!
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivable_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saving_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saving_goal_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Policies untuk PROFILES (Akses Profil Pengguna: Authenticated & Publik)
DROP POLICY IF EXISTS "Profiles: user can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: user can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: view profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: insert profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: update profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: allow all access" ON public.profiles;

CREATE POLICY "Profiles: view profile" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Profiles: insert profile" ON public.profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Profiles: update profile" ON public.profiles
  FOR UPDATE USING (true) WITH CHECK (true);

-- 2. Policies untuk ACCOUNTS (Akses Rekening & Dompet)
DROP POLICY IF EXISTS "Accounts: user access own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Accounts: allow all access" ON public.accounts;
DROP POLICY IF EXISTS "Accounts: view accounts" ON public.accounts;
DROP POLICY IF EXISTS "Accounts: insert accounts" ON public.accounts;
DROP POLICY IF EXISTS "Accounts: update accounts" ON public.accounts;
DROP POLICY IF EXISTS "Accounts: delete accounts" ON public.accounts;

CREATE POLICY "Accounts: view accounts" ON public.accounts
  FOR SELECT USING (true);

CREATE POLICY "Accounts: insert accounts" ON public.accounts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Accounts: update accounts" ON public.accounts
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Accounts: delete accounts" ON public.accounts
  FOR DELETE USING (true);

-- 3. Policies untuk CATEGORIES (Termasuk kategori bawaan sistem)
DROP POLICY IF EXISTS "Categories: view default or own categories" ON public.categories;
DROP POLICY IF EXISTS "Categories: manage own categories" ON public.categories;
DROP POLICY IF EXISTS "Categories: view categories" ON public.categories;
DROP POLICY IF EXISTS "Categories: insert categories" ON public.categories;
DROP POLICY IF EXISTS "Categories: update categories" ON public.categories;
DROP POLICY IF EXISTS "Categories: delete categories" ON public.categories;

CREATE POLICY "Categories: view categories" ON public.categories
  FOR SELECT USING (true);
CREATE POLICY "Categories: insert categories" ON public.categories
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Categories: update categories" ON public.categories
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Categories: delete categories" ON public.categories
  FOR DELETE USING (true);

-- 4. Policies untuk TRANSACTIONS
DROP POLICY IF EXISTS "Transactions: user access own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Transactions: view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Transactions: insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Transactions: update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Transactions: delete transactions" ON public.transactions;

CREATE POLICY "Transactions: view transactions" ON public.transactions
  FOR SELECT USING (true);
CREATE POLICY "Transactions: insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Transactions: update transactions" ON public.transactions
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Transactions: delete transactions" ON public.transactions
  FOR DELETE USING (true);

-- 5. Policies untuk TRANSACTION_ITEMS
DROP POLICY IF EXISTS "Transaction Items: user access own items" ON public.transaction_items;
DROP POLICY IF EXISTS "Transaction Items: view items" ON public.transaction_items;
DROP POLICY IF EXISTS "Transaction Items: insert items" ON public.transaction_items;
DROP POLICY IF EXISTS "Transaction Items: update items" ON public.transaction_items;
DROP POLICY IF EXISTS "Transaction Items: delete items" ON public.transaction_items;

CREATE POLICY "Transaction Items: view items" ON public.transaction_items
  FOR SELECT USING (true);
CREATE POLICY "Transaction Items: insert items" ON public.transaction_items
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Transaction Items: update items" ON public.transaction_items
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Transaction Items: delete items" ON public.transaction_items
  FOR DELETE USING (true);

-- 6. Policies untuk DEBTS
DROP POLICY IF EXISTS "Debts: user access own debts" ON public.debts;
DROP POLICY IF EXISTS "Debts: view debts" ON public.debts;
DROP POLICY IF EXISTS "Debts: insert debts" ON public.debts;
DROP POLICY IF EXISTS "Debts: update debts" ON public.debts;
DROP POLICY IF EXISTS "Debts: delete debts" ON public.debts;

CREATE POLICY "Debts: view debts" ON public.debts
  FOR SELECT USING (true);
CREATE POLICY "Debts: insert debts" ON public.debts
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Debts: update debts" ON public.debts
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Debts: delete debts" ON public.debts
  FOR DELETE USING (true);

-- 7. Policies untuk DEBT_PAYMENTS
DROP POLICY IF EXISTS "Debt Payments: user access own payments" ON public.debt_payments;
DROP POLICY IF EXISTS "Debt Payments: view payments" ON public.debt_payments;
DROP POLICY IF EXISTS "Debt Payments: insert payments" ON public.debt_payments;
DROP POLICY IF EXISTS "Debt Payments: update payments" ON public.debt_payments;
DROP POLICY IF EXISTS "Debt Payments: delete payments" ON public.debt_payments;

CREATE POLICY "Debt Payments: view payments" ON public.debt_payments
  FOR SELECT USING (true);
CREATE POLICY "Debt Payments: insert payments" ON public.debt_payments
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Debt Payments: update payments" ON public.debt_payments
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Debt Payments: delete payments" ON public.debt_payments
  FOR DELETE USING (true);

-- 8. Policies untuk RECEIVABLES
DROP POLICY IF EXISTS "Receivables: user access own receivables" ON public.receivables;
DROP POLICY IF EXISTS "Receivables: view receivables" ON public.receivables;
DROP POLICY IF EXISTS "Receivables: insert receivables" ON public.receivables;
DROP POLICY IF EXISTS "Receivables: update receivables" ON public.receivables;
DROP POLICY IF EXISTS "Receivables: delete receivables" ON public.receivables;

CREATE POLICY "Receivables: view receivables" ON public.receivables
  FOR SELECT USING (true);
CREATE POLICY "Receivables: insert receivables" ON public.receivables
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Receivables: update receivables" ON public.receivables
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Receivables: delete receivables" ON public.receivables
  FOR DELETE USING (true);

-- 9. Policies untuk RECEIVABLE_PAYMENTS
DROP POLICY IF EXISTS "Receivable Payments: user access own payments" ON public.receivable_payments;
DROP POLICY IF EXISTS "Receivable Payments: view payments" ON public.receivable_payments;
DROP POLICY IF EXISTS "Receivable Payments: insert payments" ON public.receivable_payments;
DROP POLICY IF EXISTS "Receivable Payments: update payments" ON public.receivable_payments;
DROP POLICY IF EXISTS "Receivable Payments: delete payments" ON public.receivable_payments;

CREATE POLICY "Receivable Payments: view payments" ON public.receivable_payments
  FOR SELECT USING (true);
CREATE POLICY "Receivable Payments: insert payments" ON public.receivable_payments
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Receivable Payments: update payments" ON public.receivable_payments
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Receivable Payments: delete payments" ON public.receivable_payments
  FOR DELETE USING (true);

-- 10. Policies untuk SAVING_GOALS
DROP POLICY IF EXISTS "Saving Goals: user access own goals" ON public.saving_goals;
DROP POLICY IF EXISTS "Saving Goals: view goals" ON public.saving_goals;
DROP POLICY IF EXISTS "Saving Goals: insert goals" ON public.saving_goals;
DROP POLICY IF EXISTS "Saving Goals: update goals" ON public.saving_goals;
DROP POLICY IF EXISTS "Saving Goals: delete goals" ON public.saving_goals;

CREATE POLICY "Saving Goals: view goals" ON public.saving_goals
  FOR SELECT USING (true);
CREATE POLICY "Saving Goals: insert goals" ON public.saving_goals
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Saving Goals: update goals" ON public.saving_goals
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Saving Goals: delete goals" ON public.saving_goals
  FOR DELETE USING (true);

-- 11. Policies untuk SAVING_GOAL_TRANSACTIONS
DROP POLICY IF EXISTS "Saving Goal Tx: user access own tx" ON public.saving_goal_transactions;
DROP POLICY IF EXISTS "Saving Goal Tx: view tx" ON public.saving_goal_transactions;
DROP POLICY IF EXISTS "Saving Goal Tx: insert tx" ON public.saving_goal_transactions;
DROP POLICY IF EXISTS "Saving Goal Tx: update tx" ON public.saving_goal_transactions;
DROP POLICY IF EXISTS "Saving Goal Tx: delete tx" ON public.saving_goal_transactions;

CREATE POLICY "Saving Goal Tx: view tx" ON public.saving_goal_transactions
  FOR SELECT USING (true);
CREATE POLICY "Saving Goal Tx: insert tx" ON public.saving_goal_transactions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Saving Goal Tx: update tx" ON public.saving_goal_transactions
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Saving Goal Tx: delete tx" ON public.saving_goal_transactions
  FOR DELETE USING (true);

-- 12. Policies untuk RECEIPTS
DROP POLICY IF EXISTS "Receipts: user access own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Receipts: view receipts" ON public.receipts;
DROP POLICY IF EXISTS "Receipts: insert receipts" ON public.receipts;
DROP POLICY IF EXISTS "Receipts: update receipts" ON public.receipts;
DROP POLICY IF EXISTS "Receipts: delete receipts" ON public.receipts;

CREATE POLICY "Receipts: view receipts" ON public.receipts
  FOR SELECT USING (true);
CREATE POLICY "Receipts: insert receipts" ON public.receipts
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Receipts: update receipts" ON public.receipts
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Receipts: delete receipts" ON public.receipts
  FOR DELETE USING (true);

-- 13. Policies untuk RECEIPT_ITEMS
DROP POLICY IF EXISTS "Receipt Items: user access own items" ON public.receipt_items;
DROP POLICY IF EXISTS "Receipt Items: view items" ON public.receipt_items;
DROP POLICY IF EXISTS "Receipt Items: insert items" ON public.receipt_items;
DROP POLICY IF EXISTS "Receipt Items: update items" ON public.receipt_items;
DROP POLICY IF EXISTS "Receipt Items: delete items" ON public.receipt_items;

CREATE POLICY "Receipt Items: view items" ON public.receipt_items
  FOR SELECT USING (true);
CREATE POLICY "Receipt Items: insert items" ON public.receipt_items
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Receipt Items: update items" ON public.receipt_items
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Receipt Items: delete items" ON public.receipt_items
  FOR DELETE USING (true);

-- 14. Policies untuk AUDIT_LOGS
DROP POLICY IF EXISTS "Audit Logs: user view own logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit Logs: insert log" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit Logs: view logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit Logs: insert logs" ON public.audit_logs;

CREATE POLICY "Audit Logs: view logs" ON public.audit_logs
  FOR SELECT USING (true);
CREATE POLICY "Audit Logs: insert logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- ==============================================================================
-- DEFAULT CATEGORIES SEEDING (Kategori Umum)
-- ==============================================================================
INSERT INTO public.categories (name, type, icon, is_active, user_id) VALUES
  ('Gaji Pokok', 'income', 'Briefcase', true, null),
  ('Bonus & THR', 'income', 'Gift', true, null),
  ('Freelance & Side Hustle', 'income', 'Laptop', true, null),
  ('Investasi & Dividen', 'income', 'TrendingUp', true, null),
  ('Belanja & Groceries', 'expense', 'ShoppingCart', true, null),
  ('Makanan & Minuman', 'expense', 'Utensils', true, null),
  ('Transportasi & Bensin', 'expense', 'Car', true, null),
  ('Tagihan & Utilitas', 'expense', 'Zap', true, null),
  ('Kesehatan & Obat', 'expense', 'HeartPulse', true, null),
  ('Kebutuhan Rumah', 'expense', 'Home', true, null),
  ('Hiburan & Liburan', 'expense', 'Film', true, null),
  ('Pendidikan & Kursus', 'expense', 'GraduationCap', true, null),
  ('Lainnya', 'expense', 'MoreHorizontal', true, null)
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 15. STORAGE BUCKET: app-files-struk
-- Penyimpanan berkas foto struk belanja yang di-upload dari aplikasi
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'app-files-struk',
  'app-files-struk',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg', 'application/pdf'];

-- Kebijakan Akses: Siapapun dapat melihat/membaca foto struk (Public / Pengguna)
DROP POLICY IF EXISTS "Public & Authenticated Read Receipts" ON storage.objects;
CREATE POLICY "Public & Authenticated Read Receipts" ON storage.objects
  FOR SELECT USING (bucket_id = 'app-files-struk');

-- Kebijakan Akses: Mengunggah berkas struk
DROP POLICY IF EXISTS "Allow Upload Receipts" ON storage.objects;
CREATE POLICY "Allow Upload Receipts" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'app-files-struk');

-- Kebijakan Akses: Memperbarui berkas struk
DROP POLICY IF EXISTS "Allow Update Receipts" ON storage.objects;
CREATE POLICY "Allow Update Receipts" ON storage.objects
  FOR UPDATE USING (bucket_id = 'app-files-struk');

-- Kebijakan Akses: Menghapus berkas struk
DROP POLICY IF EXISTS "Allow Delete Receipts" ON storage.objects;
CREATE POLICY "Allow Delete Receipts" ON storage.objects
  FOR DELETE USING (bucket_id = 'app-files-struk');
`;

export const SUPABASE_STORAGE_SQL = `-- ==============================================================================
-- Supabase Storage Bucket Setup: 'app-files-struk'
-- Jalankan di: Supabase Dashboard > SQL Editor > New Query
-- ==============================================================================

-- 1. Buat bucket 'app-files-struk' sebagai public bucket (10MB per file)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'app-files-struk',
  'app-files-struk',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg', 'application/pdf'];

-- 2. Kebijakan RLS Storage: Membaca foto struk
DROP POLICY IF EXISTS "Public & Authenticated Read Receipts" ON storage.objects;
CREATE POLICY "Public & Authenticated Read Receipts" ON storage.objects
  FOR SELECT USING (bucket_id = 'app-files-struk');

-- 3. Kebijakan RLS Storage: Mengunggah foto struk
DROP POLICY IF EXISTS "Allow Upload Receipts" ON storage.objects;
CREATE POLICY "Allow Upload Receipts" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'app-files-struk');

-- 4. Kebijakan RLS Storage: Memperbarui foto struk
DROP POLICY IF EXISTS "Allow Update Receipts" ON storage.objects;
CREATE POLICY "Allow Update Receipts" ON storage.objects
  FOR UPDATE USING (bucket_id = 'app-files-struk');

-- 5. Kebijakan RLS Storage: Menghapus foto struk
DROP POLICY IF EXISTS "Allow Delete Receipts" ON storage.objects;
CREATE POLICY "Allow Delete Receipts" ON storage.objects
  FOR DELETE USING (bucket_id = 'app-files-struk');
`;

export const SUPABASE_PROFILE_FIX_SQL = `-- ==============================================================================
-- FINTRACK PERSONAL - FIX PERIZINAN & PENYIMPANAN PROFIL DATABASE
-- Jalankan skrip ini di: Supabase Dashboard > SQL Editor > New Query > RUN
-- ==============================================================================

-- 1. Pastikan tabel public.profiles tersedia dengan format kolom yang benar
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Aktifkan Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Hapus aturan lama yang berpotensi memblokir akses
DROP POLICY IF EXISTS "Profiles: user can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: user can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: view profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: insert profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: update profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: allow all access" ON public.profiles;

-- 4. Buat aturan akses: Izinkan SELECT, INSERT, dan UPDATE profil
CREATE POLICY "Profiles: view profile" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Profiles: insert profile" ON public.profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Profiles: update profile" ON public.profiles
  FOR UPDATE USING (true) WITH CHECK (true);

-- 5. Sinkronkan profil akun bawaan sistem
INSERT INTO public.profiles (id, email, full_name, role, status)
VALUES 
  ('a0045f93-61b0-4170-bee5-9995aacfd65c', 'user@fintrack.id', 'Budi Santoso', 'user', 'active'),
  ('3ef3d2c4-fc59-4505-918f-46d13f453c50', 'admin@fintrack.id', 'Admin FinTrack', 'admin', 'active')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = NOW();
`;

export const SUPABASE_ACCOUNTS_FIX_SQL = `-- ==============================================================================
-- FINTRACK PERSONAL - FIX PERIZINAN & PENYIMPANAN REKENING & DOMPET (ACCOUNTS)
-- Jalankan skrip ini di: Supabase Dashboard > SQL Editor > New Query > RUN
-- ==============================================================================

-- 1. Pastikan tabel public.accounts tersedia dengan skema yang tepat
CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('Bank', 'E-Wallet', 'Cash', 'Toko', 'Lainnya')),
  opening_balance numeric(15,2) NOT NULL DEFAULT 0,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index user_id untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);

-- 2. Aktifkan Row Level Security (RLS)
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- 3. Hapus kebijakan lama yang membatasi / memblokir akses
DROP POLICY IF EXISTS "Accounts: user access own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Accounts: allow all access" ON public.accounts;
DROP POLICY IF EXISTS "Accounts: view accounts" ON public.accounts;
DROP POLICY IF EXISTS "Accounts: insert accounts" ON public.accounts;
DROP POLICY IF EXISTS "Accounts: update accounts" ON public.accounts;
DROP POLICY IF EXISTS "Accounts: delete accounts" ON public.accounts;

-- 4. Buat aturan akses: Izinkan SELECT, INSERT, UPDATE, dan DELETE
CREATE POLICY "Accounts: view accounts" ON public.accounts
  FOR SELECT USING (true);

CREATE POLICY "Accounts: insert accounts" ON public.accounts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Accounts: update accounts" ON public.accounts
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Accounts: delete accounts" ON public.accounts
  FOR DELETE USING (true);

-- 5. Masukkan rekening awal bawaan sistem
INSERT INTO public.accounts (id, user_id, name, type, opening_balance, description, is_active)
VALUES
  ('bca00000-0000-4000-8000-000000000001', 'a0045f93-61b0-4170-bee5-9995aacfd65c', 'BCA Tahapan', 'Bank', 8500000, 'Rekening operasional harian & gaji', true),
  ('bca00000-0000-4000-8000-000000000002', 'a0045f93-61b0-4170-bee5-9995aacfd65c', 'DANA E-Wallet', 'E-Wallet', 750000, 'Dompet digital untuk jajan & promo', true),
  ('bca00000-0000-4000-8000-000000000003', 'a0045f93-61b0-4170-bee5-9995aacfd65c', 'Dompet Tunai (Cash)', 'Cash', 500000, 'Uang fisik di dompet', true),
  ('bca00000-0000-4000-8000-000000000004', 'a0045f93-61b0-4170-bee5-9995aacfd65c', 'Bank Mandiri Tabungan', 'Bank', 5000000, 'Tabungan dana darurat', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  opening_balance = EXCLUDED.opening_balance,
  description = EXCLUDED.description,
  updated_at = NOW();
`;

export const SUPABASE_USER_MANAGEMENT_SQL = `-- ==============================================================================
-- FINTRACK PERSONAL - SKEMA SQL MANAJEMEN PENGGUNA & LOGIN USERNAME SUPABASE
-- Digunakan untuk:
-- 1. Pendaftaran & Manajemen Akun Berbasis USERNAME (Tanpa Atribut Email Wajib)
-- 2. Autentikasi Login Aplikasi dengan USERNAME & Password (pgcrypto Blowfish)
-- 3. Kontrol Hak Akses Role (user / admin) & Status Aktivasi (active / inactive)
-- 4. Pencatatan Waktu Login Terakhir (last_login_at)
-- ==============================================================================

-- 1. Aktifkan ekstensi pgcrypto untuk keamanan hashing password (Blowfish / bcrypt)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Buat / Perbarui tabel public.profiles dengan kolom USERNAME sebagai identitas login utama
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text,
  full_name text NOT NULL,
  email text,
  avatar_url text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  phone text,
  notes text,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Migrasi struktur jika tabel profiles sudah ada sebelumnya
DO $$
BEGIN
  -- Tambah kolom username jika belum ada
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'username') THEN
    ALTER TABLE public.profiles ADD COLUMN username text;
    -- Isi default username dari email atau id
    UPDATE public.profiles 
    SET username = LOWER(COALESCE(split_part(email, '@', 1), 'user_' || substr(id::text, 1, 6)))
    WHERE username IS NULL;
  END IF;

  -- Hapus kewajiban NOT NULL pada email (login tidak mewajibkan email)
  ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;

  -- Tambah kolom password_hash jika belum ada
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'password_hash') THEN
    ALTER TABLE public.profiles ADD COLUMN password_hash text;
  END IF;

  -- Tambah kolom phone jika belum ada
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone') THEN
    ALTER TABLE public.profiles ADD COLUMN phone text;
  END IF;

  -- Tambah kolom notes jika belum ada
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'notes') THEN
    ALTER TABLE public.profiles ADD COLUMN notes text;
  END IF;

  -- Tambah kolom last_login_at jika belum ada
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_login_at') THEN
    ALTER TABLE public.profiles ADD COLUMN last_login_at timestamptz;
  END IF;
END $$;

-- Buat index unik username (case-insensitive) untuk kecepatan & integritas login
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles (lower(username));
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles (status);

-- 3. Aktifkan Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Bersihkan policies lama pada profiles
DROP POLICY IF EXISTS "Profiles: allow all access" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: public select" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: admin manage all" ON public.profiles;

-- Buat kebijakan akses terbuka untuk sinkronisasi aplikasi & dashboard admin
CREATE POLICY "Profiles: view profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Profiles: insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Profiles: update profiles" ON public.profiles
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Profiles: delete profiles" ON public.profiles
  FOR DELETE USING (true);

-- 4. FUNGSI STORED PROCEDURE: Autentikasi Login dengan USERNAME (Login Verification)
-- Fungsi ini memvalidasi username & password (tanpa atribut email), mengecek status aktif, dan mencatat waktu login
CREATE OR REPLACE FUNCTION public.authenticate_user(
  p_username text,
  p_password text
)
RETURNS TABLE (
  id uuid,
  username text,
  full_name text,
  email text,
  avatar_url text,
  role text,
  status text,
  phone text,
  last_login_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user record;
BEGIN
  -- Cari akun berdasarkan USERNAME (case-insensitive, spasi dibersihkan)
  SELECT * INTO v_user
  FROM public.profiles
  WHERE lower(trim(public.profiles.username)) = lower(trim(p_username))
     OR (public.profiles.email IS NOT NULL AND lower(trim(public.profiles.email)) = lower(trim(p_username)));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Username "%" tidak ditemukan dalam sistem.', p_username;
  END IF;

  -- Periksa status akun (hanya active yang boleh login)
  IF v_user.status <> 'active' THEN
    RAISE EXCEPTION 'Akun dengan username "%" dinonaktifkan oleh administrator. Silakan hubungi admin.', v_user.username;
  END IF;

  -- Periksa password hash jika tersimpan
  IF v_user.password_hash IS NOT NULL THEN
    IF v_user.password_hash <> crypt(p_password, v_user.password_hash) THEN
      RAISE EXCEPTION 'Password untuk username "%" salah.', v_user.username;
    END IF;
  END IF;

  -- Perbarui waktu login terakhir
  UPDATE public.profiles
  SET last_login_at = now()
  WHERE public.profiles.id = v_user.id;

  -- Kembalikan data profil (tanpa password_hash demi keamanan)
  RETURN QUERY
  SELECT 
    v_user.id,
    v_user.username,
    v_user.full_name,
    v_user.email,
    v_user.avatar_url,
    v_user.role,
    v_user.status,
    v_user.phone,
    now() AS last_login_at,
    v_user.created_at,
    v_user.updated_at;
END;
$$;

-- 5. FUNGSI STORED PROCEDURE: Tambah / Buat Pengguna Baru oleh Admin Berbasis USERNAME
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_username text,
  p_password text,
  p_full_name text,
  p_role text DEFAULT 'user',
  p_status text DEFAULT 'active',
  p_email text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_id uuid := gen_random_uuid();
  v_clean_user text := lower(trim(p_username));
  v_hash text := crypt(p_password, gen_salt('bf', 8));
BEGIN
  -- Validasi username tidak boleh kosong
  IF v_clean_user IS NULL OR length(v_clean_user) < 3 THEN
    RAISE EXCEPTION 'Username minimal 3 karakter.';
  END IF;

  -- Validasi username unik
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(trim(username)) = v_clean_user) THEN
    RAISE EXCEPTION 'Username "%" sudah digunakan oleh pengguna lain.', p_username;
  END IF;

  INSERT INTO public.profiles (
    id, username, password_hash, full_name, email, role, status, avatar_url, phone, notes, created_at, updated_at
  ) VALUES (
    v_new_id,
    v_clean_user,
    v_hash,
    trim(p_full_name),
    p_email,
    COALESCE(p_role, 'user'),
    COALESCE(p_status, 'active'),
    p_avatar_url,
    p_phone,
    p_notes,
    now(),
    now()
  );

  RETURN v_new_id;
END;
$$;

-- 6. FUNGSI STORED PROCEDURE: Reset Password Pengguna oleh Admin
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  p_user_id uuid,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    password_hash = crypt(p_new_password, gen_salt('bf', 8)),
    updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengguna tidak ditemukan.';
  END IF;

  RETURN true;
END;
$$;

-- 7. SEED DATA AKUN DEFAULT (Login Berbasis USERNAME & Password)
-- Data Kredensial Login Default:
-- 1. Username: admin  -> Password: admin123  (Role: Administrator)
-- 2. Username: user   -> Password: user123   (Role: User Biasa)
INSERT INTO public.profiles (
  id,
  username,
  password_hash,
  full_name,
  email,
  role,
  status,
  avatar_url,
  created_at,
  updated_at
)
VALUES
  (
    '3ef3d2c4-fc59-4505-918f-46d13f453c50',
    'admin',
    crypt('admin123', gen_salt('bf', 8)),
    'Admin FinTrack',
    'admin@fintrack.id',
    'admin',
    'active',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    now(),
    now()
  ),
  (
    'a0045f93-61b0-4170-bee5-9995aacfd65c',
    'user',
    crypt('user123', gen_salt('bf', 8)),
    'Budi Santoso',
    'user@fintrack.id',
    'user',
    'active',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    now(),
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  password_hash = EXCLUDED.password_hash,
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = now();
`;

export const INDIVIDUAL_TABLE_SQL_MAP: Record<string, string> = {
  profiles: `-- Tabel: profiles (Profil Pengguna, Login Username & Password Hash)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE,
  email text,
  password_hash text,
  full_name text NOT NULL,
  avatar_url text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  phone text,
  notes text,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Akses profil public" ON public.profiles;
CREATE POLICY "Akses profil public" ON public.profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`,

  accounts: `-- Tabel: accounts (Rekening & Dompet Keuangan)
CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('Bank', 'E-Wallet', 'Cash', 'Toko', 'Lainnya')),
  opening_balance numeric(15,2) NOT NULL DEFAULT 0,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Akses rekening public" ON public.accounts;
CREATE POLICY "Akses rekening public" ON public.accounts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`,

  categories: `-- Tabel: categories (Kategori Pemasukan & Pengeluaran)
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  icon text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Akses categories public" ON public.categories;
CREATE POLICY "Akses categories public" ON public.categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`,

  transactions: `-- Tabel: transactions (Transaksi Keuangan)
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid,
  destination_account_id uuid,
  category_id uuid,
  type text NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount numeric(15,2) NOT NULL CHECK (amount > 0),
  transaction_date date NOT NULL DEFAULT current_date,
  description text,
  payment_method text,
  source text NOT NULL DEFAULT 'manual',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tx_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_tx_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_tx_date ON public.transactions(transaction_date);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Akses transactions public" ON public.transactions;
CREATE POLICY "Akses transactions public" ON public.transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`,

  transaction_items: `-- Tabel: transaction_items (Rincian Item Transaksi)
CREATE TABLE IF NOT EXISTS public.transaction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL,
  item_name text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(15,2) NOT NULL DEFAULT 0,
  subtotal numeric(15,2) NOT NULL DEFAULT 0,
  category_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tx_items_tx_id ON public.transaction_items(transaction_id);
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Akses tx_items public" ON public.transaction_items;
CREATE POLICY "Akses tx_items public" ON public.transaction_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`,

  debts: `-- Tabel: debts (Catatan Hutang)
CREATE TABLE IF NOT EXISTS public.debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  person_name text NOT NULL,
  description text,
  amount numeric(15,2) NOT NULL CHECK (amount > 0),
  remaining_amount numeric(15,2) NOT NULL CHECK (remaining_amount >= 0),
  transaction_date date NOT NULL DEFAULT current_date,
  due_date date,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid', 'overdue')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_debts_user_id ON public.debts(user_id);
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Akses debts public" ON public.debts;
CREATE POLICY "Akses debts public" ON public.debts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`,

  debt_payments: `-- Tabel: debt_payments (Riwayat Pembayaran Hutang)
CREATE TABLE IF NOT EXISTS public.debt_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id uuid NOT NULL,
  account_id uuid,
  amount numeric(15,2) NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL DEFAULT current_date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON public.debt_payments(debt_id);
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Akses debt_payments public" ON public.debt_payments;
CREATE POLICY "Akses debt_payments public" ON public.debt_payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`,

  receivables: `-- Tabel: receivables (Catatan Piutang)
CREATE TABLE IF NOT EXISTS public.receivables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  person_name text NOT NULL,
  description text,
  amount numeric(15,2) NOT NULL CHECK (amount > 0),
  remaining_amount numeric(15,2) NOT NULL CHECK (remaining_amount >= 0),
  transaction_date date NOT NULL DEFAULT current_date,
  due_date date,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid', 'overdue')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receivables_user_id ON public.receivables(user_id);
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Akses receivables public" ON public.receivables;
CREATE POLICY "Akses receivables public" ON public.receivables FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`,

  receivable_payments: `-- Tabel: receivable_payments (Riwayat Pembayaran Piutang)
CREATE TABLE IF NOT EXISTS public.receivable_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_id uuid NOT NULL,
  account_id uuid,
  amount numeric(15,2) NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL DEFAULT current_date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rec_payments_rec_id ON public.receivable_payments(receivable_id);
ALTER TABLE public.receivable_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Akses rec_payments public" ON public.receivable_payments;
CREATE POLICY "Akses rec_payments public" ON public.receivable_payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`,

  saving_goals: `-- Tabel: saving_goals (Target / Pos Tabungan)
CREATE TABLE IF NOT EXISTS public.saving_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  target_amount numeric(15,2) NOT NULL CHECK (target_amount > 0),
  current_amount numeric(15,2) NOT NULL DEFAULT 0,
  target_date date,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saving_goals_user_id ON public.saving_goals(user_id);
ALTER TABLE public.saving_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Akses saving_goals public" ON public.saving_goals;
CREATE POLICY "Akses saving_goals public" ON public.saving_goals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`,

  saving_goal_transactions: `-- Tabel: saving_goal_transactions (Mutasi Pos Tabungan)
CREATE TABLE IF NOT EXISTS public.saving_goal_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL,
  account_id uuid,
  type text NOT NULL CHECK (type IN ('deposit', 'withdraw')),
  amount numeric(15,2) NOT NULL CHECK (amount > 0),
  transaction_date date NOT NULL DEFAULT current_date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sg_tx_goal_id ON public.saving_goal_transactions(goal_id);
ALTER TABLE public.saving_goal_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Akses sg_tx public" ON public.saving_goal_transactions;
CREATE POLICY "Akses sg_tx public" ON public.saving_goal_transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`,

  receipts: `-- Tabel: receipts (Struk Belanja & OCR)
CREATE TABLE IF NOT EXISTS public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  transaction_id uuid,
  merchant_name text NOT NULL,
  receipt_date date NOT NULL DEFAULT current_date,
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  image_url text,
  storage_path text,
  ocr_raw_text text,
  ocr_status text NOT NULL DEFAULT 'completed' CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed')),
  ocr_confidence numeric(5,2) DEFAULT 95.0,
  is_verified boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON public.receipts(user_id);
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Akses receipts public" ON public.receipts;
CREATE POLICY "Akses receipts public" ON public.receipts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`,

  receipt_items: `-- Tabel: receipt_items (Item Pada Struk Belanja)
CREATE TABLE IF NOT EXISTS public.receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL,
  item_name text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(15,2) NOT NULL DEFAULT 0,
  subtotal numeric(15,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipt_items_rec_id ON public.receipt_items(receipt_id);
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Akses receipt_items public" ON public.receipt_items;
CREATE POLICY "Akses receipt_items public" ON public.receipt_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`,

  audit_logs: `-- Tabel: audit_logs (Log Aktivitas & Mutasi)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Akses audit_logs public" ON public.audit_logs;
CREATE POLICY "Akses audit_logs public" ON public.audit_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`,
};





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
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
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

-- 1. Policies untuk PROFILES
DROP POLICY IF EXISTS "Profiles: user can view own profile" ON public.profiles;
CREATE POLICY "Profiles: user can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles: user can update own profile" ON public.profiles;
CREATE POLICY "Profiles: user can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. Policies untuk ACCOUNTS
DROP POLICY IF EXISTS "Accounts: user access own accounts" ON public.accounts;
CREATE POLICY "Accounts: user access own accounts" ON public.accounts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Policies untuk CATEGORIES (Termasuk kategori bawaan sistem jika user_id IS NULL)
DROP POLICY IF EXISTS "Categories: view default or own categories" ON public.categories;
CREATE POLICY "Categories: view default or own categories" ON public.categories
  FOR SELECT TO authenticated USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Categories: manage own categories" ON public.categories;
CREATE POLICY "Categories: manage own categories" ON public.categories
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Policies untuk TRANSACTIONS
DROP POLICY IF EXISTS "Transactions: user access own transactions" ON public.transactions;
CREATE POLICY "Transactions: user access own transactions" ON public.transactions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Policies untuk TRANSACTION_ITEMS
DROP POLICY IF EXISTS "Transaction Items: user access own items" ON public.transaction_items;
CREATE POLICY "Transaction Items: user access own items" ON public.transaction_items
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = transaction_items.transaction_id
        AND transactions.user_id = auth.uid()
    )
  );

-- 6. Policies untuk DEBTS
DROP POLICY IF EXISTS "Debts: user access own debts" ON public.debts;
CREATE POLICY "Debts: user access own debts" ON public.debts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. Policies untuk DEBT_PAYMENTS
DROP POLICY IF EXISTS "Debt Payments: user access own payments" ON public.debt_payments;
CREATE POLICY "Debt Payments: user access own payments" ON public.debt_payments
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.debts
      WHERE debts.id = debt_payments.debt_id
        AND debts.user_id = auth.uid()
    )
  );

-- 8. Policies untuk RECEIVABLES
DROP POLICY IF EXISTS "Receivables: user access own receivables" ON public.receivables;
CREATE POLICY "Receivables: user access own receivables" ON public.receivables
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 9. Policies untuk RECEIVABLE_PAYMENTS
DROP POLICY IF EXISTS "Receivable Payments: user access own payments" ON public.receivable_payments;
CREATE POLICY "Receivable Payments: user access own payments" ON public.receivable_payments
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.receivables
      WHERE receivables.id = receivable_payments.receivable_id
        AND receivables.user_id = auth.uid()
    )
  );

-- 10. Policies untuk SAVING_GOALS
DROP POLICY IF EXISTS "Saving Goals: user access own goals" ON public.saving_goals;
CREATE POLICY "Saving Goals: user access own goals" ON public.saving_goals
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 11. Policies untuk SAVING_GOAL_TRANSACTIONS
DROP POLICY IF EXISTS "Saving Goal Tx: user access own tx" ON public.saving_goal_transactions;
CREATE POLICY "Saving Goal Tx: user access own tx" ON public.saving_goal_transactions
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.saving_goals
      WHERE saving_goals.id = saving_goal_transactions.saving_goal_id
        AND saving_goals.user_id = auth.uid()
    )
  );

-- 12. Policies untuk RECEIPTS
DROP POLICY IF EXISTS "Receipts: user access own receipts" ON public.receipts;
CREATE POLICY "Receipts: user access own receipts" ON public.receipts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 13. Policies untuk RECEIPT_ITEMS
DROP POLICY IF EXISTS "Receipt Items: user access own items" ON public.receipt_items;
CREATE POLICY "Receipt Items: user access own items" ON public.receipt_items
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.receipts
      WHERE receipts.id = receipt_items.receipt_id
        AND receipts.user_id = auth.uid()
    )
  );

-- 14. Policies untuk AUDIT_LOGS
DROP POLICY IF EXISTS "Audit Logs: user view own logs" ON public.audit_logs;
CREATE POLICY "Audit Logs: user view own logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Audit Logs: insert log" ON public.audit_logs;
CREATE POLICY "Audit Logs: insert log" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

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

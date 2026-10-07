import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default Supabase project credentials provided
export const DEFAULT_SUPABASE_URL = 'https://pmrvbxtplamtqhmtsibi.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_8Y4HPH9TLXqSqnRqbHWexw_OL-kuKII';
export const DEFAULT_STORAGE_BUCKET = 'app-files-struk';

// Check environment variables or custom local storage settings
const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const savedUrl = typeof window !== 'undefined' ? localStorage.getItem('fintrack_supabase_url') || '' : '';
const savedKey = typeof window !== 'undefined' ? localStorage.getItem('fintrack_supabase_key') || '' : '';

export const activeSupabaseUrl = envUrl || savedUrl || DEFAULT_SUPABASE_URL;
export const activeSupabaseAnonKey = envKey || savedKey || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  activeSupabaseUrl &&
  activeSupabaseAnonKey &&
  activeSupabaseUrl.startsWith('https://')
);

let client: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    client = createClient(activeSupabaseUrl, activeSupabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
  }
}

export const supabase = client;

// Storage Bucket settings
export function getReceiptsBucketName(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('fintrack_storage_bucket') || DEFAULT_STORAGE_BUCKET;
  }
  return DEFAULT_STORAGE_BUCKET;
}

export function setReceiptsBucketName(bucketName: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('fintrack_storage_bucket', bucketName.trim() || DEFAULT_STORAGE_BUCKET);
  }
}

/**
 * Utility to convert data URL to Blob
 */
export function dataURLtoBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Upload receipt image to Supabase Storage bucket 'app-files-struk'
 */
export async function uploadReceiptToStorage(
  fileOrDataUrl: File | Blob | string,
  userId: string,
  customFileName?: string
): Promise<{ success: boolean; url: string; path?: string; error?: string }> {
  if (!supabase) {
    return { success: false, url: '', error: 'Klien Supabase belum aktif' };
  }

  const bucketName = getReceiptsBucketName();
  const timestamp = Date.now();
  const rand = Math.random().toString(36).substring(2, 7);
  const fileName = customFileName || `${timestamp}_${rand}.jpg`;
  const filePath = `${userId}/${fileName}`;

  try {
    let blob: Blob;
    if (typeof fileOrDataUrl === 'string') {
      if (fileOrDataUrl.startsWith('data:')) {
        blob = dataURLtoBlob(fileOrDataUrl);
      } else {
        // already an external URL
        return { success: true, url: fileOrDataUrl, path: fileOrDataUrl };
      }
    } else {
      blob = fileOrDataUrl;
    }

    const { data, error } = await supabase.storage.from(bucketName).upload(filePath, blob, {
      contentType: blob.type || 'image/jpeg',
      cacheControl: '3600',
      upsert: true,
    });

    if (error) {
      console.warn(`[Supabase Storage] Upload to bucket '${bucketName}' error:`, error);
      return { success: false, url: '', error: error.message };
    }

    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(data.path);
    return {
      success: true,
      url: publicUrlData.publicUrl,
      path: data.path,
    };
  } catch (err: any) {
    console.error('[Supabase Storage] Upload error:', err);
    return { success: false, url: '', error: err.message || 'Gagal mengunggah berkas struk ke storage' };
  }
}

/**
 * Upload user profile avatar to Supabase Storage
 */
export async function uploadAvatarToStorage(
  fileOrDataUrl: File | Blob | string,
  userId: string
): Promise<{ success: boolean; url: string; error?: string }> {
  if (!supabase) {
    return { success: false, url: '', error: 'Klien Supabase belum aktif' };
  }

  const bucketName = getReceiptsBucketName();
  const timestamp = Date.now();
  const filePath = `avatars/${userId}_${timestamp}.jpg`;

  try {
    let blob: Blob;
    if (typeof fileOrDataUrl === 'string') {
      if (fileOrDataUrl.startsWith('data:')) {
        blob = dataURLtoBlob(fileOrDataUrl);
      } else {
        return { success: true, url: fileOrDataUrl };
      }
    } else {
      blob = fileOrDataUrl;
    }

    const { data, error } = await supabase.storage.from(bucketName).upload(filePath, blob, {
      contentType: blob.type || 'image/jpeg',
      cacheControl: '3600',
      upsert: true,
    });

    if (error) {
      console.warn('[Supabase Storage] Upload avatar error:', error);
      return { success: false, url: '', error: error.message };
    }

    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(data.path);
    return {
      success: true,
      url: publicUrlData.publicUrl,
    };
  } catch (err: any) {
    console.error('[Supabase Storage] Upload avatar error:', err);
    return { success: false, url: '', error: err.message || 'Gagal mengunggah foto profil' };
  }
}

/**
 * Test connectivity & permissions for 'profiles' table in Supabase
 */
export async function testProfilesTableConnectivity(): Promise<{
  success: boolean;
  message: string;
  hasRlsIssue?: boolean;
  count?: number;
}> {
  if (!supabase) {
    return { success: false, message: 'Klien Supabase belum terkonfigurasi' };
  }

  try {
    // 1. Test read
    const { data, error } = await supabase.from('profiles').select('id, full_name, email, role').limit(5);
    if (error) {
      if (error.code === '42501') {
        return {
          success: false,
          hasRlsIssue: true,
          message: 'Kebijakan RLS (Row Level Security) pada tabel profiles belum mengizinkan akses. Jalankan skrip SQL perbaikan profil di menu Pengaturan.',
        };
      }
      if (error.code === '42P01') {
        return {
          success: false,
          message: 'Tabel profiles belum dibuat di database Supabase. Jalankan skema SQL di SQL Editor.',
        };
      }
      return {
        success: false,
        message: `Gagal membaca tabel profiles: ${error.message} (${error.code})`,
      };
    }

    return {
      success: true,
      message: `Tabel profiles berhasil diakses di database Supabase (${data?.length || 0} profil ditemukan).`,
      count: data?.length || 0,
    };
  } catch (e: any) {
    return {
      success: false,
      message: e.message || 'Terjadi kesalahan saat menguji tabel profiles',
    };
  }
}

/**
 * Test connectivity & permissions for 'accounts' table in Supabase
 */
export async function testAccountsTableConnectivity(): Promise<{
  success: boolean;
  message: string;
  hasRlsIssue?: boolean;
  count?: number;
  canWrite?: boolean;
}> {
  if (!supabase) {
    return { success: false, message: 'Klien Supabase belum terkonfigurasi' };
  }

  try {
    // 1. Test read on accounts
    const { data, error } = await supabase.from('accounts').select('id, name, type, opening_balance, user_id').limit(10);
    if (error) {
      if (error.code === '42501') {
        return {
          success: false,
          hasRlsIssue: true,
          message: 'Kebijakan RLS (Row Level Security) pada tabel accounts memblokir pembacaan. Jalankan skrip SQL perbaikan rekening di menu Pengaturan.',
        };
      }
      if (error.code === '42P01') {
        return {
          success: false,
          message: 'Tabel accounts belum dibuat di database Supabase. Jalankan skrip SQL skema rekening di menu Pengaturan.',
        };
      }
      return {
        success: false,
        message: `Gagal membaca tabel accounts: ${error.message} (${error.code})`,
      };
    }

    // 2. Test write permission (insert a dry probe or check permissions)
    const testId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'bca00000-0000-4000-8000-999999999999';
    const testUserId = 'a0045f93-61b0-4170-bee5-9995aacfd65c';
    const writeRes = await supabase.from('accounts').insert({
      id: testId,
      user_id: testUserId,
      name: '__probe_test__',
      type: 'Bank',
      opening_balance: 0,
      description: 'temporary test probe',
      is_active: false,
    }).select().maybeSingle();

    if (writeRes.error) {
      if (writeRes.error.code === '42501') {
        return {
          success: false,
          hasRlsIssue: true,
          canWrite: false,
          count: data?.length || 0,
          message: 'Tabel accounts dapat dibaca, tetapi hak TULIS (INSERT) diblokir oleh kebijakan RLS (error 42501). Jalankan skrip SQL perbaikan rekening.',
        };
      }
      return {
        success: false,
        canWrite: false,
        count: data?.length || 0,
        message: `Izin simpan rekening terkendala: ${writeRes.error.message} (${writeRes.error.code})`,
      };
    }

    // Clean up probe row
    await supabase.from('accounts').delete().eq('id', testId);

    return {
      success: true,
      canWrite: true,
      count: data?.length || 0,
      message: `Tabel accounts terhubung penuh (baca & tulis berhasil, ditemukan ${data?.length || 0} rekening di database).`,
    };
  } catch (e: any) {
    return {
      success: false,
      message: e.message || 'Terjadi kesalahan saat menguji tabel accounts',
    };
  }
}

/**
 * Test connectivity to Supabase Storage Bucket
 */
export async function testStorageBucketConnectivity(bucketName?: string): Promise<{ success: boolean; message: string; filesCount?: number }> {
  if (!supabase) {
    return { success: false, message: 'Supabase client belum terhubung' };
  }
  const targetBucket = bucketName || getReceiptsBucketName();
  try {
    const { data, error } = await supabase.storage.from(targetBucket).list('', { limit: 1 });
    if (error) {
      return {
        success: false,
        message: `Bucket '${targetBucket}' belum siap: ${error.message}. Pastikan bucket telah dibuat di dashboard Supabase atau jalankan script SQL.`,
      };
    }
    return {
      success: true,
      message: `Bucket '${targetBucket}' aktif dan siap digunakan!`,
      filesCount: data?.length || 0,
    };
  } catch (e: any) {
    return { success: false, message: e.message || 'Gagal memeriksa bucket storage' };
  }
}

export interface TableStatus {
  name: string;
  label: string;
  exists: boolean;
  canRead: boolean;
  canWrite: boolean;
  count: number;
  hasRlsIssue: boolean;
  error?: string;
}

/**
 * Test connectivity & permissions for a single table in Supabase
 */
export async function testTableHealth(tableName: string, label: string): Promise<TableStatus> {
  if (!supabase) {
    return {
      name: tableName,
      label,
      exists: false,
      canRead: false,
      canWrite: false,
      count: 0,
      hasRlsIssue: false,
      error: 'Klien Supabase belum terkonfigurasi',
    };
  }

  try {
    const { data, count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: false })
      .limit(1);

    if (error) {
      const isRls = error.code === '42501';
      const notFound = error.code === '42P01';
      return {
        name: tableName,
        label,
        exists: !notFound,
        canRead: false,
        canWrite: false,
        count: 0,
        hasRlsIssue: isRls,
        error: notFound
          ? `Tabel ${tableName} belum ada di Supabase.`
          : isRls
          ? `Kebijakan RLS membatasi pembacaan tabel ${tableName} (42501).`
          : error.message,
      };
    }

    return {
      name: tableName,
      label,
      exists: true,
      canRead: true,
      canWrite: true,
      count: typeof count === 'number' ? count : (data?.length || 0),
      hasRlsIssue: false,
    };
  } catch (e: any) {
    return {
      name: tableName,
      label,
      exists: false,
      canRead: false,
      canWrite: false,
      count: 0,
      hasRlsIssue: false,
      error: e.message || 'Gagal memeriksa tabel',
    };
  }
}

/**
 * Test connectivity for ALL 14 core application tables in Supabase
 */
export async function testAllTablesConnectivity(): Promise<{
  allReady: boolean;
  totalTables: number;
  readyTablesCount: number;
  tables: TableStatus[];
  storageBucketReady: boolean;
  storageMessage: string;
}> {
  const tableDefinitions = [
    { name: 'profiles', label: 'Profil Pengguna & Autentikasi' },
    { name: 'accounts', label: 'Rekening & Dompet Keuangan' },
    { name: 'categories', label: 'Kategori Pemasukan & Pengeluaran' },
    { name: 'transactions', label: 'Transaksi Keuangan' },
    { name: 'transaction_items', label: 'Rincian Item Transaksi' },
    { name: 'debts', label: 'Daftar Hutang' },
    { name: 'debt_payments', label: 'Riwayat Pembayaran Hutang' },
    { name: 'receivables', label: 'Daftar Piutang' },
    { name: 'receivable_payments', label: 'Riwayat Pembayaran Piutang' },
    { name: 'saving_goals', label: 'Target / Pos Tabungan' },
    { name: 'saving_goal_transactions', label: 'Riwayat Mutasi Tabungan' },
    { name: 'receipts', label: 'Data Struk Belanja' },
    { name: 'receipt_items', label: 'Item Produk Struk' },
    { name: 'audit_logs', label: 'Log Audit & Aktivitas' },
  ];

  const results = await Promise.all(
    tableDefinitions.map((t) => testTableHealth(t.name, t.label))
  );

  const storageRes = await testStorageBucketConnectivity();

  const readyTablesCount = results.filter((r) => r.exists && r.canRead).length;
  const allReady = readyTablesCount === tableDefinitions.length && storageRes.success;

  return {
    allReady,
    totalTables: tableDefinitions.length,
    readyTablesCount,
    tables: results,
    storageBucketReady: storageRes.success,
    storageMessage: storageRes.message,
  };
}

/**
 * Ensure storage bucket exists
 */
export async function ensureStorageBucket(bucketName: string = DEFAULT_STORAGE_BUCKET): Promise<{ success: boolean; message: string }> {
  if (!supabase) {
    return { success: false, message: 'Klien Supabase belum aktif' };
  }
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (!listError && buckets) {
      const found = buckets.some((b) => b.name === bucketName);
      if (found) {
        return { success: true, message: `Bucket '${bucketName}' sudah ada dan siap.` };
      }
    }
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 10485760, // 10MB
    });
    if (error) {
      return { success: false, message: `Gagal membuat bucket '${bucketName}': ${error.message}` };
    }
    return { success: true, message: `Bucket '${bucketName}' berhasil dibuat di Supabase Storage!` };
  } catch (e: any) {
    return { success: false, message: e.message || 'Gagal membuat bucket storage' };
  }
}

export function configureSupabase(url: string, key: string): { success: boolean; client: SupabaseClient | null; error?: string } {
  try {
    if (!url || !key) {
      localStorage.removeItem('fintrack_supabase_url');
      localStorage.removeItem('fintrack_supabase_key');
      client = null;
      return { success: true, client: null };
    }

    if (!url.startsWith('https://')) {
      return { success: false, client: null, error: 'URL Supabase harus diawali dengan https://' };
    }

    const testClient = createClient(url, key);
    localStorage.setItem('fintrack_supabase_url', url);
    localStorage.setItem('fintrack_supabase_key', key);
    client = testClient;
    return { success: true, client };
  } catch (e: any) {
    return { success: false, client: null, error: e.message || 'Konfigurasi tidak valid' };
  }
}

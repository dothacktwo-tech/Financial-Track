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

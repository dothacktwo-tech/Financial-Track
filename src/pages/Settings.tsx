import React, { useState, useEffect } from 'react';
import {
  Database,
  Key,
  Copy,
  Check,
  ShieldCheck,
  User,
  Save,
  RefreshCw,
  ExternalLink,
  Code2,
  Terminal,
  FolderOpen,
  Image as ImageIcon,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import {
  activeSupabaseUrl,
  activeSupabaseAnonKey,
  configureSupabase,
  isSupabaseConfigured,
  getReceiptsBucketName,
  setReceiptsBucketName,
  testStorageBucketConnectivity,
} from '../lib/supabase';
import { SUPABASE_SCHEMA_SQL, SUPABASE_STORAGE_SQL } from '../lib/schemaSql';

export const Settings: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const { showToast } = useToast();

  // Supabase connection state
  const [supabaseUrl, setSupabaseUrl] = useState(activeSupabaseUrl || 'https://pmrvbxtplamtqhmtsibi.supabase.co');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(activeSupabaseAnonKey || 'sb_publishable_8Y4HPH9TLXqSqnRqbHWexw_OL-kuKII');
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Storage Bucket state
  const [storageBucket, setStorageBucketState] = useState(getReceiptsBucketName() || 'app-files-struk');
  const [isTestingStorage, setIsTestingStorage] = useState(false);
  const [storageStatus, setStorageStatus] = useState<{ checked: boolean; success: boolean; message: string }>({
    checked: false,
    success: false,
    message: '',
  });

  // Profile edit state
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [profileSaving, setProfileSaving] = useState(false);

  // SQL Copy state
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedStorageSql, setCopiedStorageSql] = useState(false);

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    try {
      const result = configureSupabase(supabaseUrl.trim(), supabaseAnonKey.trim());
      if (result.success) {
        showToast('Koneksi Supabase berhasil disimpan! Memuat ulang konfigurasi...', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        showToast(result.error || 'Gagal menyambung ke Supabase', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan konfigurasi', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveStorageBucket = (e: React.FormEvent) => {
    e.preventDefault();
    setReceiptsBucketName(storageBucket);
    showToast(`Nama bucket storage disetel ke: ${storageBucket}`, 'success');
  };

  const handleTestStorage = async () => {
    setIsTestingStorage(true);
    try {
      const result = await testStorageBucketConnectivity(storageBucket);
      setStorageStatus({
        checked: true,
        success: result.success,
        message: result.message,
      });
      if (result.success) {
        showToast(result.message, 'success');
      } else {
        showToast(result.message, 'error');
      }
    } catch (e: any) {
      setStorageStatus({
        checked: true,
        success: false,
        message: e.message || 'Gagal menguji bucket',
      });
    } finally {
      setIsTestingStorage(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    showToast('SQL Schema & RLS lengkap berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleCopyStorageSql = () => {
    navigator.clipboard.writeText(SUPABASE_STORAGE_SQL);
    setCopiedStorageSql(true);
    showToast('SQL pembuatan bucket storage & RLS berhasil disalin!', 'success');
    setTimeout(() => setCopiedStorageSql(false), 2500);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !fullName.trim()) return;

    setProfileSaving(true);
    try {
      const { dataStore } = await import('../lib/dataStore');
      await dataStore.updateProfile(user.id, {
        full_name: fullName.trim(),
        avatar_url: avatarUrl.trim() || undefined,
      });
      await refreshProfile();
      showToast('Profil pengguna berhasil diperbarui!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui profil', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Pengaturan Sistem & Database
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Kelola koneksi Supabase, penyimpanan foto struk (Storage), profil pengguna, dan skema database PostgreSQL
        </p>
      </div>

      {/* Supabase Connection Setup Card */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Koneksi Database Supabase</h3>
              <p className="text-xs text-slate-500">
                Penyimpanan data cloud PostgreSQL terisolasi via Row Level Security (RLS)
              </p>
            </div>
          </div>

          <Badge variant={isSupabaseConfigured ? 'emerald' : 'slate'} size="md">
            {isSupabaseConfigured ? 'Terhubung (Cloud Active)' : 'Local Storage Engine'}
          </Badge>
        </div>

        <form onSubmit={handleSaveConnection} className="space-y-4">
          <Input
            label="Supabase Project URL"
            placeholder="https://your-project.supabase.co"
            value={supabaseUrl}
            onChange={(e) => setSupabaseUrl(e.target.value)}
            helperText="URL proyek Supabase Anda dari Project Settings > API"
            required
          />

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Supabase Anon / Publishable Key
              </label>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-[11px] font-semibold text-emerald-600 hover:underline cursor-pointer"
              >
                {showKey ? 'Sembunyikan' : 'Tampilkan'}
              </button>
            </div>
            <Input
              type={showKey ? 'text' : 'password'}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
              helperText="Anon key publik (aman digunakan di browser client)"
              required
            />
          </div>

          <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">Keamanan & Kebijakan Data:</p>
              <p className="text-slate-500 mt-0.5">
                Kunci service role backend rahasia TIDAK PERNAH disimpan di frontend. Seluruh akses
                keuangan pengguna dilindungi langsung oleh PostgreSQL Row Level Security (RLS) di server Supabase.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="submit"
              loading={isTesting}
              icon={<Save className="w-4 h-4" />}
            >
              Simpan & Hubungkan Supabase
            </Button>
          </div>
        </form>
      </Card>

      {/* Supabase Storage Bucket Setup Card: app-files-struk */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Penyimpanan Berkas Foto Struk (Supabase Storage)</h3>
              <p className="text-xs text-slate-500">
                Lokasi bucket penyimpanan berkas foto struk belanja yang di-upload dari aplikasi
              </p>
            </div>
          </div>

          <Badge variant={storageStatus.checked ? (storageStatus.success ? 'emerald' : 'rose') : 'amber'} size="md">
            Bucket: {storageBucket}
          </Badge>
        </div>

        <form onSubmit={handleSaveStorageBucket} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-2">
              <Input
                label="Nama Bucket Storage Supabase"
                placeholder="app-files-struk"
                value={storageBucket}
                onChange={(e) => setStorageBucketState(e.target.value)}
                helperText="Nama bucket di Supabase Storage (Default: app-files-struk)"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="outline" size="sm" className="flex-1">
                Simpan Nama
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleTestStorage}
                loading={isTestingStorage}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                Uji Koneksi
              </Button>
            </div>
          </div>

          {storageStatus.checked && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                storageStatus.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {storageStatus.success ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{storageStatus.message}</span>
            </div>
          )}

          <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800">Petunjuk Pembuatan Bucket di Supabase:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyStorageSql}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:underline cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedStorageSql ? 'SQL Tersalin!' : 'Salin SQL Storage Bucket'}
                </button>
                <a
                  href={`https://supabase.com/dashboard/project/pmrvbxtplamtqhmtsibi/storage/buckets`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline"
                >
                  Buka Supabase Storage <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Buat bucket publik bernama <strong>{storageBucket}</strong> di Supabase Storage dengan mengklik tombol
              &quot;Salin SQL Storage Bucket&quot; di atas lalu jalankan di SQL Editor, atau buat manual via dashboard Supabase.
            </p>
          </div>
        </form>
      </Card>

      {/* Database Schema & SQL RLS Generator Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Skema SQL Lengkap & Pengaturan RLS</h3>
              <p className="text-xs text-slate-500">
                Script SQL lengkap mencakup semua tabel, relasi, RLS, serta konfigurasi bucket <code>app-files-struk</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyStorageSql}
              icon={copiedStorageSql ? <Check className="w-4 h-4 text-emerald-600" /> : <FolderOpen className="w-4 h-4 text-amber-600" />}
            >
              {copiedStorageSql ? 'Tersalin!' : 'Salin SQL Storage'}
            </Button>
            <Button
              size="sm"
              onClick={handleCopySql}
              icon={copiedSql ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            >
              {copiedSql ? 'Tersalin ke Clipboard!' : 'Salin Semua SQL'}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>
              Petunjuk: Buka <strong>Supabase Dashboard &gt; SQL Editor &gt; New Query</strong>,
              lalu paste script di bawah dan klik <strong>Run</strong>.
            </span>
            <a
              href="https://supabase.com/dashboard/project/pmrvbxtplamtqhmtsibi/sql"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1 text-emerald-600 font-bold hover:underline"
            >
              Buka SQL Editor <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="relative rounded-2xl bg-slate-950 p-4 font-mono text-[11px] text-slate-200 overflow-x-auto max-h-72 border border-slate-800">
            <pre>{SUPABASE_SCHEMA_SQL}</pre>
          </div>
        </div>
      </Card>

      {/* Profile Management Card */}
      <Card className="p-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Profil Pengguna</h3>
            <p className="text-xs text-slate-500">Pengaturan identitas akun FinTrack Anda</p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nama Lengkap"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              label="Alamat Email"
              value={user?.email || ''}
              disabled
              helperText="Email akun terdaftar"
            />
          </div>

          <Input
            label="Avatar URL (Opsional)"
            placeholder="https://example.com/avatar.jpg"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
          />

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Role akun:{' '}
              <strong className="capitalize font-bold text-slate-800">
                {user?.role || 'user'}
              </strong>
            </span>
            <Button type="submit" loading={profileSaving} size="sm">
              Simpan Profil
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

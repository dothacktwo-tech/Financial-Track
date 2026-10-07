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
  Upload,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Sparkles,
  Layers,
  Server,
  Zap,
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
  DEFAULT_SUPABASE_URL,
  DEFAULT_SUPABASE_ANON_KEY,
  configureSupabase,
  isSupabaseConfigured,
  getReceiptsBucketName,
  setReceiptsBucketName,
  testStorageBucketConnectivity,
  testProfilesTableConnectivity,
  testAccountsTableConnectivity,
  testAllTablesConnectivity,
  ensureStorageBucket,
  uploadAvatarToStorage,
  TableStatus,
} from '../lib/supabase';
import {
  SUPABASE_SCHEMA_SQL,
  SUPABASE_STORAGE_SQL,
  SUPABASE_PROFILE_FIX_SQL,
  SUPABASE_ACCOUNTS_FIX_SQL,
  SUPABASE_USER_MANAGEMENT_SQL,
  INDIVIDUAL_TABLE_SQL_MAP,
} from '../lib/schemaSql';
import { dataStore } from '../lib/dataStore';

export const Settings: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const { showToast } = useToast();

  // Supabase connection state
  const [supabaseUrl, setSupabaseUrl] = useState(activeSupabaseUrl || DEFAULT_SUPABASE_URL);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(activeSupabaseAnonKey || DEFAULT_SUPABASE_ANON_KEY);
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
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [profileSyncWarning, setProfileSyncWarning] = useState<string | null>(null);

  // All Tables & Auto Provisioning State
  const [isInitializingTables, setIsInitializingTables] = useState(false);
  const [tablesHealth, setTablesHealth] = useState<{
    tested: boolean;
    allReady: boolean;
    totalTables: number;
    readyTablesCount: number;
    tables: TableStatus[];
    storageBucketReady: boolean;
    storageMessage: string;
  } | null>(null);

  const [autoSeedResult, setAutoSeedResult] = useState<{
    seeded: { profiles: number; categories: number; accounts: number; storage: boolean };
    messages: string[];
  } | null>(null);

  // SQL Tab Selector & Copy states
  const [activeSqlTab, setActiveSqlTab] = useState<'master' | 'users' | 'rls_fix' | 'storage' | 'individual'>('master');
  const [selectedIndividualTable, setSelectedIndividualTable] = useState<string>('profiles');
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedIndividualSql, setCopiedIndividualSql] = useState(false);

  // Sync state
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncAllResult, setSyncAllResult] = useState<{
    success: boolean;
    syncedCounts: Record<string, number>;
    errors: string[];
  } | null>(null);

  // Sync state whenever active user updates
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setAvatarUrl(user.avatar_url || '');
    }
  }, [user?.id, user?.full_name, user?.avatar_url]);

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

  const handleResetToDefault = () => {
    setSupabaseUrl(DEFAULT_SUPABASE_URL);
    setSupabaseAnonKey(DEFAULT_SUPABASE_ANON_KEY);
    showToast('Kredensial proyek Supabase bawaan telah diisikan. Klik "Simpan & Hubungkan" untuk menerapkan.', 'info');
  };

  const handleDisconnectSupabase = () => {
    configureSupabase('', '');
    setSupabaseUrl('');
    setSupabaseAnonKey('');
    showToast('Koneksi Supabase diputuskan. Aplikasi beralih ke penyimpanan lokal browser.', 'info');
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  // Automated table creation & health verification
  const handleAutoInitializeAndVerify = async () => {
    setIsInitializingTables(true);
    try {
      // 1. Ensure storage bucket
      await ensureStorageBucket(storageBucket);

      // 2. Auto-seed master data if tables exist
      const seedRes = await dataStore.autoSeedSupabaseMasterData();
      setAutoSeedResult({
        seeded: seedRes.seeded,
        messages: seedRes.messages,
      });

      // 3. Test all tables connectivity
      const health = await testAllTablesConnectivity();
      setTablesHealth({
        tested: true,
        ...health,
      });

      if (health.allReady) {
        showToast(`Luar biasa! Seluruh ${health.totalTables} tabel database & Storage Supabase siap digunakan.`, 'success');
      } else {
        showToast(
          `Pemeriksaan selesai: ${health.readyTablesCount}/${health.totalTables} tabel terdeteksi. Silakan salin & jalankan skrip SQL untuk tabel yang belum ada.`,
          'info'
        );
      }
    } catch (err: any) {
      showToast('Gagal memproses tabel: ' + err.message, 'error');
    } finally {
      setIsInitializingTables(false);
    }
  };

  // Clear local storage cache to enforce pure direct cloud mode
  const handleClearLocalCache = () => {
    if (confirm('Hapus seluruh cache lokal browser? Data akan dimuat murni langsung dari database cloud Supabase.')) {
      dataStore.clearLocalDataStoreCache();
      showToast('Cache lokal berhasil dibersihkan! Aplikasi memuat data murni dari Supabase.', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 600);
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

  const handleCopyCurrentSql = () => {
    let sqlToCopy = '';
    let label = '';
    if (activeSqlTab === 'master') {
      sqlToCopy = SUPABASE_SCHEMA_SQL;
      label = 'Skrip Master Seluruh Tabel';
    } else if (activeSqlTab === 'users') {
      sqlToCopy = SUPABASE_USER_MANAGEMENT_SQL;
      label = 'Skrip Manajemen Pengguna (Username Login)';
    } else if (activeSqlTab === 'rls_fix') {
      sqlToCopy = SUPABASE_ACCOUNTS_FIX_SQL;
      label = 'Skrip Perbaikan RLS & Hak Akses';
    } else if (activeSqlTab === 'storage') {
      sqlToCopy = SUPABASE_STORAGE_SQL;
      label = 'Skrip Bucket Storage & Struk';
    } else if (activeSqlTab === 'individual') {
      sqlToCopy = INDIVIDUAL_TABLE_SQL_MAP[selectedIndividualTable] || '';
      label = `Skrip Tabel ${selectedIndividualTable}`;
    }

    navigator.clipboard.writeText(sqlToCopy);
    setCopiedSql(true);
    showToast(`${label} berhasil disalin ke clipboard!`, 'success');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleCopySpecificTableSql = (tableName: string) => {
    const sql = INDIVIDUAL_TABLE_SQL_MAP[tableName];
    if (sql) {
      navigator.clipboard.writeText(sql);
      setCopiedIndividualSql(true);
      showToast(`Skrip SQL tabel "${tableName}" berhasil disalin!`, 'success');
      setTimeout(() => setCopiedIndividualSql(false), 2500);
    }
  };

  const handleSyncAllToSupabase = async () => {
    if (!user) return;
    setIsSyncingAll(true);
    try {
      const res = await dataStore.syncAllToSupabase(user.id);
      setSyncAllResult(res);
      if (res.success) {
        showToast('Sinkronisasi penuh berhasil! Semua transaksi, rekening, kategori, hutang, piutang, dan tabungan tersimpan di Supabase.', 'success');
      } else {
        showToast(`Sinkronisasi selesai sebagian (${res.errors.length} tabel memerlukan penyesuaian RLS/skema).`, 'info');
      }
    } catch (e: any) {
      showToast('Gagal sinkronisasi data: ' + e.message, 'error');
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsUploadingAvatar(true);
    try {
      const res = await uploadAvatarToStorage(file, user.id);
      if (res.success && res.url) {
        setAvatarUrl(res.url);
        showToast('Foto avatar berhasil diunggah ke Storage!', 'success');
      } else {
        showToast(res.error || 'Gagal mengunggah foto avatar', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan saat unggah avatar', 'error');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !fullName.trim()) return;

    setProfileSaving(true);
    setProfileSyncWarning(null);
    try {
      const updated = await dataStore.updateProfile(user.id, {
        full_name: fullName.trim(),
        avatar_url: avatarUrl.trim() || undefined,
      });
      await refreshProfile();

      if ((updated as any)._dbSyncWarning) {
        const warning = (updated as any)._dbSyncWarning;
        setProfileSyncWarning(warning);
        showToast(`Profil tersimpan. Catatan Database: ${warning}.`, 'info');
      } else {
        showToast('Profil pengguna berhasil disimpan ke database Supabase!', 'success');
      }
    } catch (err: any) {
      showToast('Gagal memperbarui profil: ' + err.message, 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header & Cloud Database Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-3xl text-white shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-emerald-400" />
            <h1 className="text-xl font-bold tracking-tight">Pengaturan Database & Supabase Cloud</h1>
          </div>
          <p className="text-xs text-slate-300 max-w-xl">
            Hubungkan aplikasi FinTrack ke PostgreSQL Supabase, buat tabel otomatis, kelola skema SQL, dan hilangkan dependensi penyimpanan lokal.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
          <Badge variant={isSupabaseConfigured ? 'emerald' : 'amber'} size="md" className="px-3.5 py-1.5 font-bold shadow">
            {isSupabaseConfigured ? '● Mode Cloud Supabase Aktif' : '○ Mode Lokal Browser'}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={handleClearLocalCache}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
            icon={<Trash2 className="w-3.5 h-3.5 text-rose-300" />}
            title="Bersihkan penyimpanan lokal browser agar data dimuat murni langsung dari database cloud Supabase"
          >
            Hapus Cache Lokal
          </Button>
        </div>
      </div>

      {/* Supabase Connection Setup Card */}
      <Card className="p-6 border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Konfigurasi Koneksi Supabase</h3>
              <p className="text-xs text-slate-500">
                URL Proyek dan Kunci Akses Publik (Anon Key) Supabase Anda
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetToDefault}
              className="text-xs"
            >
              Gunakan Default Proyek
            </Button>
            {isSupabaseConfigured && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDisconnectSupabase}
                className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs"
              >
                Putuskan Koneksi
              </Button>
            )}
          </div>
        </div>

        <form onSubmit={handleSaveConnection} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Supabase Project URL"
              placeholder="https://pmrvbxtplamtqhmtsibi.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              helperText="URL proyek Supabase PostgreSQL Anda"
              required
            />

            <div className="relative">
              <Input
                label="Supabase Anon / Public Key"
                type={showKey ? 'text' : 'password'}
                placeholder="sb_publishable_..."
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                helperText="Publishable API Anon Key dari Dashboard Supabase"
                required
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-9 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                {showKey ? 'Sembunyikan' : 'Tampilkan'}
              </button>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Proyek Aktif: <strong className="text-slate-800">{supabaseUrl || 'Belum terhubung'}</strong>
            </span>

            <Button
              type="submit"
              loading={isTesting}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              icon={<Zap className="w-4 h-4" />}
            >
              Simpan & Hubungkan Database
            </Button>
          </div>
        </form>
      </Card>

      {/* Automated Table Creator & Matrix Card */}
      <Card className="p-6 border-indigo-200 bg-gradient-to-br from-white via-indigo-50/10 to-purple-50/20 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-100 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pembuat Tabel & Inisialisasi Database Otomatis</h3>
              <p className="text-xs text-slate-500">
                Uji seluruh 14 tabel aplikasi, inisialisasi kategori & data awal, serta siapkan storage bucket secara instan
              </p>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleAutoInitializeAndVerify}
            loading={isInitializingTables}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md"
            icon={<Sparkles className="w-4 h-4" />}
          >
            {isInitializingTables ? 'Sedang Memeriksa & Menginisialisasi...' : 'Buat & Uji Seluruh Tabel Otomatis'}
          </Button>
        </div>

        {/* Auto Seed Result Feedback */}
        {autoSeedResult && (
          <div className="p-4 mb-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-xs text-indigo-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              <span>Hasil Inisialisasi Master Data:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
              <div className="bg-white p-2 rounded-xl border border-indigo-100">
                <span className="text-slate-500 block">Profil Master:</span>
                <span className="font-bold text-indigo-700">{autoSeedResult.seeded.profiles} profil</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-indigo-100">
                <span className="text-slate-500 block">Kategori Awal:</span>
                <span className="font-bold text-indigo-700">{autoSeedResult.seeded.categories} kategori</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-indigo-100">
                <span className="text-slate-500 block">Rekening Awal:</span>
                <span className="font-bold text-indigo-700">{autoSeedResult.seeded.accounts} akun</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-indigo-100">
                <span className="text-slate-500 block">Storage Bucket:</span>
                <span className="font-bold text-emerald-600">{autoSeedResult.seeded.storage ? 'Siap' : 'Belum'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Realtime Table Matrix */}
        {tablesHealth && (
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Status Koneksi Tabel Database ({tablesHealth.readyTablesCount} / {tablesHealth.totalTables} Tabel Siap):</span>
              <Badge variant={tablesHealth.allReady ? 'emerald' : 'amber'} size="sm">
                {tablesHealth.allReady ? 'Semua Tabel Terhubung Sempurna' : 'Perlu Eksekusi SQL untuk Tabel Tertentu'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {tablesHealth.tables.map((t) => (
                <div
                  key={t.name}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    t.exists && t.canRead
                      ? 'bg-white border-emerald-200 shadow-xs'
                      : 'bg-rose-50/50 border-rose-200'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      {t.exists && t.canRead ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      )}
                      <span className="font-mono truncate">{t.name}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{t.label}</p>
                    {t.exists && t.canRead ? (
                      <span className="text-[10px] text-emerald-700 font-mono">
                        {t.count} baris data
                      </span>
                    ) : (
                      <span className="text-[10px] text-rose-600 font-medium">
                        {t.hasRlsIssue ? 'RLS Memblokir' : 'Tabel Belum Dibuat'}
                      </span>
                    )}
                  </div>

                  {(!t.exists || !t.canRead || t.hasRlsIssue) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopySpecificTableSql(t.name)}
                      className="text-[10px] h-6 px-2 shrink-0 border-rose-300 text-rose-700 hover:bg-rose-100"
                    >
                      Salin SQL
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-slate-900/5 p-4 text-xs text-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="leading-relaxed">
            Klik tombol di atas untuk menguji dan menginisialisasi tabel secara otomatis. Jika tabel belum dibuat di PostgreSQL Supabase, salin skrip SQL pada panel di bawah dan jalankan di SQL Editor Supabase.
          </p>
          <a
            href="https://supabase.com/dashboard/project/pmrvbxtplamtqhmtsibi/sql"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline shrink-0"
          >
            Buka Supabase SQL Editor <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </Card>

      {/* SQL Query Center & Schema Generator Tabs */}
      <Card className="p-6 border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pusat Query SQL Supabase (1-Klik Salin)</h3>
              <p className="text-xs text-slate-500">
                Pilih skrip SQL yang diinginkan, salin, lalu jalankan di Supabase Dashboard &gt; SQL Editor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleCopyCurrentSql}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
              icon={copiedSql ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            >
              {copiedSql ? 'SQL Tersalin ke Clipboard!' : 'Salin Skrip SQL Ini'}
            </Button>
            <a
              href="https://supabase.com/dashboard/project/pmrvbxtplamtqhmtsibi/sql"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs inline-flex items-center gap-1 font-semibold"
              title="Buka SQL Editor di Dashboard Supabase"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 border-b border-slate-100 text-xs">
          <button
            type="button"
            onClick={() => setActiveSqlTab('master')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeSqlTab === 'master'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            1. Skrip Master Lengkap (Semua 14 Tabel & RLS)
          </button>
          <button
            type="button"
            onClick={() => setActiveSqlTab('users')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeSqlTab === 'users'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            2. Manajemen Pengguna (Login Username)
          </button>
          <button
            type="button"
            onClick={() => setActiveSqlTab('rls_fix')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeSqlTab === 'rls_fix'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            3. Perbaikan RLS & Hak Akses
          </button>
          <button
            type="button"
            onClick={() => setActiveSqlTab('storage')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeSqlTab === 'storage'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            4. Storage Struk Belanja
          </button>
          <button
            type="button"
            onClick={() => setActiveSqlTab('individual')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeSqlTab === 'individual'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            5. Per Tabel Individual
          </button>
        </div>

        {/* Individual Table Selector when Tab 5 is active */}
        {activeSqlTab === 'individual' && (
          <div className="mb-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-600">Pilih Tabel:</span>
            {Object.keys(INDIVIDUAL_TABLE_SQL_MAP).map((tbl) => (
              <button
                key={tbl}
                type="button"
                onClick={() => setSelectedIndividualTable(tbl)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                  selectedIndividualTable === tbl
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tbl}
              </button>
            ))}
          </div>
        )}

        {/* Code Preview Box */}
        <div className="relative rounded-2xl bg-slate-950 p-4 font-mono text-[11px] text-slate-200 overflow-x-auto max-h-80 border border-slate-800 shadow-inner">
          <pre>
            {activeSqlTab === 'master' && SUPABASE_SCHEMA_SQL}
            {activeSqlTab === 'users' && SUPABASE_USER_MANAGEMENT_SQL}
            {activeSqlTab === 'rls_fix' && SUPABASE_ACCOUNTS_FIX_SQL}
            {activeSqlTab === 'storage' && SUPABASE_STORAGE_SQL}
            {activeSqlTab === 'individual' && (INDIVIDUAL_TABLE_SQL_MAP[selectedIndividualTable] || '')}
          </pre>
        </div>
      </Card>

      {/* Storage Bucket Settings Card */}
      <Card className="p-6 border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Supabase Storage: Berkas Struk & Foto Profil</h3>
              <p className="text-xs text-slate-500">
                Penyimpanan cloud untuk bukti transaksi, scan struk OCR, dan foto profil pengguna
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
        </form>
      </Card>

      {/* Sync All Local Data to Supabase Card */}
      <Card className="p-6 border-emerald-200 bg-gradient-to-br from-white to-emerald-50/20 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Sinkronisasi Penuh ke Database Supabase</h3>
              <p className="text-xs text-slate-500">
                Kirim seluruh data transaksi, rekening, kategori, hutang, piutang, dan tabungan ke cloud PostgreSQL
              </p>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleSyncAllToSupabase}
            loading={isSyncingAll}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            {isSyncingAll ? 'Sedang Menyinkronkan...' : 'Sinkronkan Semua Data ke Supabase'}
          </Button>
        </div>

        {syncAllResult && (
          <div
            className={`p-4 rounded-xl text-xs space-y-2 mb-2 ${
              syncAllResult.success
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-amber-50 text-amber-900 border border-amber-200'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Ringkasan Sinkronisasi Data:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
              <div className="bg-white/80 p-2 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Transaksi:</span>
                <span className="font-bold text-emerald-700">{syncAllResult.syncedCounts.transactions || 0} data</span>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Rekening:</span>
                <span className="font-bold text-emerald-700">{syncAllResult.syncedCounts.accounts || 0} data</span>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Hutang & Piutang:</span>
                <span className="font-bold text-emerald-700">{(syncAllResult.syncedCounts.debts || 0) + (syncAllResult.syncedCounts.receivables || 0)} data</span>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Tabungan:</span>
                <span className="font-bold text-emerald-700">{syncAllResult.syncedCounts.saving_goals || 0} data</span>
              </div>
            </div>
            {syncAllResult.errors.length > 0 && (
              <div className="pt-2 text-rose-700">
                <p className="font-semibold">Catatan RLS / Skema:</p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {syncAllResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Profile Management Card */}
      <Card className="p-6 border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Profil Pengguna & Penyimpanan Database</h3>
              <p className="text-xs text-slate-500">
                Identitas akun FinTrack yang disinkronkan ke tabel <code>public.profiles</code> di Supabase
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={isSupabaseConfigured ? 'emerald' : 'slate'} size="md">
              {isSupabaseConfigured ? 'Database Cloud Supabase' : 'Penyimpanan Lokal'}
            </Badge>
          </div>
        </div>

        {/* User Identity Preview Banner */}
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 mb-5">
          <div className="relative group shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName || 'Avatar'}
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white shadow-md border border-slate-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-xl font-black shadow-md">
                {(fullName || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <label className="absolute -bottom-1.5 -right-1.5 bg-slate-900 text-white p-1 rounded-xl shadow cursor-pointer hover:bg-emerald-600 transition-colors" title="Unggah foto avatar">
              <Upload className="w-3.5 h-3.5" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isUploadingAvatar}
                onChange={handleAvatarFileUpload}
              />
            </label>
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <h4 className="text-base font-bold text-slate-900 truncate">{fullName || 'Nama Pengguna'}</h4>
              <Badge variant={user?.role === 'admin' ? 'violet' : 'blue'} size="sm">
                Role: {user?.role || 'user'}
              </Badge>
              <Badge variant="emerald" size="sm">
                {user?.status || 'active'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate">Username: <strong>{user?.username || 'user'}</strong> ({user?.email || 'user@fintrack.id'})</p>
            <p className="text-[10px] text-slate-400 mt-1 font-mono truncate">
              ID Akun (UUID): {user?.id}
            </p>
          </div>

          <div className="shrink-0 flex sm:flex-col gap-2">
            <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>{isUploadingAvatar ? 'Mengunggah...' : 'Unggah Foto'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isUploadingAvatar}
                onChange={handleAvatarFileUpload}
              />
            </label>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl('')}
                className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer text-center"
              >
                Hapus Foto
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nama Lengkap"
              placeholder="Contoh: Budi Santoso"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              helperText="Nama yang ditampilkan di aplikasi dan database"
              required
            />
            <Input
              label="Username Akun"
              value={user?.username || 'user'}
              disabled
              helperText="Username digunakan untuk login autentikasi"
            />
          </div>

          <Input
            label="Avatar URL (Opsional)"
            placeholder="https://example.com/avatar.jpg atau gunakan tombol 'Unggah Foto' di atas"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            helperText="URL gambar profil atau foto yang diunggah ke storage"
          />

          <div className="pt-2 flex items-center justify-end border-t border-slate-100">
            <Button
              type="submit"
              loading={profileSaving}
              icon={<Save className="w-4 h-4" />}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold"
            >
              Simpan Profil ke Database
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

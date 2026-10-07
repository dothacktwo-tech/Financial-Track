import React, { useState } from 'react';
import {
  Wallet,
  Lock,
  User,
  ShieldCheck,
  Sparkles,
  Receipt,
  PiggyBank,
  CheckCircle2,
  Eye,
  EyeOff,
  Database,
  ArrowRight,
  UserCheck,
  Shield,
  HelpCircle,
  KeyRound,
  Check,
  Coins,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { isSupabaseConfigured } from '../lib/supabase';

export const Login: React.FC = () => {
  const { login, register, switchUser } = useAuth();
  const { showToast } = useToast();

  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState<'user' | 'admin'>('user');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '');
    if (!cleanUsername) {
      setError('Masukkan username akun Anda.');
      return;
    }

    if (cleanUsername.length < 3) {
      setError('Username minimal terdiri dari 3 karakter.');
      return;
    }

    if (!password) {
      setError('Masukkan kata sandi (password).');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        if (!fullName.trim()) {
          setError('Masukkan nama lengkap Anda.');
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          setError('Password minimal 6 karakter.');
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('Konfirmasi password tidak cocok.');
          setLoading(false);
          return;
        }

        await register(fullName.trim(), cleanUsername, password);
        showToast(`Akun "${cleanUsername}" berhasil didaftarkan! Selamat datang di FinTrack.`, 'success');
      } else {
        await login(cleanUsername, password);
        showToast(`Selamat datang kembali di FinTrack Personal!`, 'success');
      }
    } catch (err: any) {
      console.error('Login/Register error:', err);
      setError(err.message || 'Terjadi kesalahan. Periksa username dan password Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillCredentials = (demoUsername: string, demoPass: string) => {
    setIsRegister(false);
    setUsername(demoUsername);
    setPassword(demoPass);
    setError('');
  };

  const handleInstantDemoLogin = async (role: 'user' | 'admin') => {
    setLoading(true);
    setError('');
    try {
      await switchUser(role);
      showToast(`Login demo berhasil sebagai ${role === 'admin' ? 'Administrator' : 'User (Budi Santoso)'}!`, 'success');
    } catch (err: any) {
      setError(err.message || 'Gagal login demo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex flex-col justify-center py-10 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Background Decorative Blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10 px-4">
        {/* Brand Header */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-xl shadow-emerald-500/25 ring-4 ring-white/10">
          <Wallet className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight text-white">
          FinTrack <span className="text-emerald-400">Personal</span>
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-300">
          Manajemen Keuangan Pribadi & Pemindai Struk AI Cerdas
        </p>

        {/* Supabase Status Pill */}
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] font-medium text-slate-300 backdrop-blur-md">
          <Database className="w-3 h-3 text-emerald-400" />
          <span>{isSupabaseConfigured ? 'Database Supabase Cloud Aktif' : 'Engine Database Siap Digunakan'}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0 relative z-10">
        <div className="bg-white/95 backdrop-blur-xl py-8 px-6 sm:px-10 rounded-3xl shadow-2xl shadow-black/30 border border-slate-200/80">
          
          {/* Navigation Tabs (Masuk vs Daftar) */}
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-6 border border-slate-200/60">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError('');
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                !isRegister
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Masuk Akun</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setError('');
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                isRegister
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Daftar Akun Baru</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Username <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
                  Tanpa email
                </span>
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 font-bold text-slate-400 text-sm select-none">@</span>
                <input
                  type="text"
                  required
                  autoFocus={!isRegister}
                  placeholder="admin atau user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Gunakan nama pengguna terdaftar (contoh: <strong>admin</strong> atau <strong>user</strong>).
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password / Kata Sandi <span className="text-rose-500">*</span>
                </label>
              </div>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Konfirmasi Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Ulangi password di atas"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition"
                  />
                </div>
              </div>
            )}

            {/* Error Message Box */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-start gap-2">
                <span className="text-rose-500 font-bold shrink-0">⚠️</span>
                <span className="leading-tight">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              loading={loading}
              className="w-full py-3 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 rounded-xl mt-2 cursor-pointer"
            >
              {isRegister ? 'Daftar Akun Baru' : 'Masuk ke Aplikasi'}
            </Button>
          </form>

          {/* Quick Demo Credentials Panel */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Akses Cepat Pengguna Demo
              </span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                1-Klik
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* User Demo Card */}
              <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/70 hover:bg-white hover:border-emerald-300 hover:shadow-xs transition group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      👤
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">User Standar</p>
                      <p className="text-[10px] text-slate-500 font-mono">user / user123</p>
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleFillCredentials('user', 'user123')}
                    className="flex-1 text-[10px] font-semibold py-1 px-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Isi Form
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInstantDemoLogin('user')}
                    className="flex-1 text-[10px] font-bold py-1 px-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer"
                  >
                    Masuk ➜
                  </button>
                </div>
              </div>

              {/* Admin Demo Card */}
              <div className="rounded-xl border border-rose-200 p-3 bg-rose-50/40 hover:bg-white hover:border-rose-300 hover:shadow-xs transition group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                      🛡️
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Administrator</p>
                      <p className="text-[10px] text-slate-500 font-mono">admin / admin123</p>
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleFillCredentials('admin', 'admin123')}
                    className="flex-1 text-[10px] font-semibold py-1 px-2 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                  >
                    Isi Form
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInstantDemoLogin('admin')}
                    className="flex-1 text-[10px] font-bold py-1 px-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition cursor-pointer"
                  >
                    Masuk ➜
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights Footer */}
        <div className="mt-8 grid grid-cols-3 gap-3 text-center text-[11px] text-slate-300">
          <div className="flex flex-col items-center bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/5">
            <Sparkles className="w-5 h-5 text-emerald-400 mb-1" />
            <span className="font-semibold text-white">Scan Struk AI</span>
            <span className="text-[10px] text-slate-400">OCR Otomatis</span>
          </div>
          <div className="flex flex-col items-center bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 mb-1" />
            <span className="font-semibold text-white">Database Cloud</span>
            <span className="text-[10px] text-slate-400">PostgreSQL RLS</span>
          </div>
          <div className="flex flex-col items-center bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/5">
            <PiggyBank className="w-5 h-5 text-emerald-400 mb-1" />
            <span className="font-semibold text-white">Target Tabungan</span>
            <span className="text-[10px] text-slate-400">Hutang & Piutang</span>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} FinTrack Personal. Solusi Keuangan Mandiri & Terpadu.
        </p>
      </div>
    </div>
  );
};

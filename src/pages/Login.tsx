import React, { useState } from 'react';
import {
  Wallet,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Receipt,
  PiggyBank,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';

export const Login: React.FC = () => {
  const { login, register, switchUser } = useAuth();
  const { showToast } = useToast();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Masukkan email Anda');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (isRegister) {
        if (!fullName.trim()) {
          setError('Masukkan nama lengkap Anda');
          setLoading(false);
          return;
        }
        await register(fullName.trim(), email.trim(), password);
        showToast('Akun berhasil didaftarkan! Selamat datang di FinTrack.', 'success');
      } else {
        await login(email.trim(), password);
        showToast('Login berhasil! Selamat datang kembali.', 'success');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal masuk. Periksa kembali email & password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'user' | 'admin') => {
    setLoading(true);
    try {
      await switchUser(role);
      showToast(`Berhasil login demo sebagai ${role === 'admin' ? 'Administrator' : 'User'}!`, 'success');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xl shadow-emerald-600/20">
          <Wallet className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          FinTrack Personal
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Aplikasi Manajemen Keuangan Pribadi & AI Scanner Struk
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80">
          {/* Form Tabs */}
          <div className="flex border-b border-slate-100 mb-6 pb-2">
            <button
              onClick={() => {
                setIsRegister(false);
                setError('');
              }}
              className={`flex-1 pb-2 text-xs font-bold transition text-center cursor-pointer ${
                !isRegister
                  ? 'border-b-2 border-emerald-600 text-emerald-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Masuk Akun
            </button>
            <button
              onClick={() => {
                setIsRegister(true);
                setError('');
              }}
              className={`flex-1 pb-2 text-xs font-bold transition text-center cursor-pointer ${
                isRegister
                  ? 'border-b-2 border-emerald-600 text-emerald-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Daftar Baru
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <Input
                label="Nama Lengkap"
                placeholder="Misal: Budi Santoso"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
                required
              />
            )}

            <Input
              label="Alamat Email"
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              helperText={isRegister ? 'Minimal 6 karakter' : undefined}
            />

            {error && (
              <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} className="w-full mt-2">
              {isRegister ? 'Daftar Sekarang' : 'Masuk ke Aplikasi'}
            </Button>
          </form>

          {/* Quick Demo Login Shortcuts */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-3">
              Akses Cepat Mode Uji Coba (Demo)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin('user')}
                className="text-xs font-semibold"
              >
                👤 Masuk Pengguna
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin('admin')}
                className="text-xs font-semibold border-rose-200 text-rose-700 hover:bg-rose-50"
              >
                🛡️ Masuk Admin
              </Button>
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mt-8 grid grid-cols-3 gap-2 text-center text-[11px] text-slate-500">
          <div className="flex flex-col items-center">
            <Sparkles className="w-4 h-4 text-emerald-600 mb-1" />
            <span>AI OCR Struk</span>
          </div>
          <div className="flex flex-col items-center">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mb-1" />
            <span>RLS Security</span>
          </div>
          <div className="flex flex-col items-center">
            <PiggyBank className="w-4 h-4 text-emerald-600 mb-1" />
            <span>Target Tabungan</span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Wallet,
  Sparkles,
  Database,
  LogOut,
  Settings,
  User,
  Shield,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { isSupabaseConfigured } from '../../lib/supabase';
import { formatDate } from '../../lib/date';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onQuickAdd: () => void;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPath,
  onNavigate,
  onQuickAdd,
  onToggleSidebar,
}) => {
  const { user, logout, isAdmin } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPageTitle = (path: string) => {
    switch (path) {
      case '/dashboard':
        return 'Dashboard Finansial';
      case '/transactions':
        return 'Daftar Transaksi';
      case '/receipts':
        return 'Scan Struk AI';
      case '/accounts':
        return 'Kelola Rekening & Dompet';
      case '/categories':
        return 'Kelola Kategori Keuangan';
      case '/debts':
        return 'Catatan Hutang';
      case '/receivables':
        return 'Catatan Piutang';
      case '/savings':
        return 'Target Tabungan';
      case '/reports':
        return 'Laporan & Analisis';
      case '/settings':
        return 'Pengaturan Akun & Sistem';
      case '/admin':
        return 'Admin Dashboard';
      case '/admin/users':
        return 'Manajemen Pengguna';
      default:
        return 'FinTrack Personal';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/90 bg-white/90 px-4 sm:px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {/* Mobile / Tablet menu button */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          aria-label="Buka Menu Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="lg:hidden flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Wallet className="h-4 w-4" />
          </div>
          <span className="font-extrabold text-sm text-slate-900">FinTrack</span>
        </div>

        <div className="hidden lg:block">
          <h1 className="text-base font-extrabold text-slate-900 leading-tight">
            {getPageTitle(currentPath)}
          </h1>
          <p className="text-[11px] text-slate-500 font-medium">
            {formatDate(new Date())}
          </p>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Database Status indicator */}
        <div
          onClick={() => onNavigate('/settings')}
          className={`hidden sm:flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border cursor-pointer transition ${
            isSupabaseConfigured
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100'
              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
          }`}
          title={isSupabaseConfigured ? 'Terhubung ke Supabase Cloud' : 'Mode Offline / Local Engine aktif'}
        >
          <Database className="w-3 h-3" />
          <span>{isSupabaseConfigured ? 'Supabase Live' : 'Storage Engine'}</span>
          <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConfigured ? 'bg-emerald-500' : 'bg-slate-400'}`} />
        </div>

        {/* Quick scan button */}
        <button
          onClick={() => onNavigate('/receipts')}
          className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Scan Struk</span>
        </button>

        {/* Main Quick Add */}
        <button
          onClick={onQuickAdd}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition cursor-pointer"
        >
          <span className="text-sm font-bold">+</span>
          <span className="hidden xs:inline">Catat</span>
        </button>

        {/* User avatar with dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            aria-label="Menu Pengguna"
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="w-8 h-8 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.full_name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[11px] text-slate-500 font-mono">@{user?.username || 'user'}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                    isAdmin ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {user?.role}
                  </span>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onNavigate('/settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Pengaturan Akun & DB</span>
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onNavigate('/admin/users');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                  >
                    <Shield className="w-4 h-4 text-rose-500" />
                    <span>Manajemen Pengguna</span>
                  </button>
                )}
              </div>

              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition cursor-pointer font-semibold"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Keluar Akun (Logout)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

import React from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Receipt,
  PiggyBank,
  HandCoins,
  Coins,
  BarChart3,
  Settings,
  ShieldAlert,
  LogOut,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onQuickAdd: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  onQuickAdd,
  isOpen = false,
  onClose,
}) => {
  const { user, isAdmin, logout, switchUser } = useAuth();

  const mainNav = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Transaksi', path: '/transactions', icon: ArrowLeftRight },
    { name: 'Scan Struk AI', path: '/receipts', icon: Receipt, highlight: true },
    { name: 'Rekening & Dompet', path: '/accounts', icon: Wallet },
    { name: 'Kategori', path: '/categories', icon: Tag },
    { name: 'Catatan Hutang', path: '/debts', icon: HandCoins },
    { name: 'Catatan Piutang', path: '/receivables', icon: Coins },
    { name: 'Target Tabungan', path: '/savings', icon: PiggyBank },
    { name: 'Laporan Keuangan', path: '/reports', icon: BarChart3 },
    { name: 'Pengaturan', path: '/settings', icon: Settings },
  ];

  const adminNav = [
    { name: 'Admin Dashboard', path: '/admin', icon: ShieldAlert },
    { name: 'Kelola Pengguna', path: '/admin/users', icon: ShieldAlert },
  ];

  const handleItemClick = (path: string) => {
    onNavigate(path);
    if (onClose) onClose();
  };

  const handleQuickAddClick = () => {
    onQuickAdd();
    if (onClose) onClose();
  };

  const content = (
    <div className="flex h-full flex-col justify-between bg-white select-none">
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-slate-900 block leading-tight">
                FinTrack
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                Personal Finance
              </span>
            </div>
          </div>

          {/* Close button on mobile drawer */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              aria-label="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Quick Add Button */}
        <div className="p-4">
          <button
            onClick={handleQuickAddClick}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition cursor-pointer"
          >
            <span className="text-base font-bold leading-none">+</span> Catat Transaksi
          </button>
        </div>

        {/* Navigation List */}
        <div className="overflow-y-auto px-3 py-2 space-y-1 max-h-[calc(100vh-280px)]">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Menu Utama
          </p>
          {mainNav.map((item) => {
            const isActive = currentPath === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => handleItemClick(item.path)}
                className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}
                  />
                  <span className="truncate">{item.name}</span>
                </div>
                {item.highlight && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold text-emerald-800 shrink-0">
                    <Sparkles className="w-2.5 h-2.5 text-emerald-600" /> AI
                  </span>
                )}
              </button>
            );
          })}

          {isAdmin && (
            <div className="pt-4">
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-rose-500">
                Admin Area
              </p>
              {adminNav.map((item) => {
                const isActive = currentPath === item.path;
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleItemClick(item.path)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? 'bg-rose-50 text-rose-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-rose-600' : 'text-slate-400'}`} />
                    <span className="truncate">{item.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="border-t border-slate-100 p-4 bg-slate-50/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 truncate">{user?.full_name}</p>
              <p className="text-[10px] font-medium text-slate-400 truncate capitalize">
                Role: {user?.role}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            title="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Demo Switcher */}
        <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
          <span className="text-slate-400 text-[10px]">Switch role:</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => switchUser('user')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                user?.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              User
            </button>
            <button
              onClick={() => switchUser('admin')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                user?.role === 'admin' ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Docked Sidebar (>= lg) */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200 bg-white min-h-screen sticky top-0 h-screen select-none shrink-0 z-20">
        {content}
      </aside>

      {/* 2. Mobile / Tablet Overlay Drawer (< lg) */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          {/* Drawer container */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-250">
            {content}
          </div>
        </div>
      )}
    </>
  );
};

import React from 'react';
import { LayoutDashboard, ArrowLeftRight, Sparkles, Wallet, BarChart3 } from 'lucide-react';

interface MobileNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentPath, onNavigate }) => {
  const tabs = [
    { name: 'Home', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Transaksi', path: '/transactions', icon: ArrowLeftRight },
    { name: 'Scan AI', path: '/receipts', icon: Sparkles, isCenter: true },
    { name: 'Rekening', path: '/accounts', icon: Wallet },
    { name: 'Laporan', path: '/reports', icon: BarChart3 },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 py-1.5 shadow-lg select-none">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = currentPath === tab.path;
          const Icon = tab.icon;

          if (tab.isCenter) {
            return (
              <button
                key={tab.path}
                onClick={() => onNavigate(tab.path)}
                className="relative -top-4 flex flex-col items-center group cursor-pointer"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 group-active:scale-95 transition">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-extrabold text-emerald-700 mt-0.5">Scan AI</span>
              </button>
            );
          }

          return (
            <button
              key={tab.path}
              onClick={() => onNavigate(tab.path)}
              className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition cursor-pointer ${
                isActive ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className={`text-[10px] mt-0.5 ${isActive ? 'font-bold' : 'font-medium'}`}>
                {tab.name}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

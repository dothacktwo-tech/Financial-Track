import React, { useState } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { MobileNav } from '../components/layout/MobileNav';

interface AppLayoutProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onQuickAdd: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentPath,
  onNavigate,
  onQuickAdd,
  children,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar: Works docked on desktop (>= lg) and as drawer on mobile/tablet (< lg) */}
      <Sidebar
        currentPath={currentPath}
        onNavigate={onNavigate}
        onQuickAdd={onQuickAdd}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentPath={currentPath}
          onNavigate={onNavigate}
          onQuickAdd={onQuickAdd}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-12">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav currentPath={currentPath} onNavigate={onNavigate} />
    </div>
  );
};

import React from 'react';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Memuat data...',
  className = '',
}) => {
  return (
    <div className={`flex min-h-[220px] flex-col items-center justify-center p-6 ${className}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
      <p className="mt-3 text-xs font-medium text-slate-500">{message}</p>
    </div>
  );
};

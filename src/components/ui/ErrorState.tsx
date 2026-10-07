import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Data gagal dimuat',
  message = 'Silakan coba lagi beberapa saat lagi.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-center ${className}`}>
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
        <AlertCircle className="h-6 w-6" />
      </div>
      <p className="font-semibold text-rose-900">{title}</p>
      <p className="mt-1 text-xs text-rose-700">{message}</p>
      {onRetry && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Coba Lagi
          </Button>
        </div>
      )}
    </div>
  );
};

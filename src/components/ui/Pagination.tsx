import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs text-slate-500">
      <div>
        {totalItems !== undefined && pageSize !== undefined ? (
          <span>
            Menampilkan{' '}
            <strong className="font-semibold text-slate-700">
              {Math.min((currentPage - 1) * pageSize + 1, totalItems)}
            </strong>{' '}
            -{' '}
            <strong className="font-semibold text-slate-700">
              {Math.min(currentPage * pageSize, totalItems)}
            </strong>{' '}
            dari <strong className="font-semibold text-slate-700">{totalItems}</strong> data
          </span>
        ) : (
          <span>
            Halaman {currentPage} dari {totalPages}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          icon={<ChevronLeft className="w-3.5 h-3.5" />}
        >
          Sebelumnya
        </Button>
        <span className="px-2 font-medium text-slate-700">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          icon={<ChevronRight className="w-3.5 h-3.5" />}
        >
          Selanjutnya
        </Button>
      </div>
    </div>
  );
};

import React from 'react';

interface CurrencyInputProps {
  label?: string;
  value: number;
  onChange: (val: number) => void;
  error?: string;
  helperText?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  label,
  value,
  onChange,
  error,
  helperText,
  placeholder = '0',
  className = '',
  required,
}) => {
  // Format numeric value with dot separators for Indonesian display
  const displayValue = value ? value.toLocaleString('id-ID') : '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const num = raw ? parseInt(raw, 10) : 0;
    onChange(num);
  };

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        <span className="absolute left-3.5 text-sm font-semibold text-slate-500 select-none">
          Rp
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={`w-full rounded-xl border bg-white pl-11 pr-3.5 py-2.5 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
              : 'border-slate-200 hover:border-slate-300 focus:border-emerald-600 focus:ring-emerald-100'
          } ${className}`}
        />
      </div>
      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      {!error && helperText && <p className="text-xs text-slate-500">{helperText}</p>}
    </div>
  );
};

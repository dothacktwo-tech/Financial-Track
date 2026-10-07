import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs hover:shadow-sm transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-slate-300 active:scale-[0.99]' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

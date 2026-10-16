import React from 'react';
import { Database } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: any;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description = 'No matching records exist in the connected Supabase database.',
  icon: Icon = Database,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-dashed border-[#071952]/25 bg-[#F8F3F0] ${className}`}>
      <div className="w-12 h-12 rounded-xl bg-[#071952]/10 border border-[#071952]/20 flex items-center justify-center text-[#071952] mb-3.5 shadow-xs">
        <Icon className="w-6 h-6 stroke-[1.75]" />
      </div>
      <h3 className="text-sm font-bold text-black mb-1">{title}</h3>
      <p className="text-xs text-black/60 max-w-sm mb-4 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#071952] text-white hover:bg-[#0b2575] transition-colors shadow-xs cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

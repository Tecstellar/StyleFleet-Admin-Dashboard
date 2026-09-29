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
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-dashed border-[#E5E7EB] bg-white ${className}`}>
      <div className="w-12 h-12 rounded-xl bg-[#FAF7EE] border border-[#E8DEC4] flex items-center justify-center text-[#B8860B] mb-3.5 shadow-xs">
        <Icon className="w-6 h-6 stroke-[1.75]" />
      </div>
      <h3 className="text-sm font-semibold text-neutral-900 mb-1">{title}</h3>
      <p className="text-xs text-neutral-500 max-w-sm mb-4 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#111827] text-white hover:bg-[#D4AF37] hover:text-[#111827] transition-colors shadow-xs"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

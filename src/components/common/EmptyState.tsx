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
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-dashed border-[#2D3154] bg-[#1E2136]/30 dark:bg-[#1E2136]/30 light:bg-slate-50 light:border-slate-200 ${className}`}>
      <div className="w-12 h-12 rounded-xl bg-[#2D3154]/50 flex items-center justify-center text-[#D9A441] mb-3.5 shadow-inner">
        <Icon className="w-6 h-6 stroke-[1.75]" />
      </div>
      <h3 className="text-sm font-semibold text-white light:text-slate-900 mb-1">{title}</h3>
      <p className="text-xs text-neutral-400 light:text-slate-500 max-w-sm mb-4 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[#D9A441] text-[#161826] hover:bg-[#E0C068] transition-colors shadow-sm"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

import React from 'react';

interface StatusBadgeProps {
  status: string | null | undefined;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  if (!status) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-500 border border-neutral-200">
        Unknown
      </span>
    );
  }

  const normalized = status.toLowerCase().trim();

  let styles = 'bg-neutral-100 text-neutral-700 border-neutral-200';

  if (['active', 'completed', 'paid', 'resolved', 'processed', 'done'].includes(normalized)) {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (['pending', 'in_progress', 'open', 'not confirmed'].includes(normalized)) {
    styles = 'bg-neutral-100 text-neutral-800 border-neutral-300 font-semibold';
  } else if (['cancelled', 'closed', 'expired', 'failed', 'deleted'].includes(normalized)) {
    styles = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (['confirmed'].includes(normalized)) {
    styles = 'bg-neutral-900 text-white border-neutral-900';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span className={`inline-flex items-center rounded border font-medium capitalize tracking-wide transition-colors ${styles} ${sizeClasses}`}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {status}
    </span>
  );
};

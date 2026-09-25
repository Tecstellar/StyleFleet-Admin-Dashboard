import React from 'react';

interface StatusBadgeProps {
  status: string | null | undefined;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  if (!status) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
        Unknown
      </span>
    );
  }

  const normalized = status.toLowerCase().trim();

  let styles = 'bg-neutral-800/60 text-neutral-300 border-neutral-700';

  if (['active', 'completed', 'paid', 'resolved', 'processed', 'done'].includes(normalized)) {
    styles = 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50';
  } else if (['pending', 'in_progress', 'open', 'not confirmed'].includes(normalized)) {
    styles = 'bg-amber-950/40 text-[#D9A441] border-[#D9A441]/40';
  } else if (['cancelled', 'closed', 'expired', 'failed', 'deleted'].includes(normalized)) {
    styles = 'bg-rose-950/40 text-rose-400 border-rose-800/50';
  } else if (['confirmed'].includes(normalized)) {
    styles = 'bg-blue-950/40 text-blue-400 border-blue-800/50';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span className={`inline-flex items-center rounded border font-medium capitalize tracking-wide transition-colors ${styles} ${sizeClasses}`}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {status}
    </span>
  );
};

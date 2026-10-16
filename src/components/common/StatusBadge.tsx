import React from 'react';

interface StatusBadgeProps {
  status: string | null | undefined;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  if (!status) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#F8F3F0] text-black/60 border border-[#014BAA]/20">
        Unknown
      </span>
    );
  }

  const normalized = status.toLowerCase().trim();

  let styles = 'bg-[#F8F3F0] text-black/70 border-[#014BAA]/20';

  if (['active', 'completed', 'paid', 'resolved', 'processed', 'done', 'confirmed', 'live', 'pro'].includes(normalized)) {
    styles = 'bg-[#014BAA] text-white border-[#014BAA] font-semibold';
  } else if (['pending', 'in_progress', 'open', 'not confirmed', 'trial'].includes(normalized)) {
    styles = 'bg-[#F8F3F0] text-[#014BAA] border-[#014BAA]/40 font-semibold';
  } else if (['cancelled', 'closed', 'expired', 'failed', 'deleted', 'suspended', 'churned'].includes(normalized)) {
    styles = 'bg-black/5 text-black/80 border-black/20';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center rounded-md border capitalize font-medium transition-colors ${styles} ${sizeClasses}`}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
      {status}
    </span>
  );
};

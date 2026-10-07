import React from 'react';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { KPICardProps } from '../../types/dashboard';

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  change,
  changeType = 'neutral',
  isDateFilterable = true,
  isUnavailable = false,
  unavailableReason,
  icon: Icon,
  onClick,
  tone,
}) => {
  const toneClass = tone ? `metric-tone-${tone}` : '';

  return (
    <div
      onClick={onClick}
      className={`metric-card relative overflow-hidden transition-all duration-200 group flex flex-col justify-between aspect-square w-full max-w-[165px] min-w-[130px] flex-1 ${toneClass} ${
        onClick ? 'cursor-pointer hover:shadow-sm hover:-translate-y-0.5' : ''
      }`}
    >
      {/* Top row: Label and Icon */}
      <div className="flex items-center justify-between gap-1.5 mb-1">
        <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase truncate">
          {title}
        </span>
        {Icon && (
          <div className="p-1 rounded-md bg-slate-900/5 text-slate-700 group-hover:scale-105 transition-transform shrink-0">
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="my-auto py-1">
        {isUnavailable ? (
          <div className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            Unavailable
          </div>
        ) : (
          <div className="metric-value text-base sm:text-lg lg:text-xl font-bold tracking-tight font-mono text-[#1c1f26] truncate" title={String(value)}>
            {value}
          </div>
        )}
      </div>

      {/* Footer: Subtitle and Trend */}
      <div className="pt-1 border-t border-neutral-100 flex items-center justify-between gap-1 text-[9.5px]">
        {isUnavailable ? (
          <span className="text-neutral-400 truncate text-[9.5px]">
            {unavailableReason || 'Source unavailable'}
          </span>
        ) : (
          <>
            <span className="text-neutral-500 truncate text-[9.5px] font-medium" title={subtitle}>
              {subtitle || (isDateFilterable ? 'Filtered' : 'All-time')}
            </span>

            {change && (
              <div
                className={`inline-flex items-center gap-0.5 font-semibold px-1 py-0.2 rounded text-[8.5px] shrink-0 ${
                  changeType === 'positive'
                    ? 'bg-neutral-100 text-neutral-900 border border-neutral-200'
                    : changeType === 'negative'
                    ? 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                    : 'bg-neutral-50 text-neutral-500'
                }`}
              >
                {changeType === 'positive' && <TrendingUp className="w-2.5 h-2.5 text-emerald-600" />}
                {changeType === 'negative' && <TrendingDown className="w-2.5 h-2.5 text-rose-600" />}
                {changeType === 'neutral' && <Minus className="w-2.5 h-2.5 text-neutral-400" />}
                <span>{change}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

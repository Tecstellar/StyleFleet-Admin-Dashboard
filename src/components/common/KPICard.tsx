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
      className={`metric-card relative overflow-hidden transition-all duration-200 group ${toneClass} ${
        onClick ? 'cursor-pointer hover:shadow-sm hover:-translate-y-0.5' : ''
      }`}
    >
      {/* Top row: Label and Icon */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
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
      <div className="flex items-baseline gap-1.5 mb-1.5">
        {isUnavailable ? (
          <div className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            Data Unavailable
          </div>
        ) : (
          <div className="metric-value text-lg sm:text-xl font-bold tracking-tight font-mono">
            {value}
          </div>
        )}
      </div>

      {/* Footer: Subtitle and Trend */}
      <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-neutral-100 text-[10.5px]">
        {isUnavailable ? (
          <span className="text-neutral-400 truncate text-[10px]">
            {unavailableReason || 'Source table not configured'}
          </span>
        ) : (
          <>
            <span className="text-neutral-500 truncate text-[10px] font-medium">
              {subtitle || (isDateFilterable ? 'Filtered period' : 'All-time total')}
            </span>

            {change && (
              <div
                className={`inline-flex items-center gap-0.5 font-semibold px-1.5 py-0.2 rounded-full text-[9.5px] shrink-0 ${
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

      {!isDateFilterable && !isUnavailable && (
        <div className="mt-1 flex items-center gap-1 text-[9px] text-neutral-400 font-medium">
          <Info className="w-2.5 h-2.5 shrink-0" />
          <span>Metric is not date-filterable</span>
        </div>
      )}
    </div>
  );
};

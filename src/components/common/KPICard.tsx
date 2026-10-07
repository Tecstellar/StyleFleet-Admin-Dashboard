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
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
      }`}
    >
      {/* Top row: Label and Icon */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
          {title}
        </span>
        {Icon && (
          <div className="p-2 rounded-xl bg-slate-900/5 text-slate-700 group-hover:scale-105 transition-transform shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="flex items-baseline gap-2 mb-2.5">
        {isUnavailable ? (
          <div className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
            Data Unavailable
          </div>
        ) : (
          <div className="metric-value text-2xl lg:text-3xl font-bold tracking-tight font-mono">
            {value}
          </div>
        )}
      </div>

      {/* Footer: Subtitle and Trend */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-neutral-100 text-[11px]">
        {isUnavailable ? (
          <span className="text-neutral-400 truncate">
            {unavailableReason || 'Source table not configured'}
          </span>
        ) : (
          <>
            <span className="text-neutral-500 truncate font-medium">
              {subtitle || (isDateFilterable ? 'Filtered period' : 'All-time total')}
            </span>

            {change && (
              <div
                className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                  changeType === 'positive'
                    ? 'bg-neutral-100 text-neutral-900 border border-neutral-200'
                    : changeType === 'negative'
                    ? 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                    : 'bg-neutral-50 text-neutral-500'
                }`}
              >
                {changeType === 'positive' && <TrendingUp className="w-3 h-3 text-emerald-600" />}
                {changeType === 'negative' && <TrendingDown className="w-3 h-3 text-rose-600" />}
                {changeType === 'neutral' && <Minus className="w-3 h-3 text-neutral-400" />}
                <span>{change}</span>
              </div>
            )}
          </>
        )}
      </div>

      {!isDateFilterable && !isUnavailable && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-neutral-400 font-medium">
          <Info className="w-3 h-3 shrink-0" />
          <span>Metric is not date-filterable</span>
        </div>
      )}
    </div>
  );
};

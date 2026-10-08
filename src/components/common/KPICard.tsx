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
}) => {
  return (
    <div
      onClick={onClick}
      className={`metric-card group ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      }`}
    >
      {/* Top row: Label */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-medium text-slate-500 truncate">
          {title}
        </span>
      </div>

      {/* Main Metric Value */}
      <div className="my-0.5">
        {isUnavailable ? (
          <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded inline-block">
            Unavailable
          </div>
        ) : (
          <div className="metric-value text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 font-sans tabular-nums leading-tight">
            {value}
          </div>
        )}
      </div>

      {/* Footer: Subtitle and Trend */}
      <div className="pt-2 mt-auto border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
        {isUnavailable ? (
          <span className="text-slate-400 text-[11px]">
            {unavailableReason || 'Source unavailable'}
          </span>
        ) : (
          <>
            <span className="text-slate-500 text-[11px] truncate">
              {subtitle || (isDateFilterable ? 'Filtered period' : 'All-time')}
            </span>

            {change && (
              <div
                className={`inline-flex items-center gap-1 font-semibold text-[11px] shrink-0 ${
                  changeType === 'positive'
                    ? 'text-emerald-600'
                    : changeType === 'negative'
                    ? 'text-rose-600'
                    : 'text-slate-500'
                }`}
              >
                {changeType === 'positive' && <TrendingUp className="w-3 h-3 stroke-[2.2]" />}
                {changeType === 'negative' && <TrendingDown className="w-3 h-3 stroke-[2.2]" />}
                {changeType === 'neutral' && <Minus className="w-3 h-3 stroke-[2.2]" />}
                <span>{change}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

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
      className={`relative overflow-hidden rounded-xl border border-[#2D3154] light:border-slate-200 bg-[#1E2136] light:bg-white p-5 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-[#D9A441]/50 hover:shadow-lg hover:shadow-black/20' : ''
      }`}
    >
      {/* Top subtle highlight line in Gold */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D9A441]/40 to-transparent" />

      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-xs font-medium text-neutral-400 light:text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <div className="p-2 rounded-lg bg-[#2D3154]/50 light:bg-slate-100 text-[#D9A441] shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        {isUnavailable ? (
          <div className="text-sm font-medium text-amber-400 light:text-amber-700 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
            Data Unavailable
          </div>
        ) : (
          <div className="text-2xl font-bold tracking-tight text-white light:text-slate-900 font-mono">
            {value}
          </div>
        )}
      </div>

      {/* Subtitle / time period indication */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#2D3154]/40 light:border-slate-100 text-[11px]">
        {isUnavailable ? (
          <span className="text-neutral-400 light:text-slate-400 truncate">
            {unavailableReason || 'Source table not configured'}
          </span>
        ) : (
          <>
            <span className="text-neutral-400 light:text-slate-500 truncate">
              {subtitle || (isDateFilterable ? 'Filtered range' : 'All-time total')}
            </span>

            {change && (
              <div
                className={`inline-flex items-center gap-1 font-semibold ${
                  changeType === 'positive'
                    ? 'text-emerald-400'
                    : changeType === 'negative'
                    ? 'text-rose-400'
                    : 'text-neutral-400'
                }`}
              >
                {changeType === 'positive' && <TrendingUp className="w-3 h-3" />}
                {changeType === 'negative' && <TrendingDown className="w-3 h-3" />}
                {changeType === 'neutral' && <Minus className="w-3 h-3" />}
                <span>{change}</span>
              </div>
            )}
          </>
        )}
      </div>

      {!isDateFilterable && !isUnavailable && (
        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-neutral-400 light:text-slate-400">
          <Info className="w-3 h-3 shrink-0" />
          <span>Metric is not date-filterable</span>
        </div>
      )}
    </div>
  );
};

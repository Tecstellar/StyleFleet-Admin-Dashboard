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
      className={`relative overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-5 transition-all duration-200 shadow-sm ${
        onClick ? 'cursor-pointer hover:border-[#D4AF37] hover:shadow-md' : ''
      }`}
    >
      {/* Top subtle highlight line in Gold */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />

      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <div className="p-2 rounded-lg bg-[#FAF7EE] text-[#B8860B] border border-[#E8DEC4] shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        {isUnavailable ? (
          <div className="text-sm font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
            Data Unavailable
          </div>
        ) : (
          <div className="text-2xl font-bold tracking-tight text-neutral-900 font-mono">
            {value}
          </div>
        )}
      </div>

      {/* Subtitle / time period indication */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#F0F0F0] text-[11px]">
        {isUnavailable ? (
          <span className="text-neutral-500 truncate">
            {unavailableReason || 'Source table not configured'}
          </span>
        ) : (
          <>
            <span className="text-neutral-500 truncate">
              {subtitle || (isDateFilterable ? 'Filtered range' : 'All-time total')}
            </span>

            {change && (
              <div
                className={`inline-flex items-center gap-1 font-semibold ${
                  changeType === 'positive'
                    ? 'text-emerald-600'
                    : changeType === 'negative'
                    ? 'text-rose-600'
                    : 'text-neutral-500'
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
        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-neutral-400">
          <Info className="w-3 h-3 shrink-0" />
          <span>Metric is not date-filterable</span>
        </div>
      )}
    </div>
  );
};

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
  tone = 'revenue',
}) => {
  const toneClass = tone ? `metric-tone-${tone}` : 'metric-tone-revenue';
  const isEmerald = tone === 'revenue' || tone === 'order-good' || tone === 'signup';

  return (
    <div
      onClick={onClick}
      className={`metric-card group ${toneClass} ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* Top row: Label and Icon */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase leading-snug whitespace-normal break-words">
          {title}
        </span>
        {Icon && (
          <div
            className={`p-1.5 rounded-lg shrink-0 transition-colors ${
              isEmerald
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 group-hover:bg-emerald-100/80'
                : 'bg-teal-50 text-teal-700 border border-teal-100 group-hover:bg-teal-100/80'
            }`}
          >
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="my-1">
        {isUnavailable ? (
          <div className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block">
            Unavailable
          </div>
        ) : (
          <div className="metric-value text-xl sm:text-2xl font-bold tracking-tight font-mono text-slate-900 whitespace-normal break-words leading-tight">
            {value}
          </div>
        )}
      </div>

      {/* Footer: Subtitle and Trend */}
      <div className="pt-2 mt-auto border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
        {isUnavailable ? (
          <span className="text-slate-400 text-[11px] whitespace-normal break-words leading-tight">
            {unavailableReason || 'Source unavailable'}
          </span>
        ) : (
          <>
            <span className="text-slate-500 text-[11px] font-medium whitespace-normal break-words leading-tight">
              {subtitle || (isDateFilterable ? 'Filtered period' : 'All-time')}
            </span>

            {change && (
              <div
                className={`inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded-md text-[10px] shrink-0 ${
                  changeType === 'positive'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : changeType === 'negative'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {changeType === 'positive' && <TrendingUp className="w-3 h-3 text-emerald-600" />}
                {changeType === 'negative' && <TrendingDown className="w-3 h-3 text-rose-600" />}
                {changeType === 'neutral' && <Minus className="w-3 h-3 text-slate-400" />}
                <span>{change}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

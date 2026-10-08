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
        <span className="text-[11px] font-bold tracking-wider text-slate-700 uppercase leading-snug whitespace-normal break-words">
          {title}
        </span>
        {Icon && (
          <div
            className={`p-1.5 rounded-lg shrink-0 transition-colors ${
              isEmerald
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 group-hover:bg-emerald-100'
                : 'bg-teal-50 text-teal-800 border border-teal-200 group-hover:bg-teal-100'
            }`}
          >
            <Icon className="w-4 h-4 stroke-[2.25]" />
          </div>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="my-1">
        {isUnavailable ? (
          <div className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 inline-block">
            Unavailable
          </div>
        ) : (
          <div className="metric-value text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight font-mono text-slate-950 whitespace-normal break-words leading-tight">
            {value}
          </div>
        )}
      </div>

      {/* Footer: Subtitle and Trend */}
      <div className="pt-2 mt-auto border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
        {isUnavailable ? (
          <span className="text-slate-600 text-[11px] font-bold whitespace-normal break-words leading-tight">
            {unavailableReason || 'Source unavailable'}
          </span>
        ) : (
          <>
            <span className="text-slate-700 text-[11px] font-bold whitespace-normal break-words leading-tight">
              {subtitle || (isDateFilterable ? 'Filtered period' : 'All-time')}
            </span>

            {change && (
              <div
                className={`inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded-md text-[10.5px] shrink-0 ${
                  changeType === 'positive'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : changeType === 'negative'
                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {changeType === 'positive' && <TrendingUp className="w-3 h-3 text-emerald-700 stroke-[2.5]" />}
                {changeType === 'negative' && <TrendingDown className="w-3 h-3 text-rose-700 stroke-[2.5]" />}
                {changeType === 'neutral' && <Minus className="w-3 h-3 text-slate-500 stroke-[2.5]" />}
                <span>{change}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

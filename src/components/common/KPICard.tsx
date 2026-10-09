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
  size = 'default',
}) => {
  const isSm = size === 'sm';

  return (
    <div
      onClick={onClick}
      className={`metric-card group ${isSm ? 'metric-card-sm' : ''} ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      }`}
    >
      {/* Top row: Label */}
      <div className={`flex items-center justify-between gap-2 ${isSm ? 'mb-0.5' : 'mb-1'}`}>
        <span
          className={`${
            isSm ? 'text-[10px]' : 'text-[11px]'
          } font-medium uppercase tracking-wide text-slate-500 truncate`}
        >
          {title}
        </span>
      </div>

      {/* Main Metric Value */}
      <div className={isSm ? 'my-0' : 'my-0.5'}>
        {isUnavailable ? (
          <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded inline-block">
            Unavailable
          </div>
        ) : (
          <div
            className={`metric-value ${
              isSm ? 'text-lg sm:text-xl' : 'text-2xl sm:text-[28px]'
            } font-semibold tracking-tight text-slate-900 font-sans tabular-nums leading-tight`}
          >
            {value}
          </div>
        )}
      </div>

      {/* Footer: Subtitle and Trend */}
      <div className={`${isSm ? 'mt-0.5' : 'mt-1'} flex items-center justify-between gap-2 text-xs`}>
        {isUnavailable ? (
          <span className="text-slate-400 text-[10px]">
            {unavailableReason || 'Source unavailable'}
          </span>
        ) : (
          <>
            <span className={`text-slate-500 ${isSm ? 'text-[10px]' : 'text-[11px]'} truncate`}>
              {subtitle || (isDateFilterable ? 'Filtered period' : 'All-time')}
            </span>

            {change && (
              <div
                className={`inline-flex items-center gap-1 font-semibold ${
                  isSm ? 'text-[10px]' : 'text-[11px]'
                } shrink-0 ${
                  changeType === 'positive'
                    ? 'text-emerald-600'
                    : changeType === 'negative'
                    ? 'text-rose-600'
                    : 'text-slate-500'
                }`}
              >
                {changeType === 'positive' && <TrendingUp className="w-2.5 h-2.5 stroke-[2.2]" />}
                {changeType === 'negative' && <TrendingDown className="w-2.5 h-2.5 stroke-[2.2]" />}
                {changeType === 'neutral' && <Minus className="w-2.5 h-2.5 stroke-[2.2]" />}
                <span>{change}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { AlertCircle, Database, HelpCircle } from 'lucide-react';

interface UnavailableBannerProps {
  title?: string;
  sourceTable?: string;
  message?: string;
  details?: string;
}

export const UnavailableBanner: React.FC<UnavailableBannerProps> = ({
  title = 'Data unavailable — required source field/table not found.',
  sourceTable,
  message = 'The connected Supabase database currently has no records or schema table for this feature. To uphold StyleFleet strict data integrity, mock data is never rendered.',
  details,
}) => {
  return (
    <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-4 sm:p-5 text-neutral-800 shadow-xs">
      <div className="flex items-start gap-3.5">
        <div className="p-2 rounded-lg bg-neutral-200 text-neutral-900 shrink-0 mt-0.5">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-bold text-neutral-900">{title}</h4>
            {sourceTable && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-neutral-200 text-neutral-800 border border-neutral-300">
                <Database className="w-3 h-3" />
                {sourceTable}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed">{message}</p>
          {details && (
            <div className="mt-2 pt-2 border-t border-neutral-200 flex items-start gap-1.5 text-[11px] text-neutral-500 font-mono">
              <HelpCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{details}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

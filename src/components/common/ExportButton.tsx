import React from 'react';
import { Download } from 'lucide-react';
import { exportToCSV } from '../../utils/formatters';

interface ExportButtonProps<T extends Record<string, any>> {
  data: T[];
  filename: string;
  columns?: { key: keyof T; label: string }[];
  label?: string;
  disabled?: boolean;
}

export const ExportButton = <T extends Record<string, any>>({
  data,
  filename,
  columns,
  label = 'Export CSV',
  disabled = false,
}: ExportButtonProps<T>) => {
  const handleExport = () => {
    exportToCSV(data, filename, columns);
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled || data.length === 0}
      title={data.length === 0 ? 'No records to export' : `Export ${data.length} real record(s) to CSV`}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-[#071952]/30 bg-[#F8F3F0] text-[#071952] shadow-xs transition-all cursor-pointer ${
        disabled || data.length === 0
          ? 'opacity-40 cursor-not-allowed'
          : 'hover:border-[#071952] hover:bg-[#071952] hover:text-white'
      }`}
    >
      <Download className="w-3.5 h-3.5" />
      <span>{label}</span>
      {data.length > 0 && (
        <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#071952]/10 text-[#071952] border border-[#071952]/20">
          {data.length}
        </span>
      )}
    </button>
  );
};

import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  searchPlaceholder?: string;
  searchFields?: (keyof T)[];
  defaultSortField?: string;
  defaultSortOrder?: 'asc' | 'desc';
  pageSize?: number;
  onRowClick?: (item: T) => void;
  actions?: React.ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'No data currently exists for this view.',
  searchPlaceholder = 'Search records...',
  searchFields,
  defaultSortField,
  defaultSortOrder = 'desc',
  pageSize = 10,
  onRowClick,
  actions,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string | undefined>(defaultSortField);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);

  // Search filtering
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase().trim();

    return data.filter((item) => {
      if (searchFields && searchFields.length > 0) {
        return searchFields.some((field) => {
          const val = item[field];
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(term);
        });
      }
      return Object.values(item).some((val) => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'object') return false;
        return String(val).toLowerCase().includes(term);
      });
    });
  }, [data, searchTerm, searchFields]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;

    return [...filteredData].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (aVal === null || aVal === undefined) return sortOrder === 'asc' ? 1 : -1;
      if (bVal === null || bVal === undefined) return sortOrder === 'asc' ? -1 : 1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const aDate = Date.parse(aVal);
        const bDate = Date.parse(bVal);
        if (!isNaN(aDate) && !isNaN(bDate)) {
          return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
        }
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, safePage, rowsPerPage]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Table Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 light:text-slate-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-[#2D3154] light:border-slate-300 bg-[#161826] light:bg-white text-white light:text-slate-900 placeholder:text-neutral-500 light:placeholder:text-slate-400 focus:outline-none focus:border-[#D9A441] transition-colors"
          />
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {actions}
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 light:text-slate-500">
            <span>Show:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="py-1 px-2 rounded-lg border border-[#2D3154] light:border-slate-300 bg-[#161826] light:bg-white text-xs text-white light:text-slate-900 focus:outline-none focus:border-[#D9A441]"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-[#2D3154] light:border-slate-200 bg-[#1E2136] light:bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#161826]/70 light:bg-slate-50 border-b border-[#2D3154] light:border-slate-200 text-neutral-400 light:text-slate-600 font-semibold tracking-wider uppercase text-[10px]">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={`px-4 py-3 ${col.className || ''} ${
                      col.sortable !== false ? 'cursor-pointer hover:text-white light:hover:text-slate-900' : ''
                    }`}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.header}</span>
                      {col.sortable !== false && (
                        <span className="text-[#D9A441]">
                          {sortField === col.key ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="w-3 h-3" />
                            ) : (
                              <ArrowDown className="w-3 h-3" />
                            )
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D3154]/50 light:divide-slate-100">
              {loading ? (
                // Skeleton Rows
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    {columns.map((col, cIdx) => (
                      <td key={cIdx} className="px-4 py-3.5">
                        <div className="h-4 bg-[#2D3154]/40 light:bg-slate-200 rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-8">
                    <EmptyState
                      title={emptyTitle}
                      description={emptyDescription}
                    />
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, rowIdx) => (
                  <tr
                    key={item.id || rowIdx}
                    onClick={() => onRowClick?.(item)}
                    className={`transition-colors ${
                      onRowClick ? 'cursor-pointer hover:bg-[#232742] light:hover:bg-slate-50' : 'hover:bg-[#20243b]/40'
                    }`}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={`px-4 py-3 text-neutral-300 light:text-slate-800 ${col.className || ''}`}>
                        {col.render ? col.render(item) : (item[col.key] !== null && item[col.key] !== undefined ? String(item[col.key]) : '—')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && sortedData.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[#2D3154] light:border-slate-200 bg-[#161826]/30 light:bg-slate-50 text-xs text-neutral-400 light:text-slate-500">
            <div>
              Showing <span className="font-medium text-white light:text-slate-900 font-mono">{(safePage - 1) * rowsPerPage + 1}</span> to{' '}
              <span className="font-medium text-white light:text-slate-900 font-mono">
                {Math.min(safePage * rowsPerPage, sortedData.length)}
              </span>{' '}
              of <span className="font-medium text-white light:text-slate-900 font-mono">{sortedData.length}</span> records
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={safePage === 1}
                className="p-1 rounded border border-[#2D3154] light:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#2D3154] transition-colors"
                title="First Page"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-1 rounded border border-[#2D3154] light:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#2D3154] transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 text-xs font-mono font-medium text-white light:text-slate-900">
                {safePage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-1 rounded border border-[#2D3154] light:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#2D3154] transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={safePage === totalPages}
                className="p-1 rounded border border-[#2D3154] light:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#2D3154] transition-colors"
                title="Last Page"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Calendar,
  Menu,
  RefreshCw,
  Radio,
  ExternalLink,
  X,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useDateFilter } from '../../context/DateFilterContext';
import { useAuth } from '../../context/AuthContext';
import { performGlobalSearch, SearchResultItem } from '../../services/searchService';
import { DateFilterOption, NavView } from '../../types/dashboard';

interface HeaderProps {
  onToggleMobileNav: () => void;
  onSelectView: (view: NavView) => void;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
  onOpenResetPassword?: () => void;
}

const DATE_OPTIONS: { id: DateFilterOption; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last_7_days', label: 'Last 7 Days' },
  { id: 'last_30_days', label: 'Last 30 Days' },
  { id: 'this_month', label: 'This Month' },
  { id: 'previous_month', label: 'Previous Month' },
  { id: 'all_time', label: 'All Time' },
  { id: 'this_year', label: 'This Year' },
  { id: 'custom', label: 'Custom Range' },
];

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileNav,
  onSelectView,
  onRefreshData,
  isRefreshing = false,
  onOpenResetPassword,
}) => {
  const { selectedOption, setSelectedOption, dateRange, setCustomRange } = useDateFilter();
  const { user, logout } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Custom date picker state
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const searchRef = useRef<HTMLDivElement>(null);
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      const results = await performGlobalSearch(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchModal(false);
      }
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchResultClick = (item: SearchResultItem) => {
    setShowSearchModal(false);
    setSearchQuery('');
    onSelectView(item.targetView as NavView);
  };

  const handleApplyCustomDates = () => {
    if (customStart && customEnd) {
      setCustomRange(new Date(customStart), new Date(customEnd));
      setShowDatePicker(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between min-h-16 px-4 sm:px-7 py-3 bg-white border-b border-[#e2e8f0] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {/* Left: Mobile Menu Toggle & IronDrobe Eyebrow + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileNav}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500 leading-none mb-1">
            STYLEFLEET PLATFORM
          </p>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-none">
            Operations Console
          </h2>
        </div>
      </div>

      {/* Global Search Input */}
      <div className="hidden md:flex flex-1 max-w-md mx-6">
        <div ref={searchRef} className="relative w-full">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search salons, clients, staff, bills, deletions..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchModal(true);
              }}
              onFocus={() => setShowSearchModal(true)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#1c1f26] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[#1c1f26] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchModal && searchQuery.trim().length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E5E7EB] rounded-xl shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto">
              {isSearching ? (
                <div className="p-4 text-center text-xs text-neutral-500">
                  Searching live database...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-neutral-500">
                  No matching records in Supabase.
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {searchResults.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSearchResultClick(item)}
                      className="p-3 hover:bg-[#F9FAFB] cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-neutral-900 truncate">
                            {item.title}
                          </span>
                          {item.badge && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-neutral-100 text-neutral-900 font-mono border border-neutral-300 font-bold">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls: Realtime Pill, Date Filter, Refresh, Admin Chip */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Realtime Live Indicator */}
        <div
          title="Supabase Realtime active"
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 border border-neutral-300 text-neutral-900 text-[11px] font-bold"
        >
          <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
          <span>LIVE SYNC</span>
        </div>

        {/* Global Date Filter Dropdown */}
        <div ref={dateDropdownRef} className="relative">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#E5E7EB] bg-white text-xs font-bold text-neutral-800 hover:text-black hover:border-black transition-colors cursor-pointer shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5 text-neutral-700" />
            <span className="truncate max-w-[120px] sm:max-w-none">
              {dateRange.label}
            </span>
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          </button>

          {showDatePicker && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E5E7EB] rounded-xl shadow-xl p-2 z-50">
              <div className="text-[11px] font-extrabold text-neutral-400 px-2 py-1 uppercase tracking-wider">
                Select Date Filter
              </div>
              <div className="space-y-0.5 mt-1">
                {DATE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setSelectedOption(opt.id);
                      if (opt.id !== 'custom') setShowDatePicker(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      selectedOption === opt.id
                        ? 'bg-[#1c1f26] text-white font-bold'
                        : 'text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {selectedOption === 'custom' && (
                <div className="mt-2 pt-2 border-t border-neutral-100 space-y-2 px-1">
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-0.5 font-semibold">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full text-xs p-1.5 rounded border border-[#E5E7EB] bg-white text-neutral-900 focus:outline-none focus:border-[#1c1f26]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-0.5 font-semibold">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full text-xs p-1.5 rounded border border-[#E5E7EB] bg-white text-neutral-900 focus:outline-none focus:border-[#1c1f26]"
                    />
                  </div>
                  <button
                    onClick={handleApplyCustomDates}
                    disabled={!customStart || !customEnd}
                    className="w-full py-1.5 text-xs font-bold rounded bg-[#1c1f26] text-white hover:bg-[#282d37] transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    Apply Range
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Manual Refresh */}
        {onRefreshData && (
          <button
            onClick={onRefreshData}
            disabled={isRefreshing}
            title="Refresh Real Data from Supabase"
            className="p-2 rounded-xl border border-[#E5E7EB] bg-white text-neutral-600 hover:text-[#1c1f26] hover:border-[#1c1f26] transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#1c1f26]' : ''}`} />
          </button>
        )}

        {/* Admin Chip */}
        <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-neutral-200">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-neutral-200 bg-neutral-50/80">
            <div className="w-6 h-6 rounded-full bg-[#1c1f26] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
              S
            </div>
            <div className="hidden sm:flex flex-col text-left leading-tight">
              <span className="text-[9px] font-extrabold text-[#1c1f26] uppercase tracking-wider">
                ADMIN
              </span>
              <span className="text-[11px] font-medium text-neutral-600 truncate max-w-[140px]">
                {user?.email || 'support@tecstellar.com'}
              </span>
            </div>
          </div>
        </div>

        {/* Topbar Action Buttons */}
        <div className="hidden xl:flex items-center gap-1.5">
          <button
            onClick={() => {
              if (onOpenResetPassword) onOpenResetPassword();
            }}
            className="px-2.5 py-1.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-[#1c1f26] font-semibold text-xs transition-colors cursor-pointer"
            title="Reset Admin Panel password"
          >
            Reset password
          </button>
        </div>

        {/* Sign Out Button in Dark Gray Theme */}
        <button
          onClick={logout}
          title="Sign Out of Admin Console"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1c1f26] hover:bg-[#282d37] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
};

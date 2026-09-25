import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Calendar,
  Sun,
  Moon,
  Menu,
  RefreshCw,
  Radio,
  ExternalLink,
  X,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useDateFilter } from '../../context/DateFilterContext';
import { performGlobalSearch, SearchResultItem } from '../../services/searchService';
import { DateFilterOption, NavView } from '../../types/dashboard';

interface HeaderProps {
  onToggleMobileNav: () => void;
  onSelectView: (view: NavView) => void;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
}

const DATE_OPTIONS: { id: DateFilterOption; label: string }[] = [
  { id: 'all_time', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last_7_days', label: 'Last 7 Days' },
  { id: 'last_30_days', label: 'Last 30 Days' },
  { id: 'last_90_days', label: 'Last 90 Days' },
  { id: 'this_month', label: 'This Month' },
  { id: 'previous_month', label: 'Previous Month' },
  { id: 'this_year', label: 'This Year' },
  { id: 'custom', label: 'Custom Range' },
];

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileNav,
  onSelectView,
  onRefreshData,
  isRefreshing = false,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { selectedOption, setSelectedOption, dateRange, setCustomRange } = useDateFilter();

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
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-[#161826]/95 light:bg-white/95 backdrop-blur-md border-b border-[#2D3154] light:border-slate-200">
      {/* Left Area: Mobile menu & Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          onClick={onToggleMobileNav}
          className="lg:hidden p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1E2136] light:hover:bg-slate-100"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="lg:hidden flex items-center shrink-0">
          <img src="/stylefleet-logo.png" alt="StyleFleet" className="w-7 h-7 object-contain" />
        </div>

        {/* Global Search Input */}
        <div ref={searchRef} className="relative flex-1">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 light:text-slate-400" />
            <input
              type="text"
              placeholder="Search salons, clients, staff, bills, deletions..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchModal(true);
              }}
              onFocus={() => setShowSearchModal(true)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-[#2D3154] light:border-slate-300 bg-[#1E2136] light:bg-slate-50 text-white light:text-slate-900 placeholder:text-neutral-400 light:placeholder:text-slate-400 focus:outline-none focus:border-[#D9A441] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchModal && searchQuery.trim().length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1E2136] light:bg-white border border-[#2D3154] light:border-slate-200 rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
              {isSearching ? (
                <div className="p-4 text-center text-xs text-neutral-400 light:text-slate-400">
                  Searching live database...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-neutral-400 light:text-slate-400">
                  No matching records in Supabase.
                </div>
              ) : (
                <div className="divide-y divide-[#2D3154]/50 light:divide-slate-100">
                  {searchResults.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSearchResultClick(item)}
                      className="p-3 hover:bg-[#232742] light:hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white light:text-slate-900 truncate">
                            {item.title}
                          </span>
                          {item.badge && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#D9A441]/20 text-[#D9A441] font-mono border border-[#D9A441]/30">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-400 light:text-slate-500 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls: Realtime Pill, Date Filter, Refresh, Theme Toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Realtime Live Indicator */}
        <div
          title="Supabase Realtime active"
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-[11px] font-medium"
        >
          <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
          <span>Realtime Live</span>
        </div>

        {/* Global Date Filter Dropdown */}
        <div ref={dateDropdownRef} className="relative">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#2D3154] light:border-slate-300 bg-[#1E2136] light:bg-white text-xs font-medium text-white light:text-slate-800 hover:border-[#D9A441] transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-[#D9A441]" />
            <span className="truncate max-w-[120px] sm:max-w-none">
              {dateRange.label}
            </span>
          </button>

          {showDatePicker && (
            <div className="absolute right-0 mt-2 w-64 bg-[#1E2136] light:bg-white border border-[#2D3154] light:border-slate-200 rounded-xl shadow-2xl p-2 z-50">
              <div className="text-[11px] font-semibold text-neutral-400 light:text-slate-400 px-2 py-1 uppercase tracking-wider">
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
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedOption === opt.id
                        ? 'bg-[#D9A441]/20 text-[#D9A441] font-semibold'
                        : 'text-neutral-300 light:text-slate-700 hover:bg-[#232742] light:hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {selectedOption === 'custom' && (
                <div className="mt-2 pt-2 border-t border-[#2D3154] light:border-slate-200 space-y-2 px-1">
                  <div>
                    <label className="block text-[10px] text-neutral-400 light:text-slate-500 mb-0.5">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full text-xs p-1.5 rounded border border-[#2D3154] light:border-slate-300 bg-[#161826] light:bg-slate-50 text-white light:text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 light:text-slate-500 mb-0.5">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full text-xs p-1.5 rounded border border-[#2D3154] light:border-slate-300 bg-[#161826] light:bg-slate-50 text-white light:text-slate-900"
                    />
                  </div>
                  <button
                    onClick={handleApplyCustomDates}
                    disabled={!customStart || !customEnd}
                    className="w-full py-1 text-xs font-semibold rounded bg-[#D9A441] text-[#161826] hover:bg-[#E0C068] transition-colors disabled:opacity-40"
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
            className="p-2 rounded-xl border border-[#2D3154] light:border-slate-300 bg-[#1E2136] light:bg-white text-neutral-300 light:text-slate-700 hover:text-[#D9A441] hover:border-[#D9A441] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#D9A441]' : ''}`} />
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          className="p-2 rounded-xl border border-[#2D3154] light:border-slate-300 bg-[#1E2136] light:bg-white text-neutral-300 light:text-slate-700 hover:text-[#D9A441] hover:border-[#D9A441] transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-[#D9A441]" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>
      </div>
    </header>
  );
};

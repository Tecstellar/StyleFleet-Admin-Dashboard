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
  LogOut,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useDateFilter } from '../../context/DateFilterContext';
import { useAuth } from '../../context/AuthContext';
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
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB]">
      {/* Left Area: Mobile menu & Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          onClick={onToggleMobileNav}
          className="lg:hidden p-2 rounded-lg text-neutral-500 hover:text-black hover:bg-neutral-100 cursor-pointer"
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
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#D4AF37] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black cursor-pointer"
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
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#FCF9EE] text-[#B8860B] font-mono border border-[#D4AF37]/30">
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

      {/* Right Controls: Realtime Pill, Date Filter, Refresh, Theme Toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Realtime Live Indicator */}
        <div
          title="Supabase Realtime active"
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold"
        >
          <Radio className="w-3 h-3 animate-pulse text-emerald-600" />
          <span>Realtime Live</span>
        </div>

        {/* Global Date Filter Dropdown */}
        <div ref={dateDropdownRef} className="relative">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-neutral-700 hover:text-black hover:border-[#D4AF37] transition-colors cursor-pointer shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="truncate max-w-[120px] sm:max-w-none">
              {dateRange.label}
            </span>
          </button>

          {showDatePicker && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E5E7EB] rounded-xl shadow-xl p-2 z-50">
              <div className="text-[11px] font-bold text-neutral-500 px-2 py-1 uppercase tracking-wider">
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
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      selectedOption === opt.id
                        ? 'bg-[#FCF9EE] text-[#B8860B] font-bold border border-[#D4AF37]/30'
                        : 'text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {selectedOption === 'custom' && (
                <div className="mt-2 pt-2 border-t border-neutral-100 space-y-2 px-1">
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-0.5">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full text-xs p-1.5 rounded border border-[#E5E7EB] bg-white text-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-0.5">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full text-xs p-1.5 rounded border border-[#E5E7EB] bg-white text-neutral-900"
                    />
                  </div>
                  <button
                    onClick={handleApplyCustomDates}
                    disabled={!customStart || !customEnd}
                    className="w-full py-1.5 text-xs font-bold rounded bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-black hover:brightness-105 transition-colors disabled:opacity-40 cursor-pointer"
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
            className="p-2 rounded-xl border border-[#E5E7EB] bg-white text-neutral-600 hover:text-black hover:border-[#D4AF37] transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#D4AF37]' : ''}`} />
          </button>
        )}

        {/* User Pill & Sign Out Button */}
        <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-[#E5E7EB]">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-[11px] font-bold text-neutral-900 truncate max-w-[130px]">
              {user?.email || 'Stylefleet@tecstellar.com'}
            </span>
            <span className="text-[9px] font-extrabold text-[#B8860B] uppercase tracking-wider">
              Super Admin
            </span>
          </div>

          <button
            onClick={logout}
            title="Sign Out of Admin Console"
            className="p-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer shadow-2xs"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
          </button>
        </div>
      </div>
    </header>
  );
};

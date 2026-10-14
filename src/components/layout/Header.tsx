import React from 'react';
import { Menu, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NavView } from '../../types/dashboard';

interface HeaderProps {
  onToggleMobileNav: () => void;
  onSelectView: (view: NavView) => void;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
  onOpenResetPassword?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileNav,
  onRefreshData,
  isRefreshing = false,
  onOpenResetPassword,
}) => {
  const { user, logout } = useAuth();
  const userEmail = user?.email || 'stylefleet@tecstellar.com';

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6 bg-white border-b border-slate-200/90 shadow-2xs">
      {/* Left: Mobile Menu Toggle & Brand Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileNav}
          className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-tight">
            StyleFleet
          </h2>
          <p className="text-[11px] font-medium text-slate-500 leading-none">
            Operations Console
          </p>
        </div>
      </div>

      {/* Right Controls: Refresh, Reset Password, Admin Avatar Circle, Sign Out */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Manual Refresh Button */}
        {onRefreshData && (
          <button
            onClick={onRefreshData}
            disabled={isRefreshing}
            title="Refresh Data from Supabase"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#1D4ED8]' : 'text-slate-600'}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        )}

        {/* Reset Password Button */}
        {onOpenResetPassword && (
          <button
            onClick={onOpenResetPassword}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer shadow-2xs"
            title="Reset Admin Panel password"
          >
            Reset password
          </button>
        )}

        {/* Small circular avatar in the corner near Sign out */}
        <div
          title={userEmail}
          className="w-8 h-8 rounded-full bg-[#1D4ED8] text-white text-xs font-bold flex items-center justify-center shadow-2xs cursor-default shrink-0 ring-2 ring-blue-100 hover:ring-blue-200 transition-all select-none"
        >
          {userEmail.charAt(0).toUpperCase()}
        </div>

        {/* Sign Out Button */}
        <button
          onClick={logout}
          title="Sign Out"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-medium transition-colors cursor-pointer shadow-2xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
};

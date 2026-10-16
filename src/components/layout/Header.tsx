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
    <header className="sticky top-0 z-20 flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6 bg-[#F8F3F0] border-b border-[#014BAA]/15 shadow-2xs">
      {/* Left: Mobile Menu Toggle & Brand Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileNav}
          className="lg:hidden p-1.5 rounded-lg text-black hover:bg-white transition-colors border border-[#014BAA]/20 cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5 text-[#014BAA]" />
        </button>

        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-black leading-tight">
            StyleFleet
          </h2>
          <p className="text-[11px] font-medium text-black/60 leading-none">
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#014BAA]/20 bg-[#F8F3F0] text-black hover:bg-white transition-colors cursor-pointer shadow-2xs text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#014BAA]' : 'text-[#014BAA]'}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        )}

        {/* Reset Password Button */}
        {onOpenResetPassword && (
          <button
            onClick={onOpenResetPassword}
            className="px-3 py-1.5 rounded-lg border border-[#014BAA]/20 bg-[#F8F3F0] hover:bg-white text-black font-medium text-xs transition-colors cursor-pointer shadow-2xs"
            title="Reset Admin Panel password"
          >
            Reset password
          </button>
        )}

        {/* Small circular avatar in the corner near Sign out */}
        <div
          title={userEmail}
          className="w-8 h-8 rounded-full bg-[#014BAA] text-white text-xs font-bold flex items-center justify-center shadow-2xs cursor-default shrink-0 ring-2 ring-[#014BAA]/20 transition-all select-none"
        >
          {userEmail.charAt(0).toUpperCase()}
        </div>

        {/* Sign Out Button */}
        <button
          onClick={logout}
          title="Sign Out"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#014BAA] hover:bg-[#013b86] text-white text-xs font-medium transition-colors cursor-pointer shadow-2xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
};

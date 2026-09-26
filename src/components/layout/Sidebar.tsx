import React from 'react';
import {
  LayoutDashboard,
  Store,
  BarChart3,
  MessageSquare,
  Smartphone,
  History,
  ShieldAlert,
  UserX,
  Sliders,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Database,
  X,
  LogOut,
  Crown,
  Shield,
  FileText,
} from 'lucide-react';
import { NavView } from '../../types/dashboard';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenPrivacyPolicy?: () => void;
  salonsCount?: number;
  deletionsCount?: number;
  supportCount?: number;
}

interface NavItem {
  id: NavView;
  label: string;
  icon: any;
  badge?: number;
  badgeColor?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onOpenPrivacyPolicy,
  salonsCount = 3,
  deletionsCount = 5,
  supportCount = 0,
}) => {
  const { user, logout } = useAuth();
  // Exactly 9 items matching https://salon-admin-dashboard-lake.vercel.app/
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'salons_360', label: 'Salons & 360°', icon: Store, badge: salonsCount },
    { id: 'reports_bi', label: 'Reports & BI', icon: BarChart3 },
    { id: 'support_messages', label: 'Support Messages', icon: MessageSquare, badge: supportCount },
    { id: 'app_telemetry', label: 'App Version & Telemetry', icon: Smartphone },
    { id: 'platform_audit', label: 'Platform Audit Trail', icon: History },
    { id: 'system_health', label: 'System Health Alerts', icon: ShieldAlert },
    {
      id: 'account_deletions',
      label: 'Account Deletions',
      icon: UserX,
      badge: deletionsCount,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    },
    { id: 'system_governance', label: 'System Governance', icon: Sliders },
  ];

  const handleItemClick = (id: NavView) => {
    onSelectView(id);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#161826] light:bg-white border-r-2 border-[#D4AF37]/30 text-white light:text-slate-900 transition-colors select-none">
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b-2 border-[#D4AF37]/25 bg-gradient-to-r from-[#161826] via-[#1E2136] to-[#161826] light:from-white light:via-[#FCF9EE] light:to-white">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center shadow-sm flex-shrink-0 border-2 border-[#D4AF37]/50 overflow-hidden p-1">
            <img src="/stylefleet-logo.png" alt="StyleFleet Logo" className="w-full h-full object-contain" />
          </div>
          {(!isCollapsed || isMobileOpen) && (
            <div className="overflow-hidden transition-all duration-200">
              <h1 className="text-sm font-bold text-white light:text-[#161826] tracking-wide truncate flex items-center gap-1.5">
                <span>STYLE FLEET</span>
                <span className="text-[9.5px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#D4AF37]/20 text-[#DFB847] light:text-[#161826] light:bg-[#FCF9EE] border border-[#D4AF37]/40 shadow-xs">
                  SUPER ADMIN
                </span>
              </h1>
              <div className="flex items-center gap-1 text-[11px] text-[#D4AF37] font-bold tracking-wide">
                <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                <span>HQ Command</span>
              </div>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1E2136] light:text-slate-600 light:hover:text-[#161826] light:hover:bg-[#FCF9EE] transition-colors border border-[#D4AF37]/30"
          title="Close Navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* User Card */}
      {(!isCollapsed || isMobileOpen) && (
        <div className="px-4 py-2.5 bg-[#1E2136]/70 light:bg-[#FCF9EE]/60 border-b border-[#D4AF37]/20">
          <div className="flex items-center justify-between text-xs font-bold text-white light:text-[#161826]">
            <div className="flex items-center gap-2 truncate max-w-[130px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="truncate text-[11px] font-semibold text-neutral-200 light:text-[#161826]">
                {user?.email || 'Stylefleet@tecstellar.com'}
              </span>
            </div>
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full border shadow-2xs bg-[#161826] text-[#DFB847] border-[#D4AF37]/40 shrink-0">
              Super Admin
            </span>
          </div>
        </div>
      )}

      {/* Nav Menu */}
      <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              title={isCollapsed && !isMobileOpen ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all group relative text-left ${
                isActive
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#161826] shadow-sm border border-[#D4AF37]'
                  : 'text-neutral-300 light:text-[#161826] hover:text-white light:hover:text-[#161826] hover:bg-[#1E2136] light:hover:bg-[#FCF9EE] border border-transparent'
              }`}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 transition-colors ${
                  isActive
                    ? 'text-[#161826]'
                    : 'text-[#D4AF37] light:text-[#161826] group-hover:text-[#D4AF37]'
                }`}
              />

              {(!isCollapsed || isMobileOpen) && (
                <div className="flex-1 flex items-center justify-between overflow-hidden">
                  <span className="truncate">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-mono border ${
                        isActive
                          ? 'bg-[#161826] text-[#DFB847] border-[#161826]'
                          : item.badgeColor || 'bg-[#2D3154] text-[#D9A441] border-[#D9A441]/40'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Sign Out & Supabase Status */}
      <div className="p-3 border-t-2 border-[#D4AF37]/20 bg-[#161826]/90 light:bg-[#FCF9EE]/50 space-y-2">
        {(!isCollapsed || isMobileOpen) ? (
          <>
            <div className="flex items-center justify-between px-1 text-[11px]">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Supabase Live</span>
              </div>
              <button
                onClick={onToggleCollapse}
                className="hidden lg:flex p-1 rounded hover:bg-[#1E2136] text-neutral-400 hover:text-white transition-colors"
                title="Collapse Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => onSelectView('system_governance')}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-neutral-300 light:text-[#161826] hover:bg-[#2D3154] light:hover:bg-rose-100 light:hover:text-rose-900 transition-colors border border-[#2D3154] light:border-slate-300"
              title="System Governance & Settings"
            >
              <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Governance Settings</span>
            </button>

            {onOpenPrivacyPolicy && (
              <button
                onClick={onOpenPrivacyPolicy}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-[#1E2136] transition-colors"
                title="View StyleFleet Privacy Policy"
              >
                <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Privacy Policy</span>
              </button>
            )}

            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-300 hover:text-white hover:bg-rose-500/20 transition-colors border border-rose-500/30"
              title="Sign Out of Admin Console"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Sign Out</span>
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"
              title="Supabase Live"
            />
            {onOpenPrivacyPolicy && (
              <button
                onClick={onOpenPrivacyPolicy}
                className="p-1.5 rounded hover:bg-[#1E2136] text-[#D4AF37] transition-colors"
                title="Privacy Policy"
              >
                <FileText className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={logout}
              className="p-1.5 rounded hover:bg-rose-500/20 text-rose-400 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded hover:bg-[#1E2136] text-neutral-400 hover:text-white transition-colors"
              title="Expand Sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out h-screen sticky top-0 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[80vw] shadow-2xl z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

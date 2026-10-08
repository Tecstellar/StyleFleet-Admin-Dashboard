import React, { useState } from 'react';
import {
  LayoutDashboard,
  BarChart2,
  TrendingUp,
  LayoutGrid,
  Users,
  Activity,
  UserPlus,
  Headphones,
  Smartphone,
  Bug,
  Store,
  Crown,
  UserCheck,
  History,
  CreditCard,
  Database,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  FileText,
  Trash2,
  LogOut,
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
  onOpenDeleteAccount?: () => void;
  salonsCount?: number;
  staffCount?: number;
  deletionsCount?: number;
  supportCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onOpenPrivacyPolicy,
  onOpenDeleteAccount,
  salonsCount = 0,
  staffCount = 0,
  deletionsCount = 0,
  supportCount = 0,
}) => {
  const { logout } = useAuth();
  const [isAppActivityOpen, setIsAppActivityOpen] = useState(false);
  const [isShopAnalyticsOpen, setIsShopAnalyticsOpen] = useState(false);

  const handleItemClick = (id: NavView) => {
    onSelectView(id);
    onCloseMobile();
  };

  const isItemActive = (id: NavView) => currentView === id;

  const renderNavButton = (
    id: NavView,
    label: string,
    Icon: React.ComponentType<{ className?: string }>,
    badge?: number,
    badgeColor?: string
  ) => {
    const active = isItemActive(id);
    return (
      <button
        key={id}
        onClick={() => handleItemClick(id)}
        title={isCollapsed && !isMobileOpen ? label : undefined}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all group relative text-left cursor-pointer ${
          active
            ? 'bg-white/10 text-white font-semibold'
            : 'text-white/85 hover:text-white hover:bg-[#17313A] font-medium'
        }`}
      >
        <Icon
          className={`w-4 h-4 shrink-0 transition-colors ${
            active ? 'text-white' : 'text-white/60 group-hover:text-white'
          }`}
        />

        {(!isCollapsed || isMobileOpen) && (
          <div className="flex-1 flex items-center justify-between overflow-hidden">
            <span className="truncate">{label}</span>
            {badge !== undefined && badge > 0 && (
              <span
                className={`ml-2 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  active ? 'bg-white/20 text-white' : 'bg-white/10 text-white/80'
                }`}
              >
                {badge}
              </span>
            )}
          </div>
        )}
      </button>
    );
  };

  const renderCollapsibleHeader = (
    label: string,
    Icon: React.ComponentType<{ className?: string }>,
    isOpen: boolean,
    onToggle: () => void,
    hasActiveChild: boolean
  ) => {
    return (
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] transition-all group cursor-pointer ${
          hasActiveChild
            ? 'text-white font-semibold'
            : 'text-white/85 hover:text-white hover:bg-[#17313A] font-medium'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon
            className={`w-4 h-4 shrink-0 transition-colors ${
              hasActiveChild ? 'text-white' : 'text-white/75 group-hover:text-white'
            }`}
          />
          {(!isCollapsed || isMobileOpen) && <span className="truncate">{label}</span>}
        </div>
        {(!isCollapsed || isMobileOpen) && (
          <ChevronRight
            className={`w-4 h-4 text-white/75 group-hover:text-white transition-transform duration-200 shrink-0 ${
              isOpen ? 'rotate-90' : ''
            }`}
          />
        )}
      </button>
    );
  };

  const renderSubNavButton = (
    id: NavView,
    label: string,
    Icon: React.ComponentType<{ className?: string }>,
    badge?: number
  ) => {
    const active = isItemActive(id);
    return (
      <button
        key={id}
        onClick={() => handleItemClick(id)}
        className={`w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 rounded-lg text-[12px] transition-all group relative text-left cursor-pointer ${
          active
            ? 'bg-white/10 text-white font-semibold'
            : 'text-white/85 hover:text-white hover:bg-[#17313A] font-medium'
        }`}
      >
        <Icon
          className={`w-3.5 h-3.5 shrink-0 ${
            active ? 'text-white' : 'text-white/60 group-hover:text-white'
          }`}
        />
        <span className="truncate">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span
            className={`ml-auto px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
              active ? 'bg-white/20 text-white' : 'bg-white/10 text-white/80'
            }`}
          >
            {badge}
          </span>
        )}
      </button>
    );
  };

  const isAppActivityActive =
    isItemActive('app_telemetry') || isItemActive('diagnostic_logs');

  const isShopAnalyticsActive =
    isItemActive('salons_360') ||
    isItemActive('subscription_plans') ||
    isItemActive('staff_access') ||
    isItemActive('platform_audit') ||
    isItemActive('user_details') ||
    isItemActive('purchases') ||
    isItemActive('system_health') ||
    isItemActive('reports_bi');

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0B1F26] text-white border-r border-[#17313A] select-none">
      {/* Brand Header */}
      <div className="p-3.5 border-b border-[#17313A]">
        <div className="flex items-center justify-between">
          {(!isCollapsed || isMobileOpen) ? (
            <div className="w-full flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-sm border border-[#17313A]">
                  <img
                    src="/stylefleet-icon.png"
                    alt="StyleFleet Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[12px] font-bold text-white tracking-wider uppercase leading-tight truncate">
                    STYLEFLEET CRM
                  </span>
                  <span className="text-[11px] font-semibold text-teal-200/90 leading-tight mt-0.5">
                    Admin
                  </span>
                </div>
              </div>
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-[#17313A] transition-colors cursor-pointer"
                title="Close Navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="w-full flex justify-center py-1">
              <div className="w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-sm border border-[#17313A]">
                <img
                  src="/stylefleet-icon.png"
                  alt="StyleFleet Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nav Menu: Exact Reference Architecture from user image */}
      <nav className="flex-1 px-2.5 py-3 space-y-3 overflow-y-auto">
        {/* TOP SECTION: EXACT SEQUENCE FROM IMAGE */}
        <div className="space-y-0.5">
          {(!isCollapsed || isMobileOpen) && (
            <div className="px-3 pb-1.5 text-[10.5px] font-bold tracking-[0.08em] text-teal-200/95 uppercase font-mono">
              WORKSPACE
            </div>
          )}
          {renderNavButton('dashboard', 'Founder Dashboard', LayoutDashboard)}
          {renderNavButton('product_analytics', 'Product Analytics', BarChart2)}
          {renderNavButton('daily_user_metrics', 'Daily User Metrics', BarChart2)}
          {renderNavButton('daily_bills', 'Daily Order Metrics', BarChart2)}
          {renderNavButton('revenue_trend', 'Revenue Trend', TrendingUp)}
          {renderNavButton('overview', 'Overview', LayoutGrid)}
          {renderNavButton('customer_tracking', 'Customer Tracking', Users)}
          {renderNavButton('incomplete_signups', 'Incomplete signups', Users)}
          {renderNavButton('account_deletions', 'Deleted users', Users, deletionsCount)}

          {/* COLLAPSIBLE 1: APP ACTIVITY */}
          <div className="pt-0.5">
            {renderCollapsibleHeader(
              'App Activity',
              Activity,
              isAppActivityOpen || isAppActivityActive,
              () => setIsAppActivityOpen(!isAppActivityOpen),
              isAppActivityActive
            )}
            {(isAppActivityOpen || isAppActivityActive || isCollapsed) && (
              <div className="space-y-0.5 mt-0.5">
                {renderSubNavButton('app_telemetry', 'Touch Heatmap', Smartphone)}
                {renderSubNavButton('diagnostic_logs', 'App Bugs', Bug)}
              </div>
            )}
          </div>

          {/* COLLAPSIBLE 2: SHOP ANALYTICS */}
          <div className="pt-0.5">
            {renderCollapsibleHeader(
              'Shop Analytics',
              BarChart2,
              isShopAnalyticsOpen || isShopAnalyticsActive,
              () => setIsShopAnalyticsOpen(!isShopAnalyticsOpen),
              isShopAnalyticsActive
            )}
            {(isShopAnalyticsOpen || isShopAnalyticsActive || isCollapsed) && (
              <div className="space-y-0.5 mt-0.5">
                {renderSubNavButton('salons_360', 'Salon Directory', Store, salonsCount)}
                {renderSubNavButton('subscription_plans', 'Subscription & 100 Quotas', Crown)}
                {renderSubNavButton('staff_access', 'Stylist Access Control', UserCheck, staffCount)}
                {renderSubNavButton('platform_audit', 'Activity Logs', History)}
                {renderSubNavButton('user_details', 'User Details', UserCheck)}
                {renderSubNavButton('purchases', 'Payment History', CreditCard)}
                {renderSubNavButton('system_health', 'Shop Health', Database)}
                {renderSubNavButton('reports_bi', 'Analytics', BarChart3)}
              </div>
            )}
          </div>

          {/* CRM added users */}
          {renderNavButton('crm_added_users', 'CRM added users', UserPlus)}
        </div>

        {/* SECTION: ENGAGEMENT */}
        <div className="pt-2">
          {(!isCollapsed || isMobileOpen) && (
            <div className="px-3 pb-1.5 text-[11px] font-bold tracking-[0.08em] text-teal-200/95 uppercase font-mono">
              ENGAGEMENT
            </div>
          )}
          <div className="space-y-0.5">
            {renderNavButton('support_messages', 'Support', Headphones, supportCount)}
          </div>
        </div>
      </nav>

      {/* Footer Utility Bar */}
      <div className="p-2.5 border-t border-[#17313A] bg-[#0B1F26]">
        {(!isCollapsed || isMobileOpen) ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1 text-[11px]">
              <div className="flex items-center gap-1.5 text-teal-200 font-bold font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] tracking-wide uppercase text-teal-200">Live Sync</span>
              </div>
              <button
                onClick={onToggleCollapse}
                className="hidden lg:flex p-1 rounded-md hover:bg-[#17313A] text-white/80 hover:text-white transition-colors cursor-pointer"
                title="Collapse Sidebar"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Icon-Only Compact Horizontal Toolbar */}
            <div className="flex items-center justify-between gap-1 p-1 bg-[#0A3641] rounded-xl border border-[#17313A]">
              {onOpenPrivacyPolicy && (
                <button
                  onClick={onOpenPrivacyPolicy}
                  className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-[#17313A] transition-all cursor-pointer"
                  title="Privacy Policy"
                >
                  <FileText className="w-4 h-4" />
                </button>
              )}

              {onOpenDeleteAccount && (
                <button
                  onClick={onOpenDeleteAccount}
                  className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-[#17313A] transition-all cursor-pointer"
                  title="Account Deletion Info"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <div className="w-px h-4 bg-[#17313A] mx-0.5" />

              <button
                onClick={logout}
                className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-[#17313A] transition-all cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"
              title="Live Connection"
            />
            {onOpenPrivacyPolicy && (
              <button
                onClick={onOpenPrivacyPolicy}
                className="p-2 rounded-lg hover:bg-[#17313A] text-white/80 hover:text-white transition-colors cursor-pointer"
                title="Privacy Policy"
              >
                <FileText className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-[#17313A] text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-md hover:bg-[#17313A] text-white/80 hover:text-white transition-colors cursor-pointer"
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
        className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Off-canvas Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 lg:hidden transform transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
};

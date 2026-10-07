import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/views/DashboardView';
import { SalonsCombinedView } from './components/views/SalonsCombinedView';
import { StylistsView } from './components/views/StylistsView';
import { ReportsView } from './components/views/ReportsView';
import { SupportMessagesView } from './components/views/SupportMessagesView';
import { AppTelemetryCombinedView } from './components/views/AppTelemetryCombinedView';
import { AuditTrailView } from './components/views/AuditTrailView';
import { SystemHealthView } from './components/views/SystemHealthView';
import { AccountDeletionsView } from './components/views/AccountDeletionsView';
import { PurchasesView } from './components/views/PurchasesView';
import { CustomerTrackingView } from './components/views/CustomerTrackingView';
import { IncompleteSignupsView } from './components/views/IncompleteSignupsView';
import { DailyBillsView } from './components/views/DailyBillsView';
import { SubscriptionRevenueView } from './components/views/SubscriptionRevenueView';
import { SubscriptionPlansView } from './components/views/SubscriptionPlansView';
import { OverviewView } from './components/views/OverviewView';
import { ProductAnalyticsView } from './components/views/ProductAnalyticsView';
import { DailyUserMetricsView } from './components/views/DailyUserMetricsView';
import { CrmAddedUsersView } from './components/views/CrmAddedUsersView';
import { LoginView } from './components/auth/LoginView';
import { PrivacyPolicyView } from './components/views/PrivacyPolicyView';
import { DeleteAccountView } from './components/views/DeleteAccountView';
import { ResetPasswordModal } from './components/modals/ResetPasswordModal';
import { useAuth } from './context/AuthContext';

import { fetchShops } from './services/salonsService';
import { fetchProfiles, fetchStaff, fetchCustomers } from './services/usersService';
import { fetchBills, fetchPayments, fetchSubscriptions } from './services/billingService';
import { fetchAppointments } from './services/appointmentsService';
import { supabase } from './services/supabase';

import { fetchSupportMessages, subscribeToSupportMessages } from './services/supportService';
import { fetchAccountDeletions, subscribeToAccountDeletions } from './services/deletionsService';
import {
  fetchTelemetryRecords,
  fetchSystemHealthRecords,
  fetchSystemLogs,
  subscribeToTelemetryAndHealth,
} from './services/telemetryAndHealthService';

import {
  Shop,
  Profile,
  Staff,
  Customer,
  Bill,
  Payment,
  Appointment,
  AccountDeletion,
  SupportMessage,
  TelemetryRecord,
  SystemHealthRecord,
  SystemLogRecord,
} from './types/database';
import { NavView } from './types/dashboard';

function checkIsPrivacyUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const search = window.location.search.toLowerCase();
  return (
    path === '/privacy' ||
    path === '/privacy-policy' ||
    path === '/privacy-policies' ||
    path.startsWith('/privacy') ||
    hash.includes('privacy') ||
    search.includes('privacy')
  );
}

function checkIsDeleteAccountUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const search = window.location.search.toLowerCase();
  return (
    path === '/delete-account' ||
    path === '/delete-account/' ||
    path === '/delete' ||
    path === '/delete/' ||
    path === '/account-deletion' ||
    path.startsWith('/delete-account') ||
    hash.includes('delete-account') ||
    search.includes('delete-account')
  );
}

function getBillRedirectInfo(): { id: string | null; directFile: string | null } {
  if (typeof window === 'undefined') return { id: null, directFile: null };
  const path = window.location.pathname;
  const match = path.match(/^\/(?:b|bill|invoice)\/([a-zA-Z0-9_.-]+)/i);
  const id = match ? match[1] : null;
  const params = new URLSearchParams(window.location.search);
  const directFile = params.get('f') || params.get('file');
  return { id, directFile };
}

export const App: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [billRedirectInfo] = useState(() => getBillRedirectInfo());
  const [resolvedPdfUrl, setResolvedPdfUrl] = useState<string | null>(null);
  const [billRedirectLoading, setBillRedirectLoading] = useState(() => !!billRedirectInfo.id);
  const [isPrivacyRoute, setIsPrivacyRoute] = useState(() => checkIsPrivacyUrl());
  const [isDeleteAccountRoute, setIsDeleteAccountRoute] = useState(() => checkIsDeleteAccountUrl());

  useEffect(() => {
    const { id, directFile } = billRedirectInfo;
    if (!id) return;

    if (directFile) {
      const storageUrl = `https://scgokpcoyfewrtrwqxpu.supabase.co/storage/v1/object/public/invoices/${directFile}`;
      setResolvedPdfUrl(storageUrl);
      window.location.replace(storageUrl);
      return;
    }

    if (id.toLowerCase().endsWith('.pdf')) {
      const storageUrl = `https://scgokpcoyfewrtrwqxpu.supabase.co/storage/v1/object/public/invoices/${id}`;
      setResolvedPdfUrl(storageUrl);
      window.location.replace(storageUrl);
      return;
    }

    const resolveBill = async () => {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        let q = supabase.from('bills').select('pdf_url');
        if (isUuid) {
          q = q.eq('id', id);
        } else {
          q = q.eq('invoice_number', id);
        }

        const res = await q.maybeSingle();
        const data = res.data as { pdf_url?: string } | null;
        if (data?.pdf_url) {
          setResolvedPdfUrl(data.pdf_url);
          window.location.replace(data.pdf_url);
        } else {
          // Fallback direct storage file attempt
          const fallbackUrl = `https://scgokpcoyfewrtrwqxpu.supabase.co/storage/v1/object/public/invoices/${id}.pdf`;
          setResolvedPdfUrl(fallbackUrl);
          window.location.replace(fallbackUrl);
        }
      } catch {
        const fallbackUrl = `https://scgokpcoyfewrtrwqxpu.supabase.co/storage/v1/object/public/invoices/${id}.pdf`;
        setResolvedPdfUrl(fallbackUrl);
        window.location.replace(fallbackUrl);
      }
    };

    resolveBill();
  }, [billRedirectInfo]);

  // Listen to popstate and hash change so back/forward or direct URLs work dynamically
  useEffect(() => {
    const handleUrlChange = () => {
      setIsPrivacyRoute(checkIsPrivacyUrl());
      setIsDeleteAccountRoute(checkIsDeleteAccountUrl());
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const openPrivacyPage = () => {
    setIsPrivacyRoute(true);
    setIsDeleteAccountRoute(false);
    if (!window.location.pathname.includes('privacy')) {
      window.history.pushState({}, '', '/privacy');
    }
  };

  const closePrivacyPage = () => {
    setIsPrivacyRoute(false);
    window.history.pushState({}, '', '/');
  };

  const openDeleteAccountPage = () => {
    setIsDeleteAccountRoute(true);
    setIsPrivacyRoute(false);
    if (!window.location.pathname.includes('delete-account')) {
      window.history.pushState({}, '', '/delete-account');
    }
  };

  const closeDeleteAccountPage = () => {
    setIsDeleteAccountRoute(false);
    window.history.pushState({}, '', '/');
  };

  // Navigation State — matches 9 options from reference dashboard
  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  const [salonsTab, setSalonsTab] = useState<'directory' | 'stylists' | 'ecosystem_360'>('directory');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [selectedShopForModal, setSelectedShopForModal] = useState<Shop | null>(null);
  const [salonModalInitialTab, setSalonModalInitialTab] = useState<'overview' | 'staff' | 'services' | 'billing' | 'settings' | 'telemetry'>('billing');
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [shopForPasswordReset, setShopForPasswordReset] = useState<Shop | null>(null);

  // Real Database Entities
  const [shops, setShops] = useState<Shop[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [deletions, setDeletions] = useState<AccountDeletion[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  // Newly Added Real Tables from Supabase
  const [telemetryRecords, setTelemetryRecords] = useState<TelemetryRecord[]>([]);
  const [systemHealthRecords, setSystemHealthRecords] = useState<SystemHealthRecord[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLogRecord[]>([]);

  // Status & Error
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Master Data Fetcher
  const loadAllData = useCallback(async () => {
    try {
      setFetchError(null);
      const [
        shopsRes,
        profilesRes,
        staffRes,
        customersRes,
        billsRes,
        paymentsRes,
        apptsRes,
        deletionsRes,
        supportRes,
        subsRes,
        telemetryRes,
        healthRes,
        logsRes,
      ] = await Promise.all([
        fetchShops(),
        fetchProfiles(),
        fetchStaff(),
        fetchCustomers(),
        fetchBills(),
        fetchPayments(),
        fetchAppointments(),
        fetchAccountDeletions(),
        fetchSupportMessages(),
        fetchSubscriptions(),
        fetchTelemetryRecords(),
        fetchSystemHealthRecords(),
        fetchSystemLogs(),
      ]);

      if (shopsRes.error) throw new Error(shopsRes.error);

      setShops(shopsRes.data);
      setProfiles(profilesRes.data);
      setStaff(staffRes.data);
      setCustomers(customersRes.data);
      setBills(billsRes.data);
      setPayments(paymentsRes.data);
      setAppointments(apptsRes.data);
      setDeletions(deletionsRes.data);
      setSupportMessages(supportRes.data);
      setSubscriptions(subsRes.data || []);
      setTelemetryRecords(telemetryRes.data);
      setSystemHealthRecords(healthRes.data);
      setSystemLogs(logsRes.data);
    } catch (err: any) {
      console.error('Data load error:', err);
      setFetchError(err.message || 'Unable to load real Supabase data. Please check connection.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [isAuthenticated, loadAllData]);

  // Realtime Subscriptions
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubSupport = subscribeToSupportMessages(() => {
      fetchSupportMessages().then((res) => {
        if (res.data) setSupportMessages(res.data);
      });
    });

    const unsubDeletions = subscribeToAccountDeletions(() => {
      fetchAccountDeletions().then((res) => {
        if (res.data) setDeletions(res.data);
      });
    });

    const unsubTelemetryHealth = subscribeToTelemetryAndHealth(() => {
      fetchTelemetryRecords().then((res) => {
        if (res.data) setTelemetryRecords(res.data);
      });
      fetchSystemHealthRecords().then((res) => {
        if (res.data) setSystemHealthRecords(res.data);
      });
      fetchSystemLogs().then((res) => {
        if (res.data) setSystemLogs(res.data);
      });
    });

    return () => {
      unsubSupport();
      unsubDeletions();
      unsubTelemetryHealth();
    };
  }, [isAuthenticated]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadAllData();
  };

  const handleSelectSalonDrilldown = (
    shop: Shop,
    initialTab: 'overview' | 'staff' | 'services' | 'billing' | 'settings' | 'telemetry' = 'billing'
  ) => {
    setSelectedShopForModal(shop);
    setSalonModalInitialTab(initialTab);
    setSalonsTab('directory');
    setCurrentView('salons_360');
  };

  const handleNavigateToStylists = () => {
    setSelectedShopForModal(null);
    setCurrentView('staff_access');
  };


  // 0. PUBLIC BILL / INVOICE REDIRECT:
  if (billRedirectInfo.id) {
    if (billRedirectLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA] text-neutral-900 p-6 flex-col gap-4 text-center selection:bg-black selection:text-white">
          <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
          <h2 className="text-lg font-semibold tracking-wide">Opening StyleFleet Invoice...</h2>
          <p className="text-xs text-neutral-500">Redirecting to your verified salon PDF invoice</p>
        </div>
      );
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA] text-neutral-900 p-6 flex-col gap-4 text-center selection:bg-black selection:text-white">
        <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center p-2 shadow-xs mb-2">
          <img src="/stylefleet-logo.png" alt="StyleFleet Logo" className="w-full h-full object-contain invert" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-neutral-900">StyleFleet Invoice</h2>
        <p className="text-xs text-neutral-600 max-w-sm">
          Your invoice document is ready. Click below to view or download.
        </p>
        {resolvedPdfUrl ? (
          <a
            href={resolvedPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2.5 rounded-xl bg-black hover:bg-neutral-800 font-semibold text-white text-sm transition-colors shadow-xs"
          >
            View / Download Invoice PDF
          </a>
        ) : (
          <p className="text-xs text-neutral-500 bg-neutral-100 px-4 py-2 rounded-xl border border-neutral-200">
            Invoice not found or expired. Please contact your salon for assistance.
          </p>
        )}
      </div>
    );
  }

  // 1. PUBLIC ACCOUNT DELETION PAGE:
  // Can be accessed directly via URL (e.g. /delete-account) without typing username & password!
  if (isDeleteAccountRoute) {
    return (
      <DeleteAccountView
        isPublic={!isAuthenticated}
        onNavigateToLogin={() => closeDeleteAccountPage()}
        onBackToDashboard={() => closeDeleteAccountPage()}
        onOpenPrivacyPolicy={openPrivacyPage}
      />
    );
  }

  // 2. PUBLIC PRIVACY POLICY PAGE:
  // Can be accessed directly via URL (e.g. /privacy or /privacy-policy) without typing username & password!
  if (isPrivacyRoute) {
    return (
      <PrivacyPolicyView
        isPublic={!isAuthenticated}
        onNavigateToLogin={() => closePrivacyPage()}
        onBackToDashboard={() => closePrivacyPage()}
        onOpenDeleteAccount={openDeleteAccountPage}
      />
    );
  }

  // 3. AUTHENTICATION GATE:
  if (!isAuthenticated) {
    return (
      <LoginView
        onOpenPrivacyPolicy={openPrivacyPage}
        onOpenDeleteAccount={openDeleteAccountPage}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8F9FA] text-[#111827] transition-colors">
      {/* Left Sidebar — Exact 9 options */}
      <Sidebar
        currentView={currentView}
        onSelectView={(view) => {
          setCurrentView(view);
          setSelectedShopForModal(null);
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        onOpenPrivacyPolicy={openPrivacyPage}
        onOpenDeleteAccount={openDeleteAccountPage}
        salonsCount={shops.length}
        staffCount={staff.length}
        deletionsCount={deletions.length}
        supportCount={supportMessages.filter((m) => m.status === 'open').length}
      />

      {/* Main Content Area — Offset for fixed sidebar so dashboard is never hidden */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Header Bar */}
        <Header
          onToggleMobileNav={() => setIsMobileNavOpen(true)}
          onSelectView={(v) => setCurrentView(v)}
          onRefreshData={handleManualRefresh}
          isRefreshing={isRefreshing}
          onOpenResetPassword={() => {
            setShopForPasswordReset(null);
            setIsResetPasswordOpen(true);
          }}
        />

        {/* Global Error Banner */}
        {fetchError && (
          <div className="mx-4 sm:mx-6 mt-4 p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs flex items-center justify-between gap-4">
            <div>
              <span className="font-semibold text-rose-200">Unable to load salon data: </span>
              {fetchError}
            </div>
            <button
              onClick={handleManualRefresh}
              className="px-3 py-1 rounded bg-rose-500 text-white font-medium hover:bg-rose-600 transition-colors shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {/* 1. Founder Dashboard */}
          {currentView === 'dashboard' && (
            <DashboardView
              shops={shops}
              profiles={profiles}
              staff={staff}
              customers={customers}
              bills={bills}
              payments={payments}
              appointments={appointments}
              deletions={deletions}
              supportMessages={supportMessages}
              subscriptions={subscriptions}
              loading={loading}
              initialTab="overview"
              onNavigate={(v) => setCurrentView(v)}
              onSelectSalon={handleSelectSalonDrilldown}
              onNavigateToStylists={handleNavigateToStylists}
              onOpenPrivacyPolicy={openPrivacyPage}
              onOpenDeleteAccount={openDeleteAccountPage}
            />
          )}

          {/* 1a. Product Analytics */}
          {currentView === 'product_analytics' && (
            <ProductAnalyticsView
              shops={shops}
              bills={bills}
              appointments={appointments}
              staff={staff}
              customers={customers}
              telemetryRecords={telemetryRecords}
              loading={loading}
              onNavigate={(v) => setCurrentView(v)}
            />
          )}

          {/* 1b. Daily User Metrics */}
          {currentView === 'daily_user_metrics' && (
            <DailyUserMetricsView
              shops={shops}
              profiles={profiles}
              staff={staff}
              customers={customers}
              bills={bills}
              appointments={appointments}
              subscriptions={subscriptions}
              payments={payments}
              loading={loading}
              onSelectSalon={handleSelectSalonDrilldown}
            />
          )}

          {/* 1c. Dedicated Daily Order / Bills Metrics View */}
          {currentView === 'daily_bills' && (
            <DailyBillsView
              bills={bills}
              shops={shops}
              payments={payments}
              loading={loading}
              onSelectSalon={handleSelectSalonDrilldown}
            />
          )}

          {/* 1d. Dedicated Subscription Revenue View */}
          {currentView === 'revenue_trend' && (
            <SubscriptionRevenueView
              payments={payments}
              bills={bills}
              shops={shops}
              loading={loading}
              onSelectSalon={handleSelectSalonDrilldown}
            />
          )}

          {/* 1e. Dedicated Overview View */}
          {currentView === 'overview' && (
            <OverviewView
              shops={shops}
              profiles={profiles}
              staff={staff}
              customers={customers}
              bills={bills}
              payments={payments}
              appointments={appointments}
              deletions={deletions}
              supportMessages={supportMessages}
              subscriptions={subscriptions}
              loading={loading}
              onNavigate={(v) => setCurrentView(v)}
              onSelectSalon={handleSelectSalonDrilldown}
            />
          )}

          {/* 1f. Dedicated 100 Free Sales Quota & Subscription Plans Hub */}
          {currentView === 'subscription_plans' && (
            <SubscriptionPlansView
              shops={shops}
              bills={bills}
              payments={payments}
              loading={loading}
              onSelectSalon={handleSelectSalonDrilldown}
            />
          )}

          {/* 2. Salons & 360 Ecosystem */}
          {(currentView === 'salons_360' || currentView === 'user_details') && (
            <SalonsCombinedView
              shops={shops}
              profiles={profiles}
              staff={staff}
              customers={customers}
              bills={bills}
              payments={payments}
              appointments={appointments}
              deletions={deletions}
              supportMessages={supportMessages}
              loading={loading}
              selectedShop={selectedShopForModal}
              onClearSelectedShop={() => setSelectedShopForModal(null)}
              onRefresh={handleManualRefresh}
              initialTab={currentView === 'user_details' ? 'ecosystem_360' : salonsTab}
              initialModalTab={salonModalInitialTab}
            />
          )}

          {/* 2b. Customer Tracking View */}
          {currentView === 'customer_tracking' && (
            <CustomerTrackingView
              customers={customers}
              shops={shops}
              bills={bills}
              loading={loading}
              onSelectSalon={handleSelectSalonDrilldown}
            />
          )}

          {/* 2c. Incomplete Signups Drop-off Recovery */}
          {currentView === 'incomplete_signups' && (
            <IncompleteSignupsView
              shops={shops}
              loading={loading}
              onSelectSalon={handleSelectSalonDrilldown}
            />
          )}

          {/* 3. Staff Access Control */}
          {currentView === 'staff_access' && (
            <StylistsView
              staff={staff}
              shops={shops}
              loading={loading}
              onRefresh={handleManualRefresh}
              onSelectSalon={handleSelectSalonDrilldown}
            />
          )}

          {/* 4. Payment History (Purchases & Transactions) */}
          {currentView === 'purchases' && (
            <PurchasesView
              payments={payments}
              shops={shops}
              loading={loading}
            />
          )}

          {/* 5. Reports & BI */}
          {currentView === 'reports_bi' && (
            <ReportsView
              shops={shops}
              profiles={profiles}
              bills={bills}
              appointments={appointments}
              deletions={deletions}
            />
          )}

          {/* 6. Support Messages */}
          {currentView === 'support_messages' && (
            <SupportMessagesView
              messages={supportMessages}
              loading={loading}
              onRefresh={handleManualRefresh}
            />
          )}

          {/* 7. App Telemetry */}
          {currentView === 'app_telemetry' && (
            <AppTelemetryCombinedView
              records={telemetryRecords}
              shops={shops}
              loading={loading}
              onRefresh={handleManualRefresh}
            />
          )}

          {/* 8. Activity Logs & Platform Audit */}
          {currentView === 'platform_audit' && (
            <AuditTrailView
              payments={payments}
              bills={bills}
              appointments={appointments}
              deletions={deletions}
              shops={shops}
              loading={loading}
            />
          )}

          {/* 9. Shop Health & Diagnostic Logs */}
          {(currentView === 'system_health' || currentView === 'diagnostic_logs') && (
            <SystemHealthView
              healthRecords={systemHealthRecords}
              logs={systemLogs}
              shops={shops}
              bills={bills}
              loading={loading}
              onRefresh={handleManualRefresh}
              onSelectSalon={handleSelectSalonDrilldown}
            />
          )}

          {/* 10. Account Deletions */}
          {currentView === 'account_deletions' && (
            <AccountDeletionsView
              deletions={deletions}
              loading={loading}
              onOpenDeleteAccountInstructions={openDeleteAccountPage}
            />
          )}

          {/* 11. CRM Added Users */}
          {currentView === 'crm_added_users' && (
            <CrmAddedUsersView
              customers={customers}
              shops={shops}
              bills={bills}
              loading={loading}
              onSelectSalon={handleSelectSalonDrilldown}
            />
          )}
        </main>
      </div>

      {/* Reset Account Password Modal (Admin Panel Only) */}
      <ResetPasswordModal
        isOpen={isResetPasswordOpen}
        onClose={() => {
          setIsResetPasswordOpen(false);
          setShopForPasswordReset(null);
        }}
      />
    </div>
  );
};

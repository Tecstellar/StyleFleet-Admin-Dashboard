import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/views/DashboardView';
import { SalonsCombinedView } from './components/views/SalonsCombinedView';
import { ReportsView } from './components/views/ReportsView';
import { SupportMessagesView } from './components/views/SupportMessagesView';
import { AppTelemetryCombinedView } from './components/views/AppTelemetryCombinedView';
import { AuditTrailView } from './components/views/AuditTrailView';
import { SystemHealthView } from './components/views/SystemHealthView';
import { AccountDeletionsView } from './components/views/AccountDeletionsView';
import { SystemGovernanceCombinedView } from './components/views/SystemGovernanceCombinedView';

import { fetchShops } from './services/salonsService';
import { fetchProfiles, fetchStaff, fetchCustomers } from './services/usersService';
import { fetchBills, fetchPayments } from './services/billingService';
import { fetchAppointments } from './services/appointmentsService';
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

export const App: React.FC = () => {
  // Navigation State — matches 9 options from reference dashboard
  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [selectedShopForModal, setSelectedShopForModal] = useState<Shop | null>(null);

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
    loadAllData();
  }, [loadAllData]);

  // Realtime Subscriptions
  useEffect(() => {
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
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadAllData();
  };

  const handleSelectSalonDrilldown = (shop: Shop) => {
    setSelectedShopForModal(shop);
    setCurrentView('salons_360');
  };

  return (
    <div className="flex min-h-screen bg-[#161826] light:bg-[#F4F5F9] text-white light:text-slate-900 transition-colors">
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
        salonsCount={shops.length}
        deletionsCount={deletions.length}
        supportCount={supportMessages.filter((m) => m.status === 'open').length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Bar */}
        <Header
          onToggleMobileNav={() => setIsMobileNavOpen(true)}
          onSelectView={(v) => setCurrentView(v)}
          onRefreshData={handleManualRefresh}
          isRefreshing={isRefreshing}
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
          {/* 1. Dashboard */}
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
              loading={loading}
              onNavigate={(v) => setCurrentView(v)}
              onSelectSalon={handleSelectSalonDrilldown}
            />
          )}

          {/* 2. Salons & 360° */}
          {currentView === 'salons_360' && (
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
            />
          )}

          {/* 3. Reports & BI */}
          {currentView === 'reports_bi' && (
            <ReportsView
              shops={shops}
              profiles={profiles}
              bills={bills}
              appointments={appointments}
              deletions={deletions}
            />
          )}

          {/* 4. Support Messages */}
          {currentView === 'support_messages' && (
            <SupportMessagesView
              messages={supportMessages}
              loading={loading}
              onRefresh={handleManualRefresh}
            />
          )}

          {/* 5. App Version & Telemetry */}
          {currentView === 'app_telemetry' && (
            <AppTelemetryCombinedView
              records={telemetryRecords}
              shops={shops}
              loading={loading}
              onRefresh={handleManualRefresh}
            />
          )}

          {/* 6. Platform Audit Trail */}
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

          {/* 7. System Health Alerts */}
          {currentView === 'system_health' && (
            <SystemHealthView
              healthRecords={systemHealthRecords}
              logs={systemLogs}
              shops={shops}
              loading={loading}
              onRefresh={handleManualRefresh}
            />
          )}

          {/* 8. Account Deletions */}
          {currentView === 'account_deletions' && (
            <AccountDeletionsView deletions={deletions} loading={loading} />
          )}

          {/* 9. System Governance */}
          {currentView === 'system_governance' && <SystemGovernanceCombinedView />}
        </main>
      </div>
    </div>
  );
};

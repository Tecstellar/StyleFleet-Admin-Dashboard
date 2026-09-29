import React, { useEffect, useState } from 'react';
import {
  Store,
  User,
  Phone,
  MapPin,
  Calendar,
  Users,
  Scissors,
  CreditCard,
  Settings as SettingsIcon,
  MessageSquare,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import { UnavailableBanner } from '../common/UnavailableBanner';
import { fetchSalonDetails, SalonDetailedView } from '../../services/salonsService';
import { Shop } from '../../types/database';
import { formatDateTime, formatDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/formatters';

interface SalonDetailModalProps {
  shop: Shop | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SalonDetailModal: React.FC<SalonDetailModalProps> = ({ shop, isOpen, onClose }) => {
  const [details, setDetails] = useState<SalonDetailedView | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'services' | 'billing' | 'settings' | 'telemetry'>('overview');

  useEffect(() => {
    if (!shop || !isOpen) return;

    let isMounted = true;
    setLoading(true);

    fetchSalonDetails(shop.id).then(({ data }) => {
      if (isMounted) {
        setDetails(data);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [shop, isOpen]);

  if (!shop) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={shop.name}
      subtitle={`Salon ID: ${shop.id}`}
      maxWidth="4xl"
    >
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#E5E7EB] pb-3 mb-5 overflow-x-auto text-xs">
        {[
          { id: 'overview', label: 'Overview', icon: Store },
          { id: 'staff', label: `Staff (${details?.staff.length || 0})`, icon: Users },
          { id: 'services', label: `Services (${details?.services.length || 0})`, icon: Scissors },
          { id: 'billing', label: `Billing & Payments (${details?.bills.length || 0})`, icon: CreditCard },
          { id: 'settings', label: 'Shop Settings', icon: SettingsIcon },
          { id: 'telemetry', label: 'App / Platform Telemetry', icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                isActive
                  ? 'bg-[#111827] text-white font-semibold shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-[#FAF7EE]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-neutral-500 animate-pulse">
          Loading relational data from Supabase...
        </div>
      ) : (
        <div className="space-y-5">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Salon Information Card */}
                <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white space-y-3 shadow-xs">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Salon Information
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Salon Name:</span>
                      <span className="font-semibold text-neutral-900">{shop.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Contact Phone:</span>
                      <span className="font-mono text-neutral-900">{shop.phone || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Address:</span>
                      <span className="text-neutral-900 text-right max-w-xs">{shop.address || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">City / Pincode:</span>
                      <span className="text-neutral-900">
                        {shop.city || '—'} {shop.pin_code ? `(${shop.pin_code})` : ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">GSTIN:</span>
                      <span className="font-mono text-neutral-900">{shop.gstin || 'Unregistered'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Default Tax Rate:</span>
                      <span className="font-mono text-neutral-900">{shop.gst_rate}%</span>
                    </div>
                  </div>
                </div>

                {/* Owner Information Card */}
                <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white space-y-3 shadow-xs">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Owner Profile &amp; Account
                  </h4>
                  {shop.owner_profile ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Owner Profile ID:</span>
                        <span className="font-mono text-[11px] text-[#B8860B] truncate max-w-[180px]">
                          {shop.owner_profile.id}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Full Name:</span>
                        <span className="font-semibold text-neutral-900">
                          {shop.owner_profile.full_name || 'Not set'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Registered Phone:</span>
                        <span className="font-mono text-neutral-900">
                          {shop.owner_profile.phone || '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">User Created At:</span>
                        <span className="text-neutral-900">
                          {formatDateTime(shop.owner_profile.created_at)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                      No linked owner profile (owner_profile_id is NULL). This salon may be an unassigned or test record.
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#F0F0F0] space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Registered On:</span>
                      <span className="text-neutral-900">{formatDateTime(shop.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Theme Accent:</span>
                      <span className="flex items-center gap-1.5 font-mono text-xs text-neutral-900">
                        <span
                          className="w-3 h-3 rounded-full border border-neutral-300"
                          style={{ backgroundColor: shop.accent_color || '#D4AF37' }}
                        />
                        {shop.accent_color || '#D4AF37'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Linked Deletions or Support Messages if any */}
              {details?.deletions && details.deletions.length > 0 && (
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 space-y-2">
                  <div className="flex items-center gap-2 text-rose-700 font-semibold text-xs">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Account Deletion Record Detected</span>
                  </div>
                  <p className="text-xs text-neutral-700">
                    A deletion request was processed for this salon on{' '}
                    {formatDateTime(details.deletions[0].deleted_at)}. Reason:{' '}
                    <span className="italic">"{details.deletions[0].reason}"</span>.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STAFF */}
          {activeTab === 'staff' && (
            <div className="space-y-3">
              {details?.staff && details.staff.length > 0 ? (
                <div className="divide-y divide-[#E5E7EB] border border-[#E5E7EB] rounded-xl overflow-hidden shadow-xs">
                  {details.staff.map((st) => (
                    <div key={st.id} className="p-3.5 flex items-center justify-between text-xs bg-white">
                      <div>
                        <div className="font-semibold text-neutral-900">{st.name}</div>
                        <div className="text-[11px] text-neutral-500">
                          Role: {st.role} • Phone: {st.phone || 'No phone'}
                        </div>
                      </div>
                      <StatusBadge status={st.is_active ? 'active' : 'inactive'} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-neutral-500 border border-dashed border-[#E5E7EB] rounded-xl bg-white">
                  No staff members registered for this salon in <code className="text-[#B8860B]">public.staff</code>.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SERVICES */}
          {activeTab === 'services' && (
            <div className="space-y-3">
              {details?.services && details.services.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto">
                  {details.services.map((svc) => (
                    <div
                      key={svc.id}
                      className="p-3 rounded-lg border border-[#E5E7EB] bg-white shadow-xs flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-medium text-neutral-900">{svc.name}</div>
                        <div className="text-[11px] text-neutral-500">{svc.duration_minutes} mins</div>
                      </div>
                      <div className="font-mono font-semibold text-[#B8860B]">
                        {formatCurrency(svc.price_minor)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-neutral-500 border border-dashed border-[#E5E7EB] rounded-xl bg-white">
                  No catalog services configured for this salon.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BILLING & PAYMENTS */}
          {activeTab === 'billing' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl border border-[#E5E7EB] bg-white shadow-xs text-xs">
                  <span className="text-neutral-500">Invoices Generated:</span>
                  <div className="text-lg font-bold font-mono text-neutral-900 mt-1">
                    {details?.bills.length || 0}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-[#E5E7EB] bg-white shadow-xs text-xs">
                  <span className="text-neutral-500">Payments Completed:</span>
                  <div className="text-lg font-bold font-mono text-emerald-600 mt-1">
                    {details?.payments.length || 0}
                  </div>
                </div>
              </div>

              {details?.bills && details.bills.length > 0 ? (
                <div className="space-y-2">
                  <h5 className="text-xs font-semibold text-neutral-500 uppercase">Invoices</h5>
                  <div className="divide-y divide-[#E5E7EB] border border-[#E5E7EB] rounded-xl overflow-hidden text-xs shadow-xs">
                    {details.bills.map((b) => (
                      <div key={b.id} className="p-3 flex items-center justify-between bg-white">
                        <div>
                          <div className="font-mono font-semibold text-neutral-900">{b.invoice_number}</div>
                          <div className="text-[11px] text-neutral-500">{formatDateTime(b.issued_at)}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-semibold text-neutral-900">
                            {formatCurrency(b.total_minor)}
                          </div>
                          <StatusBadge status={b.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-neutral-500 border border-dashed border-[#E5E7EB] rounded-xl bg-white">
                  No invoices generated yet for this salon.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-3">
              {details?.settings ? (
                <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-xs space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Appointment Reminders:</span>
                    <span className="font-semibold text-neutral-900">
                      {details.settings.appointment_reminder_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Reminder Lead Time:</span>
                    <span className="font-mono text-neutral-900">
                      {details.settings.appointment_reminder_minutes} minutes
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Daily Closing Auto-Report:</span>
                    <span className="font-semibold text-neutral-900">
                      {details.settings.daily_closing_enabled ? `Enabled (${details.settings.daily_closing_time})` : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Payment Followup:</span>
                    <span className="font-semibold text-neutral-900">
                      {details.settings.payment_followup_enabled ? `Every ${details.settings.payment_followup_interval_days} days` : 'Disabled'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-neutral-500 border border-dashed border-[#E5E7EB] rounded-xl bg-white">
                  No automated settings row configured in <code className="text-[#B8860B]">public.shop_settings</code>.
                </div>
              )}
            </div>
          )}

          {/* TAB 6: TELEMETRY (Rule 1: Honest unavailable state) */}
          {activeTab === 'telemetry' && (
            <div className="space-y-4">
              <UnavailableBanner
                title="Device & App Telemetry Unavailable"
                sourceTable="public.telemetry"
                message="Client device telemetry and app installation tracking are not recorded in the connected Supabase database for this salon."
                details="To see device models, OS versions, and app builds, the mobile application must insert events into public.telemetry."
              />
              <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-xs text-xs space-y-2 text-neutral-700">
                <div className="font-semibold text-neutral-900">Expected Telemetry Fields:</div>
                <ul className="list-disc list-inside space-y-1 text-neutral-500 font-mono text-[11px]">
                  <li>device_id: UUID / Hardware string</li>
                  <li>platform: 'android' | 'ios'</li>
                  <li>app_version: e.g. '1.0.0'</li>
                  <li>build_number: integer</li>
                  <li>last_active: timestamptz</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

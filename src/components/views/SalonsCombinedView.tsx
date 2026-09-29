import React, { useState } from 'react';
import { Store, Scissors, Compass } from 'lucide-react';
import { SalonsView } from './SalonsView';
import { StylistsView } from './StylistsView';
import { Ecosystem360View } from './Ecosystem360View';
import { Shop, Profile, Staff, Customer, Bill, Payment, Appointment, AccountDeletion, SupportMessage } from '../../types/database';

interface SalonsCombinedViewProps {
  shops: Shop[];
  profiles: Profile[];
  staff: Staff[];
  customers: Customer[];
  bills: Bill[];
  payments: Payment[];
  appointments: Appointment[];
  deletions: AccountDeletion[];
  supportMessages: SupportMessage[];
  loading?: boolean;
  selectedShop?: Shop | null;
  onClearSelectedShop?: () => void;
  onRefresh?: () => void;
  initialTab?: 'directory' | 'stylists' | 'ecosystem_360';
}

export const SalonsCombinedView: React.FC<SalonsCombinedViewProps> = ({
  shops,
  profiles,
  staff,
  customers,
  bills,
  payments,
  appointments,
  deletions,
  supportMessages,
  loading = false,
  selectedShop,
  onClearSelectedShop,
  onRefresh,
  initialTab = 'directory',
}) => {
  const [activeTab, setActiveTab] = useState<'directory' | 'stylists' | 'ecosystem_360'>(initialTab);
  const [modalShop, setModalShop] = useState<Shop | null>(null);

  const handleSelectSalonFromStylists = (shop: Shop) => {
    setModalShop(shop);
    setActiveTab('directory');
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E7EB] pb-3 text-xs">
        <button
          onClick={() => setActiveTab('directory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
            activeTab === 'directory'
              ? 'bg-[#111827] text-white shadow-xs font-bold border border-[#111827]'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-[#FAF7EE]'
          }`}
        >
          <Store className="w-4 h-4 text-[#D4AF37]" />
          <span>Salons Directory ({shops.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('stylists')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
            activeTab === 'stylists'
              ? 'bg-[#111827] text-white shadow-xs font-bold border border-[#111827]'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-[#FAF7EE]'
          }`}
        >
          <Scissors className="w-4 h-4 text-[#D4AF37]" />
          <span>Stylists & Access ({staff.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ecosystem_360')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
            activeTab === 'ecosystem_360'
              ? 'bg-[#111827] text-white shadow-xs font-bold border border-[#111827]'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-[#FAF7EE]'
          }`}
        >
          <Compass className="w-4 h-4 text-[#D4AF37]" />
          <span>360° Ecosystem Lineage</span>
        </button>
      </div>

      {activeTab === 'directory' && (
        <SalonsView
          shops={shops}
          loading={loading}
          selectedShop={selectedShop || modalShop}
          onClearSelectedShop={() => {
            setModalShop(null);
            onClearSelectedShop?.();
          }}
        />
      )}

      {activeTab === 'stylists' && (
        <StylistsView
          staff={staff}
          shops={shops}
          loading={loading}
          onRefresh={onRefresh}
          onSelectSalon={handleSelectSalonFromStylists}
        />
      )}

      {activeTab === 'ecosystem_360' && (
        <Ecosystem360View
          shops={shops}
          profiles={profiles}
          staff={staff}
          customers={customers}
          bills={bills}
          payments={payments}
          appointments={appointments}
          deletions={deletions}
          supportMessages={supportMessages}
        />
      )}
    </div>
  );
};

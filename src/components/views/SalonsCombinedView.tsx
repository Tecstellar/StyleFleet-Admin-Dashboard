import React, { useState } from 'react';
import { Store, Compass } from 'lucide-react';
import { SalonsView } from './SalonsView';
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
}) => {
  const [activeTab, setActiveTab] = useState<'directory' | 'ecosystem_360'>('directory');

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b-2 border-[#D4AF37]/30 pb-3 text-xs">
        <button
          onClick={() => setActiveTab('directory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
            activeTab === 'directory'
              ? 'bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#161826] shadow-sm font-bold border border-[#D4AF37]'
              : 'text-neutral-400 hover:text-white light:text-slate-600 light:hover:text-[#161826] hover:bg-[#1E2136] light:hover:bg-[#FCF9EE]'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Salons Directory ({shops.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ecosystem_360')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
            activeTab === 'ecosystem_360'
              ? 'bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#161826] shadow-sm font-bold border border-[#D4AF37]'
              : 'text-neutral-400 hover:text-white light:text-slate-600 light:hover:text-[#161826] hover:bg-[#1E2136] light:hover:bg-[#FCF9EE]'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>360° Ecosystem Lineage</span>
        </button>
      </div>

      {activeTab === 'directory' ? (
        <SalonsView
          shops={shops}
          loading={loading}
          selectedShop={selectedShop}
          onClearSelectedShop={onClearSelectedShop}
        />
      ) : (
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

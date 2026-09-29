import React, { useState } from 'react';
import { Sliders, Database, ShieldCheck, Settings as SettingsIcon, AlertTriangle } from 'lucide-react';
import { GovernanceView } from './GovernanceView';
import { SettingsView } from './SettingsView';

export const SystemGovernanceCombinedView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'governance' | 'settings'>('governance');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-3 text-xs">
        <button
          onClick={() => setActiveTab('governance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
            activeTab === 'governance'
              ? 'bg-[#111827] text-white shadow-xs font-bold border border-[#111827]'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-[#FAF7EE]'
          }`}
        >
          <Sliders className="w-4 h-4 text-[#D4AF37]" />
          <span>Data Quality &amp; Schema Governance</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
            activeTab === 'settings'
              ? 'bg-[#111827] text-white shadow-xs font-bold border border-[#111827]'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-[#FAF7EE]'
          }`}
        >
          <SettingsIcon className="w-4 h-4 text-[#D4AF37]" />
          <span>Connection &amp; Brand Settings</span>
        </button>
      </div>

      {activeTab === 'governance' ? <GovernanceView /> : <SettingsView />}
    </div>
  );
};

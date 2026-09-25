import React, { useState } from 'react';
import { Sliders, Database, ShieldCheck, Settings as SettingsIcon, AlertTriangle } from 'lucide-react';
import { GovernanceView } from './GovernanceView';
import { SettingsView } from './SettingsView';

export const SystemGovernanceCombinedView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'governance' | 'settings'>('governance');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b-2 border-[#D4AF37]/30 pb-3 text-xs">
        <button
          onClick={() => setActiveTab('governance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
            activeTab === 'governance'
              ? 'bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#161826] shadow-sm font-bold border border-[#D4AF37]'
              : 'text-neutral-400 hover:text-white light:text-slate-600 light:hover:text-[#161826] hover:bg-[#1E2136] light:hover:bg-[#FCF9EE]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Data Quality &amp; Schema Governance</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
            activeTab === 'settings'
              ? 'bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#161826] shadow-sm font-bold border border-[#D4AF37]'
              : 'text-neutral-400 hover:text-white light:text-slate-600 light:hover:text-[#161826] hover:bg-[#1E2136] light:hover:bg-[#FCF9EE]'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          <span>Connection &amp; Brand Settings</span>
        </button>
      </div>

      {activeTab === 'governance' ? <GovernanceView /> : <SettingsView />}
    </div>
  );
};

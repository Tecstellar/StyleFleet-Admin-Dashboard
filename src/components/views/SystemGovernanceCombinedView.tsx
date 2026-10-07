import React, { useState } from 'react';
import { Sliders, Settings as SettingsIcon } from 'lucide-react';
import { GovernanceView } from './GovernanceView';
import { SettingsView } from './SettingsView';

export const SystemGovernanceCombinedView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'governance' | 'settings'>('governance');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-neutral-200 pb-3 text-xs">
        <button
          onClick={() => setActiveTab('governance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
            activeTab === 'governance'
              ? 'bg-black text-white shadow-xs border border-black'
              : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
          }`}
        >
          <Sliders className={`w-4 h-4 ${activeTab === 'governance' ? 'text-white' : 'text-neutral-600'}`} />
          <span>Data Quality &amp; Schema Governance</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
            activeTab === 'settings'
              ? 'bg-black text-white shadow-xs border border-black'
              : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
          }`}
        >
          <SettingsIcon className={`w-4 h-4 ${activeTab === 'settings' ? 'text-white' : 'text-neutral-600'}`} />
          <span>Connection &amp; Brand Settings</span>
        </button>
      </div>

      {activeTab === 'governance' ? <GovernanceView /> : <SettingsView />}
    </div>
  );
};

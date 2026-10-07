import React, { useState } from 'react';
import { Settings as SettingsIcon, Database, Palette, Check, Copy } from 'lucide-react';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../../services/supabase';
import { useTheme } from '../../context/ThemeContext';

export const SettingsView: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [copiedKey, setCopiedKey] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-neutral-900" />
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Administrative &amp; Connection Settings
          </h1>
        </div>
        <p className="text-xs text-neutral-500 mt-0.5">
          Configuration parameters for StyleFleet Admin Dashboard and Supabase backend.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Supabase Connection */}
        <div className="p-6 rounded-2xl border border-neutral-200 bg-white space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-neutral-900" />
            <h3 className="text-sm font-semibold text-neutral-900">
              Supabase Project Connection
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-neutral-500 block mb-1">Project Endpoint URL</label>
              <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200 font-mono text-neutral-800 truncate">
                {SUPABASE_URL}
              </div>
            </div>

            <div>
              <label className="text-neutral-500 block mb-1">Publishable / Anon Key</label>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-neutral-50 border border-neutral-200">
                <span className="font-mono text-[11px] text-neutral-700 truncate flex-1">
                  {SUPABASE_PUBLISHABLE_KEY.slice(0, 16)}••••••••••••••••••••••••••••••••••••••••••••
                </span>
                <button
                  onClick={() => copyToClipboard(SUPABASE_PUBLISHABLE_KEY)}
                  className="p-1.5 rounded hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
                  title="Copy full key"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-800 text-[11px]">
              Connected using public publishable credential. Service-role master key is strictly prohibited on client side per Rule 3.
            </div>
          </div>
        </div>

        {/* Theme & Design Tokens */}
        <div className="p-6 rounded-2xl border border-neutral-200 bg-white space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-neutral-900" />
            <h3 className="text-sm font-semibold text-neutral-900">
              StyleFleet Brand Tokens &amp; Theme
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1">
              <span className="text-neutral-500">Primary Workspace Canvas:</span>
              <span className="flex items-center gap-1.5 font-mono text-neutral-900 font-semibold">
                <span className="w-3.5 h-3.5 rounded bg-neutral-50 border border-neutral-300" />
                #F8F9FA
              </span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-neutral-500">Accent Black:</span>
              <span className="flex items-center gap-1.5 font-mono text-neutral-900 font-semibold">
                <span className="w-3.5 h-3.5 rounded bg-black border border-black" />
                #000000 / #111827
              </span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-neutral-500">Surface Card Background:</span>
              <span className="flex items-center gap-1.5 font-mono text-neutral-900">
                <span className="w-3.5 h-3.5 rounded bg-white border border-neutral-300" />
                #FFFFFF
              </span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-neutral-500">Line &amp; Border Standard:</span>
              <span className="flex items-center gap-1.5 font-mono text-neutral-900 font-semibold">
                <span className="w-3.5 h-3.5 rounded bg-neutral-200 border border-neutral-300" />
                #E5E7EB
              </span>
            </div>

            <div className="pt-2 border-t border-neutral-200 flex items-center justify-between">
              <span className="text-neutral-500">Active Palette Mode:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTheme('light')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-black text-white shadow-xs"
                >
                  Pure Black &amp; White CRM
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Settings as SettingsIcon, Database, Shield, Palette, Key, Check, Copy } from 'lucide-react';
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
          <SettingsIcon className="w-5 h-5 text-[#D9A441]" />
          <h1 className="text-xl font-bold tracking-tight text-white light:text-slate-900">
            Administrative &amp; Connection Settings
          </h1>
        </div>
        <p className="text-xs text-neutral-400 light:text-slate-500 mt-0.5">
          Configuration parameters for StyleFleet Admin Dashboard and Supabase backend.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Supabase Connection */}
        <div className="p-6 rounded-2xl border border-[#2D3154] light:border-slate-200 bg-[#1E2136] light:bg-white space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#D9A441]" />
            <h3 className="text-sm font-semibold text-white light:text-slate-900">
              Supabase Project Connection
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-neutral-400 block mb-1">Project Endpoint URL</label>
              <div className="p-2.5 rounded-lg bg-[#161826] border border-[#2D3154] font-mono text-neutral-200 truncate">
                {SUPABASE_URL}
              </div>
            </div>

            <div>
              <label className="text-neutral-400 block mb-1">Publishable / Anon Key</label>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#161826] border border-[#2D3154]">
                <span className="font-mono text-[11px] text-neutral-300 truncate flex-1">
                  {SUPABASE_PUBLISHABLE_KEY.slice(0, 16)}••••••••••••••••••••••••••••••••••••••••••••
                </span>
                <button
                  onClick={() => copyToClipboard(SUPABASE_PUBLISHABLE_KEY)}
                  className="p-1.5 rounded hover:bg-[#2D3154] text-neutral-400 hover:text-white transition-colors"
                  title="Copy full key"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px]">
              Connected using public publishable credential. Service-role master key is strictly prohibited on client side per Rule 3.
            </div>
          </div>
        </div>

        {/* Theme & Design Tokens */}
        <div className="p-6 rounded-2xl border border-[#2D3154] light:border-slate-200 bg-[#1E2136] light:bg-white space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#D9A441]" />
            <h3 className="text-sm font-semibold text-white light:text-slate-900">
              StyleFleet Brand Tokens &amp; Theme
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1">
              <span className="text-neutral-400">Primary Brand Background:</span>
              <span className="flex items-center gap-1.5 font-mono text-white light:text-slate-900 font-semibold">
                <span className="w-3.5 h-3.5 rounded bg-[#161826] border border-white/20" />
                #161826
              </span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-neutral-400">Accent Gold Token:</span>
              <span className="flex items-center gap-1.5 font-mono text-[#D9A441] font-semibold">
                <span className="w-3.5 h-3.5 rounded bg-[#D9A441] border border-white/20" />
                #D9A441
              </span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-neutral-400">Interface Surface:</span>
              <span className="flex items-center gap-1.5 font-mono text-white light:text-slate-900">
                <span className="w-3.5 h-3.5 rounded bg-[#1E2136] border border-white/20" />
                #1E2136
              </span>
            </div>

            <div className="pt-2 border-t border-[#2D3154] flex items-center justify-between">
              <span className="text-neutral-400">Active Theme:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTheme('dark')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    theme === 'dark'
                      ? 'bg-[#D9A441] text-[#161826]'
                      : 'bg-[#161826] text-neutral-400 border border-[#2D3154]'
                  }`}
                >
                  Dark Mode (#161826)
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    theme === 'light'
                      ? 'bg-[#D9A441] text-[#161826]'
                      : 'bg-[#161826] text-neutral-400 border border-[#2D3154]'
                  }`}
                >
                  Light Mode
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

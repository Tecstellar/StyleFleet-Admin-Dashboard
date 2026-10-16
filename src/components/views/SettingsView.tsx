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
          <SettingsIcon className="w-5 h-5 text-[#014BAA]" />
          <h1 className="text-xl font-bold tracking-tight text-black">
            Administrative &amp; Connection Settings
          </h1>
        </div>
        <p className="text-xs text-black/70 mt-0.5">
          Configuration parameters for StyleFleet Admin Dashboard and Supabase backend.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Supabase Connection */}
        <div className="p-6 rounded-2xl border border-[#014BAA]/20 bg-[#F8F3F0] space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#014BAA]" />
            <h3 className="text-sm font-semibold text-black">
              Supabase Project Connection
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-black/70 block mb-1">Project Endpoint URL</label>
              <div className="p-2.5 rounded-lg bg-[#014BAA]/5 border border-[#014BAA]/20 font-mono text-black truncate">
                {SUPABASE_URL}
              </div>
            </div>

            <div>
              <label className="text-black/70 block mb-1">Publishable / Anon Key</label>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#014BAA]/5 border border-[#014BAA]/20">
                <span className="font-mono text-[11px] text-black/80 truncate flex-1">
                  {SUPABASE_PUBLISHABLE_KEY.slice(0, 16)}••••••••••••••••••••••••••••••••••••••••••••
                </span>
                <button
                  onClick={() => copyToClipboard(SUPABASE_PUBLISHABLE_KEY)}
                  className="p-1.5 rounded hover:bg-[#014BAA]/10 text-black/60 hover:text-black transition-colors cursor-pointer"
                  title="Copy full key"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-[#014BAA]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#014BAA]/10 border border-[#014BAA]/20 text-black text-[11px]">
              Connected using public publishable credential. Service-role master key is strictly prohibited on client side per Rule 3.
            </div>
          </div>
        </div>

        {/* Theme & Design Tokens */}
        <div className="p-6 rounded-2xl border border-[#014BAA]/20 bg-[#F8F3F0] space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#014BAA]" />
            <h3 className="text-sm font-semibold text-black">
              StyleFleet Brand Tokens &amp; Theme
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1">
              <span className="text-black/70">Primary Royal Blue:</span>
              <span className="flex items-center gap-1.5 font-mono text-black font-semibold">
                <span className="w-3.5 h-3.5 rounded bg-[#014BAA] border border-[#014BAA]" />
                #014BAA
              </span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-black/70">Canvas &amp; Surface Cream:</span>
              <span className="flex items-center gap-1.5 font-mono text-black font-semibold">
                <span className="w-3.5 h-3.5 rounded bg-[#F8F3F0] border border-[#014BAA]/30" />
                #F8F3F0
              </span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-black/70">Typography (High Contrast):</span>
              <span className="flex items-center gap-1.5 font-mono text-black font-semibold">
                <span className="w-3.5 h-3.5 rounded bg-black border border-black" />
                #000000
              </span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-black/70">Restrained Border Tone:</span>
              <span className="flex items-center gap-1.5 font-mono text-black font-semibold">
                <span className="w-3.5 h-3.5 rounded bg-[#014BAA]/20 border border-[#014BAA]/30" />
                #014BAA/20
              </span>
            </div>

            <div className="pt-2 border-t border-[#014BAA]/15 flex items-center justify-between">
              <span className="text-black/70">Active Palette Mode:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTheme('light')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#014BAA] text-white shadow-xs"
                >
                  Royal Blue &amp; Light Cream
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Activity, Database, Terminal, Code, Cpu } from 'lucide-react';
import { UnavailableBanner } from '../common/UnavailableBanner';

export const TelemetryView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#D9A441]" />
          <h1 className="text-xl font-bold tracking-tight text-white light:text-slate-900">
            Telemetry Monitoring
          </h1>
        </div>
        <p className="text-xs text-neutral-400 light:text-slate-500 mt-0.5">
          Real-time device hardware, heartbeat, and crash telemetry tracking.
        </p>
      </div>

      <UnavailableBanner
        title="Data unavailable — required source field/table not found."
        sourceTable="public.telemetry"
        message="The connected Supabase database currently contains no 'telemetry' table. In accordance with Rule 1, no mock devices or synthetic ping telemetry will be displayed."
        details="Table 'public.telemetry' returned status 404 (PGRST205: Could not find the table 'public.telemetry' in schema cache)."
      />

      {/* Engineering Blueprint Card */}
      <div className="rounded-2xl border border-[#2D3154] light:border-slate-200 bg-[#1E2136] light:bg-white p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#D9A441]" />
          <h3 className="text-sm font-semibold text-white light:text-slate-900">
            Telemetry Schema Migration Blueprint
          </h3>
        </div>
        <p className="text-xs text-neutral-300 light:text-slate-600 leading-relaxed">
          To enable live telemetry monitoring in this dashboard, execute the following SQL migration in your Supabase SQL editor:
        </p>

        <div className="p-4 rounded-xl bg-[#161826] border border-[#2D3154] text-xs font-mono text-neutral-300 overflow-x-auto space-y-1">
          <div className="text-neutral-500">-- Migration: Create Telemetry Table</div>
          <div><span className="text-[#D9A441]">CREATE TABLE IF NOT EXISTS</span> public.telemetry (</div>
          <div className="pl-4">id <span className="text-blue-400">UUID PRIMARY KEY DEFAULT</span> gen_random_uuid(),</div>
          <div className="pl-4">shop_id <span className="text-blue-400">UUID REFERENCES</span> public.shops(id) <span className="text-blue-400">ON DELETE SET NULL</span>,</div>
          <div className="pl-4">device_id <span className="text-blue-400">TEXT NOT NULL</span>,</div>
          <div className="pl-4">platform <span className="text-blue-400">TEXT NOT NULL</span>, <span className="text-neutral-500">-- 'android' | 'ios'</span></div>
          <div className="pl-4">os_version <span className="text-blue-400">TEXT</span>,</div>
          <div className="pl-4">app_version <span className="text-blue-400">TEXT NOT NULL</span>,</div>
          <div className="pl-4">build_number <span className="text-blue-400">INTEGER</span>,</div>
          <div className="pl-4">event_name <span className="text-blue-400">TEXT NOT NULL</span>,</div>
          <div className="pl-4">metadata <span className="text-blue-400">JSONB DEFAULT</span> <span className="text-emerald-400">'{}'::jsonb</span>,</div>
          <div className="pl-4">created_at <span className="text-blue-400">TIMESTAMPTZ DEFAULT NOW()</span></div>
          <div>);</div>
          <br />
          <div><span className="text-[#D9A441]">ALTER TABLE</span> public.telemetry <span className="text-[#D9A441]">ENABLE ROW LEVEL SECURITY</span>;</div>
          <div><span className="text-[#D9A441]">CREATE POLICY</span> "Allow authenticated/anon insert" <span className="text-[#D9A441]">ON</span> public.telemetry <span className="text-[#D9A441]">FOR INSERT WITH CHECK</span> (true);</div>
          <div><span className="text-[#D9A441]">CREATE POLICY</span> "Allow dashboard select" <span className="text-[#D9A441]">ON</span> public.telemetry <span className="text-[#D9A441]">FOR SELECT USING</span> (true);</div>
        </div>
      </div>
    </div>
  );
};

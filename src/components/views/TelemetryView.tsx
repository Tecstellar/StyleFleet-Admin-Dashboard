import React from 'react';
import { Activity, Database, Terminal, Code, Cpu } from 'lucide-react';
import { UnavailableBanner } from '../common/UnavailableBanner';

export const TelemetryView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#D4AF37]" />
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Telemetry Monitoring
          </h1>
        </div>
        <p className="text-xs text-neutral-500 mt-0.5">
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
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#D4AF37]" />
          <h3 className="text-sm font-semibold text-neutral-900">
            Telemetry Schema Migration Blueprint
          </h3>
        </div>
        <p className="text-xs text-neutral-600 leading-relaxed">
          To enable live telemetry monitoring in this dashboard, execute the following SQL migration in your Supabase SQL editor:
        </p>

        <div className="p-4 rounded-xl bg-[#111827] border border-neutral-800 text-xs font-mono text-neutral-200 overflow-x-auto space-y-1">
          <div className="text-neutral-500">-- Migration: Create Telemetry Table</div>
          <div><span className="text-[#D4AF37]">CREATE TABLE IF NOT EXISTS</span> public.telemetry (</div>
          <div className="pl-4">id <span className="text-amber-200">UUID PRIMARY KEY DEFAULT</span> gen_random_uuid(),</div>
          <div className="pl-4">shop_id <span className="text-amber-200">UUID REFERENCES</span> public.shops(id) <span className="text-amber-200">ON DELETE SET NULL</span>,</div>
          <div className="pl-4">device_id <span className="text-amber-200">TEXT NOT NULL</span>,</div>
          <div className="pl-4">platform <span className="text-amber-200">TEXT NOT NULL</span>, <span className="text-neutral-500">-- 'android' | 'ios'</span></div>
          <div className="pl-4">os_version <span className="text-amber-200">TEXT</span>,</div>
          <div className="pl-4">app_version <span className="text-amber-200">TEXT NOT NULL</span>,</div>
          <div className="pl-4">build_number <span className="text-amber-200">INTEGER</span>,</div>
          <div className="pl-4">event_name <span className="text-amber-200">TEXT NOT NULL</span>,</div>
          <div className="pl-4">metadata <span className="text-amber-200">JSONB DEFAULT</span> <span className="text-emerald-400">'{}'::jsonb</span>,</div>
          <div className="pl-4">created_at <span className="text-amber-200">TIMESTAMPTZ DEFAULT NOW()</span></div>
          <div>);</div>
          <br />
          <div><span className="text-[#D4AF37]">ALTER TABLE</span> public.telemetry <span className="text-[#D4AF37]">ENABLE ROW LEVEL SECURITY</span>;</div>
          <div><span className="text-[#D4AF37]">CREATE POLICY</span> "Allow authenticated/anon insert" <span className="text-[#D4AF37]">ON</span> public.telemetry <span className="text-[#D4AF37]">FOR INSERT WITH CHECK</span> (true);</div>
          <div><span className="text-[#D4AF37]">CREATE POLICY</span> "Allow dashboard select" <span className="text-[#D4AF37]">ON</span> public.telemetry <span className="text-[#D4AF37]">FOR SELECT USING</span> (true);</div>
        </div>
      </div>
    </div>
  );
};

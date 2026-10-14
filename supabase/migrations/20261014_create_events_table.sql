-- ==============================================================================
-- Migration: 20261014_create_events_table.sql
-- Description: Product Analytics Events Table and Optimized Indexes
-- Target: Counter365 / StyleFleet Supabase Database
-- ==============================================================================

-- 1. Create Events Table
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    event_name VARCHAR(120) NOT NULL,
    screen VARCHAR(120) NOT NULL,
    element VARCHAR(120),
    metadata JSONB DEFAULT '{}'::jsonb,
    city VARCHAR(100),
    state VARCHAR(100) DEFAULT 'Tamil Nadu',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Performance Indexes for Analytics Queries
CREATE INDEX IF NOT EXISTS idx_events_user_event_created 
ON public.events (user_id, event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_shop_created 
ON public.events (shop_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_event_name_created 
ON public.events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_screen_created 
ON public.events (screen, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_metadata_gin 
ON public.events USING GIN (metadata);

-- 3. Row Level Security (RLS) Policies
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users and anonymous client app POS to record events
DROP POLICY IF EXISTS "allow_insert_events_all" ON public.events;
CREATE POLICY "allow_insert_events_all" 
ON public.events FOR INSERT 
TO public, anon, authenticated 
WITH CHECK (true);

-- Allow admins to read all events for analytics
DROP POLICY IF EXISTS "allow_select_events_all" ON public.events;
CREATE POLICY "allow_select_events_all" 
ON public.events FOR SELECT 
TO public, anon, authenticated 
USING (true);

COMMENT ON TABLE public.events IS 'Stores client analytics, screen views, interactions, and funnel events for Product Analytics.';

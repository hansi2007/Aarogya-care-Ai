-- ============================================================================
-- Aarogya Care AI - Supabase Production Schema & Storage Configuration
-- Safe execution: Uses "IF NOT EXISTS" so existing tables are never dropped.
-- Run this in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Paste & Run
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. USERS (Patient Profiles linked to Supabase Auth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    age INTEGER,
    gender TEXT,
    patient_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_patient_id ON public.users(patient_id);

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policies for users
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_select_own') THEN
        CREATE POLICY "users_select_own" ON public.users
            FOR SELECT USING (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_insert_own') THEN
        CREATE POLICY "users_insert_own" ON public.users
            FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_update_own') THEN
        CREATE POLICY "users_update_own" ON public.users
            FOR UPDATE USING (auth.uid() = id);
    END IF;
END $$;

-- ============================================================================
-- 2. DOCUMENTS (Prescriptions, Medical Reports, Lab Results)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_name TEXT,
    patient_age INTEGER,
    kind TEXT NOT NULL, -- 'image' | 'pdf' | 'sample' | 'text'
    title TEXT NOT NULL,
    filename TEXT,
    mime TEXT,
    size INTEGER,
    storage_path TEXT, -- Reference path in the 'medical-documents' bucket
    base64 TEXT, -- Fallback inline representation
    text_content TEXT,
    image_src TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for documents
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_kind ON public.documents(kind);

-- Enable RLS on documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Policies for documents
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'documents_select_own') THEN
        CREATE POLICY "documents_select_own" ON public.documents
            FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'documents_insert_own') THEN
        CREATE POLICY "documents_insert_own" ON public.documents
            FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'documents_update_own') THEN
        CREATE POLICY "documents_update_own" ON public.documents
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'documents_delete_own') THEN
        CREATE POLICY "documents_delete_own" ON public.documents
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- 3. RUNS (Multi-Agent AI Pipeline Sessions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'queued', -- 'queued' | 'running' | 'completed' | 'failed'
    mode TEXT NOT NULL DEFAULT 'demo',    -- 'live' | 'demo' | 'text' | 'pdf'
    title TEXT NOT NULL,
    summary_line TEXT,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);

-- Indexes for runs
CREATE INDEX IF NOT EXISTS idx_runs_document_id ON public.runs(document_id);
CREATE INDEX IF NOT EXISTS idx_runs_user_id ON public.runs(user_id);
CREATE INDEX IF NOT EXISTS idx_runs_status ON public.runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON public.runs(created_at DESC);

-- Enable RLS on runs
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;

-- Policies for runs
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'runs' AND policyname = 'runs_select_own') THEN
        CREATE POLICY "runs_select_own" ON public.runs
            FOR SELECT USING (
                auth.uid() = user_id 
                OR user_id IS NULL
                OR document_id IN (SELECT id FROM public.documents WHERE user_id = auth.uid())
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'runs' AND policyname = 'runs_insert_own') THEN
        CREATE POLICY "runs_insert_own" ON public.runs
            FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'runs' AND policyname = 'runs_update_own') THEN
        CREATE POLICY "runs_update_own" ON public.runs
            FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'runs' AND policyname = 'runs_delete_own') THEN
        CREATE POLICY "runs_delete_own" ON public.runs
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- 4. AGENT_EVENTS (Individual Agent Steps: LUMEN, MEDSCOPE, PLAINWORDS, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agent_events (
    id BIGSERIAL PRIMARY KEY,
    run_id UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
    agent TEXT NOT NULL,     -- 'vision' | 'enrich' | 'simplify' | 'safety' | 'companion' | 'system'
    agent_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'info', -- 'idle' | 'info' | 'working' | 'success' | 'error'
    message TEXT NOT NULL,
    payload JSONB,
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for agent_events
CREATE INDEX IF NOT EXISTS idx_agent_events_run_id ON public.agent_events(run_id, id);
CREATE INDEX IF NOT EXISTS idx_agent_events_ts ON public.agent_events(ts);

-- Enable RLS on agent_events
ALTER TABLE public.agent_events ENABLE ROW LEVEL SECURITY;

-- Policies for agent_events (Accessible if user owns the associated run)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_events' AND policyname = 'agent_events_select_own') THEN
        CREATE POLICY "agent_events_select_own" ON public.agent_events
            FOR SELECT USING (
                run_id IN (
                    SELECT r.id FROM public.runs r
                    LEFT JOIN public.documents d ON r.document_id = d.id
                    WHERE r.user_id = auth.uid() OR d.user_id = auth.uid() OR r.user_id IS NULL
                )
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_events' AND policyname = 'agent_events_insert_all') THEN
        CREATE POLICY "agent_events_insert_all" ON public.agent_events
            FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- ============================================================================
-- 5. ANALYSES (AI-Generated Plain English Explanations & Care Plans)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL UNIQUE REFERENCES public.runs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    raw_text TEXT,
    payload JSONB,
    med_count INTEGER NOT NULL DEFAULT 0,
    condition_count INTEGER NOT NULL DEFAULT 0,
    interaction_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for analyses
CREATE INDEX IF NOT EXISTS idx_analyses_run_id ON public.analyses(run_id);
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON public.analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON public.analyses(created_at DESC);

-- Enable RLS on analyses
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

-- Policies for analyses
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analyses' AND policyname = 'analyses_select_own') THEN
        CREATE POLICY "analyses_select_own" ON public.analyses
            FOR SELECT USING (
                auth.uid() = user_id 
                OR user_id IS NULL
                OR run_id IN (SELECT id FROM public.runs WHERE user_id = auth.uid())
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analyses' AND policyname = 'analyses_insert_own') THEN
        CREATE POLICY "analyses_insert_own" ON public.analyses
            FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analyses' AND policyname = 'analyses_delete_own') THEN
        CREATE POLICY "analyses_delete_own" ON public.analyses
            FOR DELETE USING (
                auth.uid() = user_id
                OR run_id IN (SELECT id FROM public.runs WHERE user_id = auth.uid())
            );
    END IF;
END $$;

-- ============================================================================
-- 6. MEDICINE_CACHE (Verified OpenFDA / RxNav / Knowledge Reference Cache)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.medicine_cache (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    source TEXT NOT NULL DEFAULT 'rxnav+fda',
    data JSONB,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for medicine_cache
CREATE INDEX IF NOT EXISTS idx_medicine_cache_name ON public.medicine_cache(name);

-- Enable RLS on medicine_cache
ALTER TABLE public.medicine_cache ENABLE ROW LEVEL SECURITY;

-- Policies for medicine_cache: readable by everyone, insertable by backend
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'medicine_cache' AND policyname = 'medicine_cache_select') THEN
        CREATE POLICY "medicine_cache_select" ON public.medicine_cache
            FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'medicine_cache' AND policyname = 'medicine_cache_insert') THEN
        CREATE POLICY "medicine_cache_insert" ON public.medicine_cache
            FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- ============================================================================
-- 7. SECURE STORAGE BUCKET: medical-documents
-- ============================================================================
-- Create private storage bucket if it does not already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'medical-documents',
    'medical-documents',
    false, -- STRICTLY PRIVATE: no unauthorized public URL access
    15728640, -- 15 MB max file size
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies: Patients can only access documents inside their folder (named after their auth.uid())
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'patients_upload_own_documents') THEN
        CREATE POLICY "patients_upload_own_documents" ON storage.objects
            FOR INSERT TO authenticated
            WITH CHECK (
                bucket_id = 'medical-documents' 
                AND (storage.foldername(name))[1] = auth.uid()::text
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'patients_view_own_documents') THEN
        CREATE POLICY "patients_view_own_documents" ON storage.objects
            FOR SELECT TO authenticated
            USING (
                bucket_id = 'medical-documents' 
                AND (storage.foldername(name))[1] = auth.uid()::text
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'patients_delete_own_documents') THEN
        CREATE POLICY "patients_delete_own_documents" ON storage.objects
            FOR DELETE TO authenticated
            USING (
                bucket_id = 'medical-documents' 
                AND (storage.foldername(name))[1] = auth.uid()::text
            );
    END IF;
END $$;

-- ============================================================================
-- 8. AUTOMATIC PROFILE TRIGGER (Optional convenience helper)
-- Automatically inserts a record into public.users when a new auth user signs up
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users (id, name, email, phone, age, gender, patient_id)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.email,
        new.raw_user_meta_data->>'phone',
        CASE WHEN (new.raw_user_meta_data->>'age') ~ '^[0-9]+$' THEN (new.raw_user_meta_data->>'age')::integer ELSE NULL END,
        new.raw_user_meta_data->>'gender',
        COALESCE(new.raw_user_meta_data->>'patient_id', 'AC-' || floor(10000 + random() * 90000)::text)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if not exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;

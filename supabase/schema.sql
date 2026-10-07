-- ==============================================================================
-- Noto Digital Notebook: Supabase Relational Schema & Row Level Security (RLS)
-- ==============================================================================

-- 1. Folders table
CREATE TABLE IF NOT EXISTS public.folders (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own folders"
    ON public.folders
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 2. Notebooks table
CREATE TABLE IF NOT EXISTS public.notebooks (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    title TEXT NOT NULL,
    folder_id TEXT REFERENCES public.folders(id) ON DELETE SET NULL,
    cover_color TEXT NOT NULL,
    cover_pattern TEXT DEFAULT 'plain',
    current_page_id TEXT,
    favorite BOOLEAN NOT NULL DEFAULT false,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    deleted BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notebooks"
    ON public.notebooks
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Pages table (separate record per page, jsonb for vector strokes/shapes/texts/images)
CREATE TABLE IF NOT EXISTS public.pages (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    notebook_id TEXT NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_num INTEGER NOT NULL DEFAULT 0,
    width INTEGER NOT NULL DEFAULT 850,
    height INTEGER NOT NULL DEFAULT 1120,
    background JSONB NOT NULL DEFAULT '{"color": "#FFFFFF", "type": "grid", "gridSize": 24, "gridColor": "#3B82F6", "gridOpacity": 0.9, "lineWidth": 1}'::jsonb,
    strokes JSONB NOT NULL DEFAULT '[]'::jsonb,
    shapes JSONB NOT NULL DEFAULT '[]'::jsonb,
    texts JSONB NOT NULL DEFAULT '[]'::jsonb,
    images JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    deleted BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own pages"
    ON public.pages
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Performance indices
CREATE INDEX IF NOT EXISTS idx_notebooks_user ON public.notebooks(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pages_notebook ON public.pages(notebook_id, order_num ASC);
CREATE INDEX IF NOT EXISTS idx_pages_user ON public.pages(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_folders_user ON public.folders(user_id);

-- 4. Supabase Storage bucket for page images
INSERT INTO storage.buckets (id, name, public)
VALUES ('page-images', 'page-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY "Users can upload their own page images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'page-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view page images"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'page-images');

CREATE POLICY "Users can update and delete their own images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'page-images' AND (storage.foldername(name))[1] = auth.uid()::text);

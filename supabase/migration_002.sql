-- ==============================================================================
-- Migration 002: Private Storage, Storage Policies & Folder Deletion / Timestamps
-- Safe to execute on existing database without data loss.
-- ==============================================================================

-- 1. Add deleted and updated_at columns to folders table if they do not exist
ALTER TABLE public.folders 
ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.folders 
ADD COLUMN IF NOT EXISTS updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint;

-- Create index on updated_at for folders
CREATE INDEX IF NOT EXISTS idx_folders_user_updated ON public.folders(user_id, updated_at DESC);

-- 2. Make page-images bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'page-images';

-- If bucket does not exist yet, create as private
INSERT INTO storage.buckets (id, name, public)
VALUES ('page-images', 'page-images', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 3. Update Storage Policies for page-images bucket

-- Drop previous policies on storage.objects to apply refined rules
DROP POLICY IF EXISTS "Users can view page images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own page images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update and delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own page images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own page images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own page images" ON storage.objects;

-- INSERT policy (Upload)
CREATE POLICY "Users can upload their own page images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'page-images' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- SELECT policy (Download / Signed URLs) - strictly restricted to owner
CREATE POLICY "Users can view their own page images"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'page-images' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- UPDATE policy (Overwrite / Upsert)
CREATE POLICY "Users can update their own page images"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'page-images' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'page-images' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- DELETE policy (Removal)
CREATE POLICY "Users can delete their own page images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'page-images' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

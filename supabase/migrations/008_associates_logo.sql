-- ============================================
-- 008: Logo da empresa associada
-- ============================================
-- Adiciona coluna logo_url para armazenar o link público do logo
-- subido em Supabase Storage (bucket "associates").
-- ============================================

ALTER TABLE public.associates
  ADD COLUMN IF NOT EXISTS logo_url text;

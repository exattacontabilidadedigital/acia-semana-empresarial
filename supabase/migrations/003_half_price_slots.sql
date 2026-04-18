-- ============================================
-- Migration: half_price -> half_price_slots (integer)
-- Adiciona controle de vagas meia-entrada
-- ============================================

-- 1. Alterar coluna half_price de numeric para integer (vagas disponíveis)
ALTER TABLE public.events
  ALTER COLUMN half_price SET DATA TYPE integer USING COALESCE(half_price::integer, 0),
  ALTER COLUMN half_price SET DEFAULT 0;

-- 2. Adicionar campo is_half_price na tabela inscriptions
ALTER TABLE public.inscriptions
  ADD COLUMN IF NOT EXISTS is_half_price boolean DEFAULT false;

-- 3. Index para facilitar contagem de meia-entrada por evento
CREATE INDEX IF NOT EXISTS idx_inscriptions_half_price
  ON public.inscriptions(event_id, is_half_price)
  WHERE is_half_price = true;

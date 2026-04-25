-- ============================================
-- 017: Tamanho da imagem da assinatura
-- ============================================
-- Permite ajustar como a imagem ocupa o slot da assinatura no certificado.
-- Não afeta o alinhamento do slot (60×14mm), apenas a escala da imagem.
-- ============================================

ALTER TABLE public.certificate_signatures
  ADD COLUMN IF NOT EXISTS image_size text NOT NULL DEFAULT 'medium'
  CHECK (image_size IN ('small', 'medium', 'large', 'xlarge'));

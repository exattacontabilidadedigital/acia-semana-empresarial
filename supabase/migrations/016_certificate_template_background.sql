-- ============================================
-- 016: Imagem de fundo do certificado
-- ============================================
-- Permite ao admin subir uma arte pré-pronta como background. Quando setada,
-- o renderer esconde as bordas decorativas e usa a imagem; só texto + assinaturas
-- + QR ficam visíveis sobre ela.
-- ============================================

ALTER TABLE public.certificate_templates
  ADD COLUMN IF NOT EXISTS background_url text;

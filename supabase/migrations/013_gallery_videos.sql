-- ============================================
-- 013: Galeria de vídeos (URL externa: YouTube/Vimeo)
-- ============================================
-- Espelha gallery_photos, mas armazena URL externa em vez de upload.
-- Renderizado na página /edicoes na aba "Vídeos".
-- ============================================

CREATE TABLE IF NOT EXISTS public.gallery_videos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  edition_id bigint REFERENCES public.editions(id) ON DELETE SET NULL,
  video_url text NOT NULL,                 -- URL pública (YouTube/Vimeo/etc)
  caption text,
  duration text,                           -- "2:14" — texto livre
  color text,                              -- CSS var ou hex pra cor de fundo do card
  thumbnail_url text,                      -- opcional: capa custom (fallback = derivada da plataforma)
  featured boolean DEFAULT false,          -- vira card grande (span 3) na grid
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_gallery_videos_edition ON public.gallery_videos(edition_id);
CREATE INDEX IF NOT EXISTS idx_gallery_videos_order ON public.gallery_videos(order_index);

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.gallery_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gallery_videos_select_public ON public.gallery_videos;
CREATE POLICY gallery_videos_select_public ON public.gallery_videos FOR SELECT
  USING (
    edition_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.editions e
      WHERE e.id = gallery_videos.edition_id
        AND e.status = 'published'
    )
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS gallery_videos_admin_all ON public.gallery_videos;
CREATE POLICY gallery_videos_admin_all ON public.gallery_videos FOR ALL
  USING (public.is_admin(auth.uid()));

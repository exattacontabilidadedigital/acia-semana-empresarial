-- ============================================
-- 009: Edições anteriores + Galeria de fotos
-- ============================================
-- Move o array hardcoded de "edições" e "fotos" do front para o banco,
-- permitindo gerenciamento via /admin/edicoes e /admin/galeria.
-- ============================================

-- ============================================
-- TABELA: editions
-- ============================================
CREATE TABLE IF NOT EXISTS public.editions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  year integer NOT NULL UNIQUE,
  ordinal text,                          -- "1ª", "2ª", "3ª"
  title text NOT NULL,
  description text,
  color text,                            -- CSS var ou hex (#xxxxxx ou var(--azul))
  cover_url text,                        -- banner principal da edição
  press_kit_url text,                    -- material de imprensa (PDF/ZIP)
  stats jsonb DEFAULT '[]'::jsonb,       -- [["1.200","participantes"],["38","palestrantes"]]
  status text NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft','published','archived')),
  order_index integer DEFAULT 0,         -- pra customizar ordem na timeline
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_editions_year ON public.editions(year);
CREATE INDEX IF NOT EXISTS idx_editions_status ON public.editions(status);

-- ============================================
-- TABELA: gallery_photos
-- ============================================
CREATE TABLE IF NOT EXISTS public.gallery_photos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  edition_id bigint REFERENCES public.editions(id) ON DELETE SET NULL,
  url text NOT NULL,
  caption text,
  alt text,
  size_hint text CHECK (size_hint IN ('1x1','2x1','1x2','2x2') OR size_hint IS NULL),
  order_index integer DEFAULT 0,
  featured boolean DEFAULT false,
  storage_path text,                     -- pra deletar do bucket depois
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_gallery_photos_edition ON public.gallery_photos(edition_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_order ON public.gallery_photos(order_index);

-- ============================================
-- TRIGGER: updated_at em editions
-- ============================================
DROP TRIGGER IF EXISTS editions_touch_updated_at ON public.editions;
CREATE TRIGGER editions_touch_updated_at
  BEFORE UPDATE ON public.editions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;

-- Público vê edições publicadas
DROP POLICY IF EXISTS editions_select_public ON public.editions;
CREATE POLICY editions_select_public ON public.editions FOR SELECT
  USING (status = 'published' OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS editions_admin_all ON public.editions;
CREATE POLICY editions_admin_all ON public.editions FOR ALL
  USING (public.is_admin(auth.uid()));

-- Galeria: público vê todas as fotos (mesmo de edições draft? não — só de edições publicadas)
DROP POLICY IF EXISTS gallery_select_public ON public.gallery_photos;
CREATE POLICY gallery_select_public ON public.gallery_photos FOR SELECT
  USING (
    edition_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.editions e
      WHERE e.id = gallery_photos.edition_id
        AND e.status = 'published'
    )
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS gallery_admin_all ON public.gallery_photos;
CREATE POLICY gallery_admin_all ON public.gallery_photos FOR ALL
  USING (public.is_admin(auth.uid()));

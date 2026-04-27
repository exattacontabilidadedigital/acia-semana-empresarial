-- ============================================
-- 024: Marcas/expositores das edições anteriores
-- ============================================
-- Move o array hardcoded de "Quem já expôs" do front (carrossel da página
-- /expositores) pro banco. Permite gerenciar os logos via /admin/expositores/pagina.
-- ============================================

CREATE TABLE IF NOT EXISTS public.past_exhibitors (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  category text,
  logo_url text,
  storage_path text,                       -- pra deletar do bucket depois
  color text,                              -- CSS var ou hex (fallback do "dot" do card)
  order_index integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_past_exhibitors_order ON public.past_exhibitors(order_index);
CREATE INDEX IF NOT EXISTS idx_past_exhibitors_active ON public.past_exhibitors(active);

DROP TRIGGER IF EXISTS past_exhibitors_touch_updated_at ON public.past_exhibitors;
CREATE TRIGGER past_exhibitors_touch_updated_at
  BEFORE UPDATE ON public.past_exhibitors
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.past_exhibitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS past_exhibitors_select_public ON public.past_exhibitors;
CREATE POLICY past_exhibitors_select_public ON public.past_exhibitors FOR SELECT
  USING (active = true OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS past_exhibitors_admin_all ON public.past_exhibitors;
CREATE POLICY past_exhibitors_admin_all ON public.past_exhibitors FOR ALL
  USING (public.is_admin(auth.uid()));

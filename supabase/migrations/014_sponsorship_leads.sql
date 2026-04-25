-- ============================================
-- 014: Leads de patrocínio (formulário /parceiros)
-- ============================================
-- Captura interesse de empresas em virar patrocinadoras do evento.
-- Insert é público (qualquer visitante do site); leitura/edição é admin.
-- ============================================

CREATE TABLE IF NOT EXISTS public.sponsorship_leads (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  company text NOT NULL,
  email text NOT NULL,
  phone text,
  tier text,                              -- "master", "diamante", "ouro", etc.
  message text,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','contacted','qualified','closed','discarded')),
  notes text,                             -- anotação interna do admin
  ip_address text,                        -- guardado pra anti-abuso
  user_agent text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  contacted_at timestamptz,
  contacted_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_sponsorship_leads_status
  ON public.sponsorship_leads(status);
CREATE INDEX IF NOT EXISTS idx_sponsorship_leads_created
  ON public.sponsorship_leads(created_at DESC);

-- ============================================
-- TRIGGER: updated_at
-- ============================================
DROP TRIGGER IF EXISTS sponsorship_leads_touch_updated_at
  ON public.sponsorship_leads;
CREATE TRIGGER sponsorship_leads_touch_updated_at
  BEFORE UPDATE ON public.sponsorship_leads
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.sponsorship_leads ENABLE ROW LEVEL SECURITY;

-- Qualquer visitante pode INSERIR (formulário público).
DROP POLICY IF EXISTS sponsorship_leads_insert_public
  ON public.sponsorship_leads;
CREATE POLICY sponsorship_leads_insert_public
  ON public.sponsorship_leads FOR INSERT
  WITH CHECK (true);

-- Apenas admin pode SELECT/UPDATE/DELETE (gestão).
DROP POLICY IF EXISTS sponsorship_leads_admin_all
  ON public.sponsorship_leads;
CREATE POLICY sponsorship_leads_admin_all
  ON public.sponsorship_leads FOR ALL
  USING (public.is_admin(auth.uid()));

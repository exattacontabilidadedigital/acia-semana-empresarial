-- ============================================
-- 007: Associados + Cupons exclusivos
-- ============================================
-- Adiciona empresas associadas da ACIA (cadastro pelo admin) e estende
-- cupons com escopo público / todos-associados / associados-específicos.
-- Inscrições passam a guardar associate_id + cnpj quando o cupom é
-- de associado, permitindo rastrear quem usou e enforçar limite por
-- associado.
-- ============================================

-- ============================================
-- TABELA: associates
-- ============================================
CREATE TABLE IF NOT EXISTS public.associates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text NOT NULL,
  nome_fantasia text,
  cnpj text NOT NULL UNIQUE,
  segmento text,
  contact_name text,
  email text,
  phone text,
  cep text,
  rua text,
  numero text,
  bairro text,
  cidade text,
  estado text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_associates_cnpj ON public.associates(cnpj);
CREATE INDEX IF NOT EXISTS idx_associates_status ON public.associates(status);
CREATE INDEX IF NOT EXISTS idx_associates_razao_social ON public.associates(razao_social);

-- ============================================
-- ALTER coupons: novo escopo + limite por associado
-- ============================================
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'public'
    CHECK (scope IN ('public','associates_all','associates_specific')),
  ADD COLUMN IF NOT EXISTS max_uses_per_associate integer;

CREATE INDEX IF NOT EXISTS idx_coupons_scope ON public.coupons(scope);

-- ============================================
-- M:N: cupom <-> associados específicos
-- ============================================
CREATE TABLE IF NOT EXISTS public.coupon_associates (
  coupon_id bigint NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  associate_id uuid NOT NULL REFERENCES public.associates(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (coupon_id, associate_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_associates_associate
  ON public.coupon_associates(associate_id);

-- ============================================
-- ALTER inscriptions: rastreabilidade do associado
-- ============================================
ALTER TABLE public.inscriptions
  ADD COLUMN IF NOT EXISTS associate_id uuid REFERENCES public.associates(id),
  ADD COLUMN IF NOT EXISTS cnpj text;

CREATE INDEX IF NOT EXISTS idx_inscriptions_associate
  ON public.inscriptions(associate_id);
CREATE INDEX IF NOT EXISTS idx_inscriptions_cnpj
  ON public.inscriptions(cnpj);

-- ============================================
-- HELPER: encontra associado ativo por CNPJ (ignorando máscara)
-- ============================================
CREATE OR REPLACE FUNCTION public.find_active_associate(p_cnpj text)
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT id FROM public.associates
  WHERE regexp_replace(cnpj, '[^0-9]', '', 'g')
      = regexp_replace(p_cnpj, '[^0-9]', '', 'g')
    AND status = 'active'
  LIMIT 1;
$$;

-- ============================================
-- TRIGGER: updated_at
-- (touch_updated_at criado em 006)
-- ============================================
DROP TRIGGER IF EXISTS associates_touch_updated_at ON public.associates;
CREATE TRIGGER associates_touch_updated_at
  BEFORE UPDATE ON public.associates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.associates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_associates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS associates_admin_all ON public.associates;
CREATE POLICY associates_admin_all ON public.associates FOR ALL
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS coupon_associates_admin_all ON public.coupon_associates;
CREATE POLICY coupon_associates_admin_all ON public.coupon_associates FOR ALL
  USING (public.is_admin(auth.uid()));

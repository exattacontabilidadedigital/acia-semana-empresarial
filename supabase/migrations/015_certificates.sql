-- ============================================
-- 015: Certificados de Participação + SMTP config
-- ============================================
-- - Tabela certificates (1 por ticket: granularidade fina pra grupos)
-- - Tabela certificate_templates (config editável por evento)
-- - Tabela certificate_signatures (assinaturas reutilizáveis)
-- - Pivot certificate_template_signatures (multi-assinatura por template)
-- - Tabela smtp_config (singleton, configurável pelo admin)
-- - View eligible_certificates (quem tem direito)
-- - Função generate_certificate_code
-- - Bucket privado certificates
-- ============================================

-- ============================================
-- ALTER events: carga horária (admin only)
-- ============================================
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS duration_hours numeric(5,2);

-- ============================================
-- TABELA: certificate_signatures
-- ============================================
-- Assinaturas reutilizáveis (presidente da ACIA, parceiros, etc.)
CREATE TABLE IF NOT EXISTS public.certificate_signatures (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  role text,                              -- ex: "Presidente"
  organization text,                      -- ex: "ACIA"
  signature_image_url text,               -- imagem da assinatura (PNG transparente)
  organization_logo_url text,             -- logo da organização
  display_order integer DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_signatures_active
  ON public.certificate_signatures(active);

DROP TRIGGER IF EXISTS certificate_signatures_touch_updated_at
  ON public.certificate_signatures;
CREATE TRIGGER certificate_signatures_touch_updated_at
  BEFORE UPDATE ON public.certificate_signatures
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================
-- TABELA: certificate_templates
-- ============================================
-- 1 template por evento; sem evento = template padrão (fallback)
CREATE TABLE IF NOT EXISTS public.certificate_templates (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id bigint UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Template padrão',
  header_text text NOT NULL DEFAULT 'Certificado de Participação',
  body_text text NOT NULL DEFAULT
    'Certificamos que {nome} participou do evento "{evento}", '
    || 'realizado em {data}, com carga horária de {duracao}h.',
  footer_text text,                       -- texto livre abaixo do corpo
  logo_url text,                          -- logo principal do certificado
  duration_hours numeric(5,2),            -- override por evento; senão usa events.duration_hours
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DROP TRIGGER IF EXISTS certificate_templates_touch_updated_at
  ON public.certificate_templates;
CREATE TRIGGER certificate_templates_touch_updated_at
  BEFORE UPDATE ON public.certificate_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================
-- PIVOT: template ↔ signatures (multi-assinatura por template)
-- ============================================
CREATE TABLE IF NOT EXISTS public.certificate_template_signatures (
  template_id bigint NOT NULL
    REFERENCES public.certificate_templates(id) ON DELETE CASCADE,
  signature_id bigint NOT NULL
    REFERENCES public.certificate_signatures(id) ON DELETE CASCADE,
  display_order integer DEFAULT 0,
  PRIMARY KEY (template_id, signature_id)
);

CREATE INDEX IF NOT EXISTS idx_template_signatures_template
  ON public.certificate_template_signatures(template_id);

-- ============================================
-- FUNÇÃO: gera código curto e legível (CERT-2026-A3F9K2)
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_certificate_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- sem 0/O/1/I (legibilidade)
  result text := 'CERT-' || EXTRACT(year FROM now())::text || '-';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- ============================================
-- TABELA: certificates
-- ============================================
-- 1 row por ticket emitido. Snapshot dos dados na hora da emissão pra não
-- mudar se inscrição/evento for editado depois.
CREATE TABLE IF NOT EXISTS public.certificates (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_id uuid NOT NULL UNIQUE
    REFERENCES public.tickets(id) ON DELETE CASCADE,
  inscription_id bigint NOT NULL
    REFERENCES public.inscriptions(id) ON DELETE CASCADE,
  event_id bigint NOT NULL
    REFERENCES public.events(id) ON DELETE CASCADE,

  -- Snapshot dos dados (não muda se inscrição/evento editar depois)
  participant_name text NOT NULL,
  participant_cpf text NOT NULL,
  participant_email text NOT NULL,
  event_title text NOT NULL,
  event_date date NOT NULL,
  duration_hours numeric(5,2),

  -- Código de verificação único (curto, legível, ex: CERT-2026-A3F9K2)
  verification_code text NOT NULL UNIQUE
    DEFAULT public.generate_certificate_code(),

  -- PDF persistido no Storage
  pdf_path text,                          -- 'certificates/{event_id}/{code}.pdf'

  -- Auditoria
  issued_at timestamptz NOT NULL DEFAULT now(),
  download_count integer NOT NULL DEFAULT 0,
  last_downloaded_at timestamptz,
  email_sent_at timestamptz,
  email_sent_to text,
  email_send_count integer NOT NULL DEFAULT 0,
  email_last_error text,

  -- Template usado na geração (preserva histórico se template mudar)
  template_id bigint REFERENCES public.certificate_templates(id),

  -- Revogação manual (admin)
  revoked_at timestamptz,
  revoked_reason text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_certificates_event
  ON public.certificates(event_id);
CREATE INDEX IF NOT EXISTS idx_certificates_inscription
  ON public.certificates(inscription_id);
CREATE INDEX IF NOT EXISTS idx_certificates_cpf
  ON public.certificates(participant_cpf);

DROP TRIGGER IF EXISTS certificates_touch_updated_at ON public.certificates;
CREATE TRIGGER certificates_touch_updated_at
  BEFORE UPDATE ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================
-- VIEW: elegíveis pra certificado (admin reusa)
-- ============================================
CREATE OR REPLACE VIEW public.eligible_certificates AS
SELECT
  t.id AS ticket_id,
  i.id AS inscription_id,
  e.id AS event_id,
  e.title AS event_title,
  e.event_date,
  e.status AS event_status,
  t.participant_name,
  i.cpf AS participant_cpf,
  i.email AS participant_email,
  t.checked_in_at,
  c.id AS certificate_id,
  c.verification_code,
  c.issued_at,
  c.email_sent_at,
  c.revoked_at
FROM public.tickets t
JOIN public.inscriptions i ON i.id = t.inscription_id
JOIN public.events e ON e.id = t.event_id
LEFT JOIN public.certificates c ON c.ticket_id = t.id
WHERE t.status = 'used'
  AND t.checked_in_at IS NOT NULL
  AND i.payment_status IN ('confirmed','free')
  AND (e.status = 'finalizado' OR e.event_date < CURRENT_DATE);

-- ============================================
-- TABELA: smtp_config (singleton)
-- ============================================
-- 1 linha só (id=1). Cobre os mesmos campos das env vars; quando preenchida,
-- sobrepõe as env vars. Senha em texto plano com RLS apertada (apenas admin).
CREATE TABLE IF NOT EXISTS public.smtp_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  host text NOT NULL,
  port integer NOT NULL DEFAULT 587,
  secure boolean NOT NULL DEFAULT false, -- true se port 465
  username text NOT NULL,
  password text NOT NULL,
  from_email text,                       -- ex: "acia.aca@gmail.com"
  from_name text,                        -- ex: "Semana Empresarial"
  enabled boolean NOT NULL DEFAULT true,
  test_email_to text,                    -- último email de teste enviado
  test_sent_at timestamptz,
  test_last_error text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

DROP TRIGGER IF EXISTS smtp_config_touch_updated_at ON public.smtp_config;
CREATE TRIGGER smtp_config_touch_updated_at
  BEFORE UPDATE ON public.smtp_config
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.certificate_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_template_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smtp_config ENABLE ROW LEVEL SECURITY;

-- Tudo: somente admin via cliente. Rotas públicas usam service role.
DROP POLICY IF EXISTS certificate_signatures_admin_all
  ON public.certificate_signatures;
CREATE POLICY certificate_signatures_admin_all
  ON public.certificate_signatures FOR ALL
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS certificate_templates_admin_all
  ON public.certificate_templates;
CREATE POLICY certificate_templates_admin_all
  ON public.certificate_templates FOR ALL
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS certificate_template_signatures_admin_all
  ON public.certificate_template_signatures;
CREATE POLICY certificate_template_signatures_admin_all
  ON public.certificate_template_signatures FOR ALL
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS certificates_admin_all ON public.certificates;
CREATE POLICY certificates_admin_all ON public.certificates FOR ALL
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS smtp_config_admin_all ON public.smtp_config;
CREATE POLICY smtp_config_admin_all ON public.smtp_config FOR ALL
  USING (public.is_admin(auth.uid()));

-- ============================================
-- STORAGE BUCKETS
-- ============================================
-- Privado (sem leitura pública); acesso só via service role nas rotas.
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', false)
ON CONFLICT (id) DO NOTHING;

-- Público pra logos e assinaturas que aparecem nos certificados.
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificate-assets', 'certificate-assets', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- TEMPLATE PADRÃO (sem evento)
-- ============================================
INSERT INTO public.certificate_templates (event_id, name)
VALUES (NULL, 'Template padrão')
ON CONFLICT (event_id) DO NOTHING;

-- ============================================
-- 006: Organizations + Members + Invitations
-- ============================================
-- Substitui a antiga tabela "partners" (1:1 user-org) por um modelo
-- multi-membro com workflow de aprovação de eventos:
--   organizations  : entidade parceira (SEBRAE, Exatta, etc.)
--   organization_members : equipe de cada org (owner | member)
--   organization_invitations : convites pendentes por email
-- Eventos ganham organization_id + workflow draft → pending_approval → active.
-- ============================================

-- Drop antigo modelo (sem dados em produção)
DROP TABLE IF EXISTS public.partners CASCADE;

-- ============================================
-- TABELAS
-- ============================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  type text NOT NULL CHECK (type IN ('sistema_s','public_entity','private_company','ngo','other')),
  cnpj text,
  email text,
  phone text,
  website text,
  logo_url text,
  brand_color text,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','member')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','removed')),
  invited_by uuid REFERENCES auth.users(id),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner','member')),
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by uuid REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- ALTER events: org + workflow
-- ============================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE public.events ADD CONSTRAINT events_status_check
  CHECK (status IN ('draft','pending_approval','active','rejected','archived','inactive'));

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_orgs_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_orgs_status ON public.organizations(status);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_invites_email ON public.organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invites_token ON public.organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_events_org ON public.events(organization_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.is_org_member(p_user uuid, p_org uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = p_user
      AND organization_id = p_org
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_owner(p_user uuid, p_org uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = p_user
      AND organization_id = p_org
      AND role = 'owner'
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.user_orgs(p_user uuid)
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT organization_id FROM public.organization_members
  WHERE user_id = p_user AND status = 'active';
$$;

-- Estende: dono do evento agora inclui qualquer membro ativo da org dona.
-- Mantém os nomes de parâmetros originais (user_id, event_id) para preservar
-- as policies que dependem dessa assinatura.
CREATE OR REPLACE FUNCTION public.is_event_owner(user_id uuid, event_id bigint)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = is_event_owner.event_id
      AND (
        e.owner_id = is_event_owner.user_id
        OR e.organization_id IN (
          SELECT om.organization_id FROM public.organization_members om
          WHERE om.user_id = is_event_owner.user_id AND om.status = 'active'
        )
      )
  );
$$;

-- Trigger: atualiza updated_at em organizations
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organizations_touch_updated_at ON public.organizations;
CREATE TRIGGER organizations_touch_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================
-- RLS
-- ============================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- organizations
DROP POLICY IF EXISTS orgs_select ON public.organizations;
CREATE POLICY orgs_select ON public.organizations FOR SELECT
  USING (
    id IN (SELECT public.user_orgs(auth.uid()))
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS orgs_admin_all ON public.organizations;
CREATE POLICY orgs_admin_all ON public.organizations FOR ALL
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS orgs_owner_update ON public.organizations;
CREATE POLICY orgs_owner_update ON public.organizations FOR UPDATE
  USING (public.is_org_owner(auth.uid(), id));

-- organization_members
DROP POLICY IF EXISTS org_members_select ON public.organization_members;
CREATE POLICY org_members_select ON public.organization_members FOR SELECT
  USING (
    organization_id IN (SELECT public.user_orgs(auth.uid()))
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS org_members_owner_manage ON public.organization_members;
CREATE POLICY org_members_owner_manage ON public.organization_members FOR ALL
  USING (
    public.is_org_owner(auth.uid(), organization_id)
    OR public.is_admin(auth.uid())
  );

-- organization_invitations
DROP POLICY IF EXISTS invites_owner ON public.organization_invitations;
CREATE POLICY invites_owner ON public.organization_invitations FOR ALL
  USING (
    public.is_org_owner(auth.uid(), organization_id)
    OR public.is_admin(auth.uid())
  );

-- Permite o convidado consultar SEU próprio convite por token
-- (a página /convite/[token] roda como anon antes do login, então usamos
-- service-role server-side; mas ainda assim deixamos uma policy SELECT
-- que permite o convite ser visto se o email bate com o auth.email do user)
DROP POLICY IF EXISTS invites_select_own ON public.organization_invitations;
CREATE POLICY invites_select_own ON public.organization_invitations FOR SELECT
  USING (
    accepted_at IS NULL
    AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- ============================================
-- EVENTS RLS — extender p/ org members
-- ============================================

DROP POLICY IF EXISTS events_select_owner ON public.events;
CREATE POLICY events_select_org_member ON public.events FOR SELECT
  USING (
    organization_id IN (SELECT public.user_orgs(auth.uid()))
    OR auth.uid() = owner_id
  );

DROP POLICY IF EXISTS events_update_owner_admin ON public.events;
CREATE POLICY events_update_org_or_admin ON public.events FOR UPDATE
  USING (
    organization_id IN (SELECT public.user_orgs(auth.uid()))
    OR auth.uid() = owner_id
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS events_insert_admin ON public.events;
CREATE POLICY events_insert_org_or_admin ON public.events FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT public.user_orgs(auth.uid()))
    OR auth.uid() = owner_id
    OR public.is_admin(auth.uid())
  );

-- events_select_public e events_select_admin permanecem como estão.
-- inscriptions/tickets já passam por is_event_owner que agora inclui org members.

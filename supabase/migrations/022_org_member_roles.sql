-- ============================================
-- 022: Papéis funcionais em organization_members
-- ============================================
-- Expande organization_members.role de (owner|member) para
-- (owner|operations|financial|viewer), permitindo delegar áreas distintas
-- da organização parceira (Sebrae, Senac, Sistema S etc.) sem dar acesso total.
--
-- Mantém compatibilidade: 'member' continua aceito no CHECK durante a migração
-- (e é mapeado para 'operations'). Convites legados também são migrados.
--
-- Cria has_org_permission(user, org, perms[]) — usado pelas migrations seguintes
-- para policies de payment_logs, cancellation_requests, etc.
-- ============================================

-- 1) Migrar dados ANTES de alterar o CHECK constraint
UPDATE public.organization_members
   SET role = 'operations'
 WHERE role = 'member';

UPDATE public.organization_invitations
   SET role = 'operations'
 WHERE role = 'member' AND accepted_at IS NULL;

-- 2) Trocar o CHECK constraint para os novos valores
ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_role_check;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_role_check
  CHECK (role IN ('owner','operations','financial','viewer'));

ALTER TABLE public.organization_invitations
  DROP CONSTRAINT IF EXISTS organization_invitations_role_check;

ALTER TABLE public.organization_invitations
  ADD CONSTRAINT organization_invitations_role_check
  CHECK (role IN ('owner','operations','financial','viewer'));

-- 3) Helper: tem permissão na org?
-- Verdadeiro se:
--   - É admin global, OU
--   - É owner da org, OU
--   - Tem qualquer um dos roles em `perms` na org (status active)
CREATE OR REPLACE FUNCTION public.has_org_permission(
  p_user uuid,
  p_org uuid,
  p_perms text[]
) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    public.is_admin(p_user)
    OR EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = p_user
        AND organization_id = p_org
        AND status = 'active'
        AND (role = 'owner' OR role = ANY (p_perms))
    );
$$;

-- 4) Recria is_org_owner (sem mudança semântica — apenas reafirma a definição
-- agora que existem outros papéis na mesma tabela).
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

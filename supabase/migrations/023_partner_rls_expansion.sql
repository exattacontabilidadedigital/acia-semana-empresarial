-- ============================================
-- 023: RLS expandido para parceiros (org-scoped)
-- ============================================
-- Permite que membros de organizações parceiras enxerguem e operem dados dos
-- próprios eventos sem precisar de admin. Tudo escopado por organization_id
-- via has_org_permission() criada em 022.
--
-- Mudanças:
--   payment_logs: SELECT para owner/financial dos eventos da org
--   cancellation_requests: SELECT para operations/financial/owner; UPDATE para financial/owner
--   inscriptions: UPDATE para operations/owner (corrigir dados, marcar presença manual)
--   tickets: UPDATE de check-in restringido a operations/owner (era qualquer membro)
--   events: INSERT/UPDATE para operations/owner; DELETE somente owner ou admin
-- ============================================

-- ============================================
-- payment_logs
-- ============================================
DROP POLICY IF EXISTS payment_logs_select_org_financial ON public.payment_logs;
CREATE POLICY payment_logs_select_org_financial ON public.payment_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1
        FROM public.inscriptions i
        JOIN public.events e ON e.id = i.event_id
       WHERE i.id = payment_logs.inscription_id
         AND e.organization_id IS NOT NULL
         AND public.has_org_permission(
               auth.uid(),
               e.organization_id,
               ARRAY['financial']::text[]
             )
    )
  );

-- ============================================
-- cancellation_requests
-- ============================================
DROP POLICY IF EXISTS cancellation_requests_select_org ON public.cancellation_requests;
CREATE POLICY cancellation_requests_select_org ON public.cancellation_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1
        FROM public.inscriptions i
        JOIN public.events e ON e.id = i.event_id
       WHERE i.id = cancellation_requests.inscription_id
         AND e.organization_id IS NOT NULL
         AND public.has_org_permission(
               auth.uid(),
               e.organization_id,
               ARRAY['operations','financial']::text[]
             )
    )
  );

DROP POLICY IF EXISTS cancellation_requests_update_org ON public.cancellation_requests;
CREATE POLICY cancellation_requests_update_org ON public.cancellation_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
        FROM public.inscriptions i
        JOIN public.events e ON e.id = i.event_id
       WHERE i.id = cancellation_requests.inscription_id
         AND e.organization_id IS NOT NULL
         AND public.has_org_permission(
               auth.uid(),
               e.organization_id,
               ARRAY['financial']::text[]
             )
    )
  );

-- ============================================
-- inscriptions: UPDATE para operations da org dona do evento
-- (admin já tem inscriptions_update_admin)
-- ============================================
DROP POLICY IF EXISTS inscriptions_update_org ON public.inscriptions;
CREATE POLICY inscriptions_update_org ON public.inscriptions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.events e
       WHERE e.id = inscriptions.event_id
         AND e.organization_id IS NOT NULL
         AND public.has_org_permission(
               auth.uid(),
               e.organization_id,
               ARRAY['operations']::text[]
             )
    )
  );

-- ============================================
-- tickets: SELECT/UPDATE de check-in escopado por papel funcional
-- (substitui tickets_select_owner e tickets_update_checkin que dependiam
-- só de is_event_owner, deixando qualquer member fazer check-in)
-- ============================================
DROP POLICY IF EXISTS tickets_select_owner ON public.tickets;
CREATE POLICY tickets_select_owner ON public.tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
       WHERE e.id = tickets.event_id
         AND (
           e.owner_id = auth.uid()
           OR (
             e.organization_id IS NOT NULL
             AND public.has_org_permission(
                   auth.uid(),
                   e.organization_id,
                   ARRAY['operations','financial','viewer']::text[]
                 )
           )
         )
    )
  );

DROP POLICY IF EXISTS tickets_update_checkin ON public.tickets;
CREATE POLICY tickets_update_checkin ON public.tickets
  FOR UPDATE USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.events e
       WHERE e.id = tickets.event_id
         AND (
           e.owner_id = auth.uid()
           OR (
             e.organization_id IS NOT NULL
             AND public.has_org_permission(
                   auth.uid(),
                   e.organization_id,
                   ARRAY['operations']::text[]
                 )
           )
         )
    )
  );

-- ============================================
-- events: separar operações por papel funcional
-- INSERT/UPDATE → operations + owner
-- DELETE → somente owner (ou admin via events_delete_admin)
-- ============================================
DROP POLICY IF EXISTS events_insert_org_or_admin ON public.events;
CREATE POLICY events_insert_org_or_admin ON public.events
  FOR INSERT WITH CHECK (
    public.is_admin(auth.uid())
    OR auth.uid() = owner_id
    OR (
      organization_id IS NOT NULL
      AND public.has_org_permission(
            auth.uid(),
            organization_id,
            ARRAY['operations']::text[]
          )
    )
  );

DROP POLICY IF EXISTS events_update_org_or_admin ON public.events;
CREATE POLICY events_update_org_or_admin ON public.events
  FOR UPDATE USING (
    public.is_admin(auth.uid())
    OR auth.uid() = owner_id
    OR (
      organization_id IS NOT NULL
      AND public.has_org_permission(
            auth.uid(),
            organization_id,
            ARRAY['operations']::text[]
          )
    )
  );

-- DELETE: somente owner da org ou admin global
DROP POLICY IF EXISTS events_delete_org_or_admin ON public.events;
CREATE POLICY events_delete_org_or_admin ON public.events
  FOR DELETE USING (
    public.is_admin(auth.uid())
    OR (
      organization_id IS NOT NULL
      AND public.is_org_owner(auth.uid(), organization_id)
    )
  );

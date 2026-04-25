-- Pedidos de cancelamento/reembolso de inscrições já confirmadas. O admin processa
-- manualmente (verificar pagamento, fazer estorno no Asaas se aplicável, marcar
-- inscription como cancelled).

CREATE TABLE IF NOT EXISTS public.cancellation_requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inscription_id bigint NOT NULL REFERENCES public.inscriptions(id) ON DELETE CASCADE,
  reason text,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected | refunded
  admin_notes text,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cancellation_requests_inscription
  ON public.cancellation_requests(inscription_id);

CREATE INDEX IF NOT EXISTS idx_cancellation_requests_status
  ON public.cancellation_requests(status);

ALTER TABLE public.cancellation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cancellation_requests_admin_all" ON public.cancellation_requests
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "cancellation_requests_insert_public" ON public.cancellation_requests
  FOR INSERT WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.cancellation_requests_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cancellation_requests_updated_at
  BEFORE UPDATE ON public.cancellation_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.cancellation_requests_set_updated_at();

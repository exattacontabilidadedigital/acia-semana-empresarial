-- Fila de e-mails para retry assíncrono. Quando o SMTP falha, persistimos a mensagem
-- em vez de perder. Um cron job processa periodicamente os pendentes.

CREATE TABLE IF NOT EXISTS public.email_queue (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  to_address text NOT NULL,
  subject text NOT NULL,
  html text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | sent | failed
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  last_error text,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  context text, -- ex.: 'confirmation:SE-12345' (apenas para debug)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_email_queue_pending
  ON public.email_queue(next_attempt_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_queue_status
  ON public.email_queue(status);

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- Apenas service role acessa
CREATE POLICY "email_queue_service_only" ON public.email_queue
  FOR ALL USING (false);

-- Trigger pra updated_at
CREATE OR REPLACE FUNCTION public.email_queue_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_queue_updated_at
  BEFORE UPDATE ON public.email_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.email_queue_set_updated_at();

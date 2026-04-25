-- Adiciona event_id à tabela webhook_events para deduplicar webhooks reenviados
-- pelo Asaas. O Asaas envia o mesmo evento várias vezes em caso de timeout/falha de
-- entrega, e sem essa proteção podíamos criar tickets duplicados.

ALTER TABLE public.webhook_events
  ADD COLUMN IF NOT EXISTS event_id text;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_webhook_events_event_id
  ON public.webhook_events(event_id)
  WHERE event_id IS NOT NULL;

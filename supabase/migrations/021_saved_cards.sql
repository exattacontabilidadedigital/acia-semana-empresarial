-- Cartões tokenizados pelo Asaas para pagamento 1-clique. Não armazenamos PAN/CVV;
-- só o token opaco do gateway, a marca e os últimos 4 dígitos para exibição.

CREATE TABLE IF NOT EXISTS public.saved_cards (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cpf text NOT NULL,
  asaas_customer_id text NOT NULL,
  asaas_token text NOT NULL,
  brand text,
  last4 text,
  holder_name text,
  expiry_month text,
  expiry_year text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  UNIQUE(cpf, asaas_token)
);

CREATE INDEX IF NOT EXISTS idx_saved_cards_cpf ON public.saved_cards(cpf);

ALTER TABLE public.saved_cards ENABLE ROW LEVEL SECURITY;

-- Apenas service role acessa (lookup é via API com CPF informado pelo titular)
CREATE POLICY "saved_cards_service_only" ON public.saved_cards
  FOR ALL USING (false);

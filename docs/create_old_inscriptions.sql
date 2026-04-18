-- Tabela para dados históricos de inscrições 2025
CREATE TABLE IF NOT EXISTS old_inscriptions (
  id SERIAL PRIMARY KEY,
  original_id INTEGER,
  created_at TIMESTAMPTZ,
  nome TEXT NOT NULL,
  telefone TEXT,
  cpf TEXT NOT NULL,
  email TEXT,
  bairro TEXT,
  cidade TEXT,
  nome_empresa TEXT,
  cargo TEXT,
  quantity INTEGER DEFAULT 1,
  payment_status TEXT,
  payment_id TEXT,
  payment_url TEXT,
  order_number TEXT,
  total_amount NUMERIC DEFAULT 0,
  evento_nome TEXT
);

-- Índice para busca rápida por CPF
CREATE INDEX IF NOT EXISTS idx_old_inscriptions_cpf ON old_inscriptions (cpf);

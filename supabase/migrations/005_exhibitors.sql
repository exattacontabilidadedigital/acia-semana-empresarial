-- Tabela de expositores da feira multisetorial
CREATE TABLE IF NOT EXISTS public.exhibitors (
  id serial PRIMARY KEY,
  company_name text NOT NULL,
  cnpj text,
  responsible_name text NOT NULL,
  responsible_role text,
  email text NOT NULL,
  phone text NOT NULL,
  segment text NOT NULL,
  description text,
  stand_size text DEFAULT 'indefinido',
  logo_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  admin_notes text,
  stand_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_exhibitors_status ON public.exhibitors(status);
CREATE INDEX idx_exhibitors_email ON public.exhibitors(email);

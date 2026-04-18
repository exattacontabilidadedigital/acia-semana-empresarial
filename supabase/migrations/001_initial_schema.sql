-- ============================================
-- Semana Empresarial de Açailândia - Schema
-- ============================================

-- TABELA: events
CREATE TABLE IF NOT EXISTS public.events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  event_date date NOT NULL,
  start_time time NOT NULL,
  end_time time,
  location text,
  capacity integer DEFAULT 0,
  price numeric(10,2) DEFAULT 0.00,
  half_price numeric(10,2) DEFAULT 0.00,
  image_url text,
  status text DEFAULT 'active',
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABELA: coupons (must exist before inscriptions for FK)
CREATE TABLE IF NOT EXISTS public.coupons (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
  discount_value numeric(10,2) NOT NULL DEFAULT 0,
  max_uses integer,
  current_uses integer DEFAULT 0,
  valid_from timestamptz,
  valid_until timestamptz,
  active boolean DEFAULT true,
  event_id bigint REFERENCES public.events(id),
  created_at timestamptz DEFAULT now()
);

-- TABELA: inscriptions
CREATE TABLE IF NOT EXISTS public.inscriptions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id bigint NOT NULL REFERENCES public.events(id),
  user_id uuid REFERENCES auth.users(id),
  order_number text UNIQUE,
  nome text NOT NULL,
  email text NOT NULL,
  cpf text NOT NULL,
  telefone text NOT NULL,
  nome_empresa text,
  cargo text,
  cep text,
  rua text,
  numero text,
  bairro text,
  cidade text,
  estado text,
  complemento text,
  quantity integer DEFAULT 1,
  total_amount numeric(10,2) DEFAULT 0.00,
  net_amount numeric(10,2) DEFAULT 0.00,
  payment_status text DEFAULT 'pending',
  payment_id text,
  payment_url text,
  asaas_customer_id text,
  coupon_id bigint REFERENCES public.coupons(id),
  qr_code text,
  accepted_terms boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABELA: tickets
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id bigint NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  inscription_id bigint NOT NULL REFERENCES public.inscriptions(id),
  participant_name text NOT NULL,
  status text DEFAULT 'active',
  checked_in_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- TABELA: user_profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABELA: roles
CREATE TABLE IF NOT EXISTS public.roles (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE
);

-- Insert default roles
INSERT INTO public.roles (name) VALUES ('admin'), ('partner'), ('user')
ON CONFLICT (name) DO NOTHING;

-- TABELA: users_roles
CREATE TABLE IF NOT EXISTS public.users_roles (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id bigint NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  UNIQUE(user_id, role_id)
);

-- TABELA: payment_logs
CREATE TABLE IF NOT EXISTS public.payment_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inscription_id bigint REFERENCES public.inscriptions(id),
  payment_id text,
  status text NOT NULL,
  raw_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- TABELA: webhook_events
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type text NOT NULL,
  payment_id text,
  raw_body jsonb,
  processed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- TABELA: partners
CREATE TABLE IF NOT EXISTS public.partners (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  organization_name text NOT NULL,
  logo_url text,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events(category);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_owner ON public.events(owner_id);

CREATE INDEX IF NOT EXISTS idx_inscriptions_event ON public.inscriptions(event_id);
CREATE INDEX IF NOT EXISTS idx_inscriptions_cpf ON public.inscriptions(cpf);
CREATE INDEX IF NOT EXISTS idx_inscriptions_email ON public.inscriptions(email);
CREATE INDEX IF NOT EXISTS idx_inscriptions_status ON public.inscriptions(payment_status);
CREATE INDEX IF NOT EXISTS idx_inscriptions_order ON public.inscriptions(order_number);

CREATE INDEX IF NOT EXISTS idx_tickets_event ON public.tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_inscription ON public.tickets(inscription_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);

CREATE INDEX IF NOT EXISTS idx_users_roles_user ON public.users_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_partners_user ON public.partners(user_id);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = $1 AND r.name = 'admin'
  );
$$;

-- Helper function: check if user owns event
CREATE OR REPLACE FUNCTION public.is_event_owner(user_id uuid, event_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = $2 AND e.owner_id = $1
  );
$$;

-- EVENTS policies
CREATE POLICY "events_select_public" ON public.events
  FOR SELECT USING (status = 'active');

CREATE POLICY "events_select_owner" ON public.events
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "events_select_admin" ON public.events
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "events_insert_admin" ON public.events
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()) OR auth.uid() = owner_id);

CREATE POLICY "events_update_owner_admin" ON public.events
  FOR UPDATE USING (auth.uid() = owner_id OR public.is_admin(auth.uid()));

CREATE POLICY "events_delete_admin" ON public.events
  FOR DELETE USING (public.is_admin(auth.uid()));

-- INSCRIPTIONS policies
CREATE POLICY "inscriptions_insert_public" ON public.inscriptions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "inscriptions_select_admin" ON public.inscriptions
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "inscriptions_select_owner" ON public.inscriptions
  FOR SELECT USING (
    public.is_event_owner(auth.uid(), event_id)
  );

CREATE POLICY "inscriptions_update_admin" ON public.inscriptions
  FOR UPDATE USING (public.is_admin(auth.uid()));

-- TICKETS policies
CREATE POLICY "tickets_select_admin" ON public.tickets
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "tickets_select_owner" ON public.tickets
  FOR SELECT USING (
    public.is_event_owner(auth.uid(), event_id)
  );

CREATE POLICY "tickets_insert_service" ON public.tickets
  FOR INSERT WITH CHECK (true);

CREATE POLICY "tickets_update_checkin" ON public.tickets
  FOR UPDATE USING (
    public.is_admin(auth.uid()) OR public.is_event_owner(auth.uid(), event_id)
  );

-- COUPONS policies
CREATE POLICY "coupons_select_active" ON public.coupons
  FOR SELECT USING (active = true);

CREATE POLICY "coupons_select_admin" ON public.coupons
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "coupons_crud_admin" ON public.coupons
  FOR ALL USING (public.is_admin(auth.uid()));

-- USER_PROFILES policies
CREATE POLICY "profiles_select_own" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_select_admin" ON public.user_profiles
  FOR SELECT USING (public.is_admin(auth.uid()));

-- ROLES policies
CREATE POLICY "roles_select_public" ON public.roles
  FOR SELECT USING (true);

-- USERS_ROLES policies
CREATE POLICY "users_roles_select_own" ON public.users_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_roles_select_admin" ON public.users_roles
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "users_roles_crud_admin" ON public.users_roles
  FOR ALL USING (public.is_admin(auth.uid()));

-- PAYMENT_LOGS policies
CREATE POLICY "payment_logs_select_admin" ON public.payment_logs
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "payment_logs_insert_service" ON public.payment_logs
  FOR INSERT WITH CHECK (true);

-- WEBHOOK_EVENTS policies
CREATE POLICY "webhook_events_select_admin" ON public.webhook_events
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "webhook_events_insert_service" ON public.webhook_events
  FOR INSERT WITH CHECK (true);

-- PARTNERS policies
CREATE POLICY "partners_select_own" ON public.partners
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "partners_select_admin" ON public.partners
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "partners_crud_admin" ON public.partners
  FOR ALL USING (public.is_admin(auth.uid()));

-- ============================================
-- TRIGGERS: auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER inscriptions_updated_at
  BEFORE UPDATE ON public.inscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- FUNCTION: auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');

  -- Assign default 'user' role
  INSERT INTO public.users_roles (user_id, role_id)
  SELECT NEW.id, r.id FROM public.roles r WHERE r.name = 'user';

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Catálogo de Stands da Feira Multisetorial 2026
-- Baseado na planta "STANDS 2025.pdf" (docs/)
-- ============================================

CREATE TABLE IF NOT EXISTS public.stands (
  id serial PRIMARY KEY,
  number text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('blue', 'premium', 'gastro', 'external')),
  size text NOT NULL DEFAULT '3x2m',
  price numeric(10,2) NOT NULL DEFAULT 1710.00,
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'reserved', 'sold', 'blocked')),
  exhibitor_id integer REFERENCES public.exhibitors(id) ON DELETE SET NULL,
  pos_x integer NOT NULL,
  pos_y integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stands_status ON public.stands(status);
CREATE INDEX IF NOT EXISTS idx_stands_type ON public.stands(type);
CREATE INDEX IF NOT EXISTS idx_stands_exhibitor ON public.stands(exhibitor_id);

-- Coordenadas em grid 30 cols x 22 linhas (pos_y=1 no fundo, pos_y=22 no topo)
-- Seed idempotente via UPSERT para permitir reposicionamento

INSERT INTO public.stands (number, type, pos_x, pos_y) VALUES
-- Coluna vertical esquerda (01-04) junto à credenciamento, abaixo da entrada
('01', 'blue', 6, 3),
('02', 'blue', 6, 4),
('03', 'blue', 6, 5),
('04', 'blue', 6, 6),

-- Coluna vertical esquerda (29-31) acima da entrada
('29', 'blue', 6, 15),
('30', 'blue', 6, 16),
('31', 'blue', 6, 17),

-- Linha inferior esquerda (05-08)
('05', 'blue', 8, 2),
('06', 'blue', 9, 2),
('07', 'blue', 10, 2),
('08', 'blue', 11, 2),

-- Ilha L1 (09-16): 3x2 com 09-11 no sul e 14-16 no norte
('09', 'blue', 8, 4),
('10', 'blue', 9, 4),
('11', 'blue', 10, 4),
('14', 'blue', 8, 5),
('15', 'blue', 9, 5),
('16', 'blue', 10, 5),

-- Singles direita de L1
('12', 'blue', 11, 4),
('13', 'blue', 11, 5),

-- Ilha L2 (18-24): 18-20 sul, 22-24 norte
('18', 'blue', 8, 7),
('19', 'blue', 9, 7),
('20', 'blue', 10, 7),
('22', 'blue', 8, 8),
('23', 'blue', 9, 8),
('24', 'blue', 10, 8),

-- Singles direita de L2
('17', 'blue', 11, 7),
('21', 'blue', 11, 8),

-- Stands PREMIUM 25-28 (2x2 centro, junto ao palco)
('25', 'premium', 13, 10),
('27', 'premium', 14, 10),
('26', 'premium', 13, 11),
('28', 'premium', 14, 11),

-- Ilha L3 (32-38): 32-34 sul, 36-38 norte
('32', 'blue', 8, 13),
('33', 'blue', 9, 13),
('34', 'blue', 10, 13),
('36', 'blue', 8, 14),
('37', 'blue', 9, 14),
('38', 'blue', 10, 14),

-- Singles direita de L3
('35', 'blue', 11, 13),
('39', 'blue', 11, 14),

-- Ilha L4 (40-46): 40-42 sul, 44-46 norte
('40', 'blue', 8, 16),
('41', 'blue', 9, 16),
('42', 'blue', 10, 16),
('44', 'blue', 8, 17),
('45', 'blue', 9, 17),
('46', 'blue', 10, 17),

-- Single direita de L4
('43', 'blue', 11, 17),

-- Linha superior esquerda (47-50)
('47', 'blue', 8, 18),
('48', 'blue', 9, 18),
('49', 'blue', 10, 18),
('50', 'blue', 11, 18),

-- Coluna vertical direita (51-54) à esquerda de R1/R2
('51', 'blue', 20, 4),
('52', 'blue', 20, 5),
('53', 'blue', 20, 7),
('54', 'blue', 20, 8),

-- Linha inferior direita (55-58)
('55', 'blue', 22, 2),
('56', 'blue', 23, 2),
('57', 'blue', 24, 2),
('58', 'blue', 25, 2),

-- Coluna vertical direita-extrema (59-62) à direita de R1/R2
('59', 'blue', 26, 4),
('60', 'blue', 26, 5),
('61', 'blue', 26, 7),
('62', 'blue', 26, 8),

-- Ilha R1 (63-68): 63-65 sul, 66-68 norte
('63', 'blue', 21, 4),
('64', 'blue', 22, 4),
('65', 'blue', 23, 4),
('66', 'blue', 21, 5),
('67', 'blue', 22, 5),
('68', 'blue', 23, 5),

-- Ilha R2 (69-74): 69-71 sul, 72-74 norte
('69', 'blue', 21, 7),
('70', 'blue', 22, 7),
('71', 'blue', 23, 7),
('72', 'blue', 21, 8),
('73', 'blue', 22, 8),
('74', 'blue', 23, 8),

-- Ilha R3 (75-80): altura do palco, 75-77 sul, 78-80 norte
('75', 'blue', 21, 10),
('76', 'blue', 22, 10),
('77', 'blue', 23, 10),
('78', 'blue', 21, 11),
('79', 'blue', 22, 11),
('80', 'blue', 23, 11),

-- Ilha R4 (81-86): 81-83 sul, 84-86 norte
('81', 'blue', 21, 13),
('82', 'blue', 22, 13),
('83', 'blue', 23, 13),
('84', 'blue', 21, 14),
('85', 'blue', 22, 14),
('86', 'blue', 23, 14),

-- Singles esquerda de R4/R5 (87-89)
('87', 'blue', 20, 13),
('88', 'blue', 20, 14),
('89', 'blue', 20, 15),

-- Ilha R5 (90-95): 90-92 sul, 93-95 norte
('90', 'blue', 21, 16),
('91', 'blue', 22, 16),
('92', 'blue', 23, 16),
('93', 'blue', 21, 17),
('94', 'blue', 22, 17),
('95', 'blue', 23, 17),

-- Linha superior direita (96-99)
('96', 'blue', 21, 18),
('97', 'blue', 22, 18),
('98', 'blue', 23, 18),
('99', 'blue', 24, 18),

-- Coluna vertical extrema-direita superior (100-103)
('100', 'blue', 26, 14),
('101', 'blue', 26, 15),
('102', 'blue', 26, 16),
('103', 'blue', 26, 17),

-- Espaço Gastronômico (P01-P08)
('P01', 'gastro', 29, 3),
('P02', 'gastro', 29, 5),
('P03', 'gastro', 29, 7),
('P04', 'gastro', 29, 9),
('P05', 'gastro', 29, 11),
('P06', 'gastro', 29, 13),
('P07', 'gastro', 29, 15),
('P08', 'gastro', 29, 17)
ON CONFLICT (number) DO UPDATE SET
  pos_x = EXCLUDED.pos_x,
  pos_y = EXCLUDED.pos_y,
  type = EXCLUDED.type;

-- Remove stands 104-106 (não existem no layout definitivo da planta)
DELETE FROM public.stands WHERE number IN ('104', '105', '106');

-- Tamanho específico gastronomia
UPDATE public.stands SET size = '3x3m' WHERE type = 'gastro';

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.stands_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stands_updated_at ON public.stands;
CREATE TRIGGER stands_updated_at
  BEFORE UPDATE ON public.stands
  FOR EACH ROW
  EXECUTE FUNCTION public.stands_set_updated_at();

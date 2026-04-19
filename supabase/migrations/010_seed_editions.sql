-- ============================================
-- 010: Seed das 5 edições anteriores (2019-2025)
-- ============================================
-- Idempotente via ON CONFLICT (year). Pode rodar quantas vezes quiser —
-- repete-rodar atualiza textos/stats mas preserva press_kit_url se já
-- foi customizado pelo admin.
-- ============================================

INSERT INTO public.editions
  (year, ordinal, title, description, color, stats, status, order_index, press_kit_url)
VALUES
  (
    2019,
    '1ª',
    'Primeira edição',
    'O ponto zero. Nasce em Açailândia o compromisso de reunir empresas e poder público num só calendário.',
    'var(--ciano)',
    '[["1.200","participantes"],["24","expositores"],["R$ 420 mil","em negócios"]]'::jsonb,
    'published',
    1,
    NULL
  ),
  (
    2021,
    '2ª',
    'Retomada pós-pandemia',
    'Após um ano de hiato pela pandemia, a semana volta ampliada: a feira dobra de tamanho e a Rodada de Negócios vira protagonista.',
    'var(--verde)',
    '[["2.800","participantes"],["42","expositores"],["R$ 1,2 mi","em negócios"]]'::jsonb,
    'published',
    2,
    NULL
  ),
  (
    2023,
    '3ª',
    'Entrada do mutirão de crédito',
    'Bancos de fomento presentes na semana, linhas específicas para pequenos negócios da região.',
    'var(--laranja)',
    '[["4.100","participantes"],["58","expositores"],["R$ 2,4 mi","em negócios"]]'::jsonb,
    'published',
    3,
    NULL
  ),
  (
    2024,
    '4ª',
    'Talk Mulheres estreia',
    'Liderança feminina ganha dia próprio. A semana vira território de representatividade.',
    'var(--azul)',
    '[["5.600","participantes"],["68","expositores"],["R$ 3,8 mi","em negócios"]]'::jsonb,
    'published',
    4,
    NULL
  ),
  (
    2025,
    '5ª',
    'Recorde histórico',
    '7.200 participantes, +1.000 empresas, R$ 5,29 milhões em negócios imediatos. A maior feira multissetorial do sudoeste maranhense.',
    'var(--laranja)',
    '[["7.200","participantes"],["80","expositores"],["R$ 5,29 mi","em negócios"]]'::jsonb,
    'published',
    5,
    '/docs/relatorio-semana-empresarial-2025.pdf'
  )
ON CONFLICT (year) DO UPDATE SET
  ordinal = EXCLUDED.ordinal,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  stats = EXCLUDED.stats,
  status = EXCLUDED.status,
  order_index = EXCLUDED.order_index,
  press_kit_url = COALESCE(public.editions.press_kit_url, EXCLUDED.press_kit_url),
  updated_at = now();

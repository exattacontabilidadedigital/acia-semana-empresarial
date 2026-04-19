-- Reagendamento dos eventos da 6ª edição: setembro/2026 -> agosto/2026
-- Mapeamento: 07-12/09 -> 17-22/08 (mantém horários e durações)
--
-- Como rodar:
--   1) Painel Supabase (kthtwwuikeevwoydtjuf) -> SQL Editor -> New query
--   2) Cole este arquivo inteiro e execute
--   3) Confira no fim que cada linha do SELECT bate com o esperado
--
-- Idempotente: se já estiver em agosto, não muda nada.

BEGIN;

UPDATE events SET event_date = '2026-08-17' WHERE event_date = '2026-09-07';
UPDATE events SET event_date = '2026-08-18' WHERE event_date = '2026-09-08';
UPDATE events SET event_date = '2026-08-19' WHERE event_date = '2026-09-09';
UPDATE events SET event_date = '2026-08-20' WHERE event_date = '2026-09-10';
UPDATE events SET event_date = '2026-08-21' WHERE event_date = '2026-09-11';
UPDATE events SET event_date = '2026-08-22' WHERE event_date = '2026-09-12';

-- Verificação (deve mostrar 12 linhas, todas em 2026-08-17 a 2026-08-22)
SELECT id, title, event_date, start_time, status
FROM events
WHERE status = 'active'
ORDER BY event_date, start_time;

COMMIT;

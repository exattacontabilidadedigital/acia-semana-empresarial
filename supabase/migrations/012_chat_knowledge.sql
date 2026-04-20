-- ============================================
-- 012: Base de conhecimento da assistente de chat (Aci)
-- ============================================
-- Tabela editável via /admin/chat-conhecimento, lida pelo chat IA
-- via tools `search_faq` e `list_faq_topics`.
-- ============================================

CREATE TABLE IF NOT EXISTS public.chat_knowledge (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category text NOT NULL CHECK (category IN ('faq','venue','policy','how_it_works','other')),
  question text NOT NULL,
  answer text NOT NULL,
  keywords text[],
  edition_id bigint REFERENCES public.editions(id) ON DELETE SET NULL,
  order_index integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_chat_knowledge_active_cat
  ON public.chat_knowledge(active, category, order_index);
CREATE INDEX IF NOT EXISTS idx_chat_knowledge_keywords
  ON public.chat_knowledge USING gin(keywords);

DROP TRIGGER IF EXISTS chat_knowledge_touch_updated_at ON public.chat_knowledge;
CREATE TRIGGER chat_knowledge_touch_updated_at
  BEFORE UPDATE ON public.chat_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.chat_knowledge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_knowledge_select_public ON public.chat_knowledge;
CREATE POLICY chat_knowledge_select_public ON public.chat_knowledge FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS chat_knowledge_admin_all ON public.chat_knowledge;
CREATE POLICY chat_knowledge_admin_all ON public.chat_knowledge FOR ALL
  USING (public.is_admin(auth.uid()));

-- ============================================
-- SEED inicial — cobre os principais "knowledge gaps"
-- (idempotente: só insere se a question ainda não existir)
-- ============================================
INSERT INTO public.chat_knowledge (category, question, answer, keywords, order_index)
SELECT * FROM (VALUES

  ('faq',
   'Tem certificado de participação?',
   'Sim. Os participantes confirmados nos eventos com check-in receberão certificado digital por email após o encerramento da Semana Empresarial. Para garantir o certificado, é necessário ter feito check-in com o QR Code do ingresso na entrada do evento.',
   ARRAY['certificado','certificacao','participacao','diploma'],
   10),

  ('faq',
   'Posso levar acompanhante?',
   'Cada inscrição dá direito a um acesso individual. Se quiser levar alguém, faça uma inscrição separada para o acompanhante (ele entra no carrinho e paga junto). Para eventos gratuitos, é só repetir o cadastro com o CPF da outra pessoa.',
   ARRAY['acompanhante','convidado','dois','plus one'],
   20),

  ('faq',
   'Vai ter transmissão ao vivo dos eventos?',
   'Algumas palestras serão transmitidas ao vivo pelo Instagram da ACIA (@aciaacailandia). A programação de transmissão será divulgada na semana do evento. Os ingressos físicos continuam dando direito ao certificado e à interação presencial — a transmissão é complementar.',
   ARRAY['transmissao','live','ao vivo','streaming','online'],
   30),

  ('faq',
   'Como obtenho credencial de imprensa?',
   'Profissionais de imprensa devem solicitar credenciamento por email para acia.aca@gmail.com com nome do veículo, link do registro profissional/MTB e período de cobertura desejado, com pelo menos 5 dias de antecedência.',
   ARRAY['imprensa','jornalista','credencial','press','reporter'],
   40),

  ('venue',
   'Qual o endereço completo do evento?',
   'A maior parte dos eventos da Semana Empresarial 2026 acontece no centro de Açailândia/MA. O endereço específico de cada palestra/oficina/feira aparece no campo "Local" da página do evento. A feira de exposição multissetorial é montada no espaço central do evento — divulgaremos o endereço exato dos pavilhões em julho.',
   ARRAY['endereco','local','onde','localizacao','lugar'],
   10),

  ('venue',
   'Tem estacionamento no local?',
   'Sim. O espaço da feira terá estacionamento próprio gratuito durante todos os dias do evento. Para palestras em auditórios externos, a sinalização será divulgada junto da confirmação da inscrição. Recomendamos chegar com 20 minutos de antecedência.',
   ARRAY['estacionamento','carro','vaga','parking'],
   20),

  ('venue',
   'O local tem acessibilidade?',
   'Sim. Os espaços da Semana Empresarial 2026 contam com rampas de acesso, banheiros adaptados e vagas de estacionamento PCD demarcadas. Caso precise de qualquer atendimento específico (intérprete de Libras, audiodescrição, etc.) entre em contato com antecedência por acia.aca@gmail.com ou WhatsApp +55 99 98833-4432.',
   ARRAY['acessibilidade','pcd','cadeirante','rampa','libras','deficiencia'],
   30),

  ('policy',
   'Quais formas de pagamento são aceitas?',
   'Aceitamos PIX, boleto bancário e cartão de crédito (com possibilidade de parcelamento, conforme regras do processador). O pagamento é processado via Asaas (link gerado no momento da compra). PIX e cartão confirmam na hora; boleto pode levar até 2 dias úteis.',
   ARRAY['pagamento','pix','boleto','cartao','credito','parcelar'],
   10),

  ('policy',
   'Tem política de reembolso?',
   'Em regra, não há reembolso após a confirmação do pagamento. Exceções: (1) cancelamento do evento pelas Organizadoras, com reembolso integral; (2) situações excepcionais analisadas caso a caso. Antes do pagamento, você pode cancelar a inscrição livremente em "Minhas inscrições". Detalhes completos no /termos.',
   ARRAY['reembolso','devolucao','cancelar','refund','dinheiro de volta'],
   20),

  ('policy',
   'Como funciona a meia-entrada?',
   'A meia-entrada é destinada a estudantes, professores da rede pública, idosos (60+) e pessoas com deficiência, conforme legislação. Vagas com meia-entrada são limitadas por evento (até 50% da capacidade). Você precisa apresentar documento comprobatório no check-in — sem o documento, é cobrada a diferença para a inteira.',
   ARRAY['meia entrada','meia-entrada','estudante','idoso','desconto','meia'],
   30),

  ('policy',
   'Tenho cupom de desconto, como uso?',
   'No carrinho, em cada item, há um campo "Cupom de desconto" — digite o código e clique "Aplicar". Cupons restritos a associados ACIA pedem o CNPJ da empresa para validação. Cupons inválidos, expirados ou que já atingiram o limite serão recusados na hora.',
   ARRAY['cupom','desconto','codigo','associado','voucher'],
   40),

  ('how_it_works',
   'Como funciona a Rodada de Negócios?',
   'É um espaço estruturado de encontros pré-agendados entre compradores e fornecedores. Você se cadastra como comprador OU fornecedor, indica seu segmento, e a organização monta uma agenda de reuniões rápidas (10-15 min) com matches relevantes. Em 2025 movimentou R$ 5,29 milhões em negócios. Inscrições para a rodada são gratuitas, mas exigem cadastro prévio.',
   ARRAY['rodada de negocios','rodada','negocios','networking','match','b2b'],
   10),

  ('how_it_works',
   'Como funciona a Rodada de Crédito?',
   'Bancos públicos, cooperativas e instituições de fomento ficam presentes com mesas de atendimento durante a Semana. Você leva os documentos da empresa, conversa diretamente com o gerente sobre linhas de crédito disponíveis (capital de giro, investimento, microcrédito) e pode iniciar a análise na hora. Em 2025 mobilizou mais de R$ 1 milhão em crédito.',
   ARRAY['rodada de credito','credito','financiamento','banco','emprestimo','sebrae'],
   20),

  ('how_it_works',
   'Como faço para me inscrever em um evento?',
   'É bem simples: (1) acesse /inscricoes, (2) escolha o evento que quer participar, (3) clique em "Inscrever" e adicione ao carrinho, (4) preencha seus dados (CPF, email, telefone), (5) finalize o pagamento (eventos gratuitos pulam essa etapa). O ingresso com QR Code é enviado por email assim que o pagamento é confirmado.',
   ARRAY['inscrever','inscricao','como me inscrevo','comprar ingresso','registrar'],
   30),

  ('how_it_works',
   'Onde vejo a programação completa?',
   'A programação completa fica em /inscricoes — todos os eventos liberados para inscrição com data, horário, local, vagas e preço. Você também pode pedir aqui no chat ("liste eventos disponíveis", "eventos do dia X", "quais eventos gratuitos"). A programação por dia também aparece na home, na seção "Programação 2026".',
   ARRAY['programacao','agenda','horarios','quando','grade'],
   40)

) AS s(category, question, answer, keywords, order_index)
WHERE NOT EXISTS (
  SELECT 1 FROM public.chat_knowledge WHERE chat_knowledge.question = s.question
);

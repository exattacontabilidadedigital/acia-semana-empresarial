-- ============================================
-- 011: Documentos legais (termos / privacidade) editáveis
-- ============================================
-- Move o conteúdo hardcoded de /termos e /privacidade pra banco,
-- permitindo edição via /admin/legal.
-- ============================================

CREATE TABLE IF NOT EXISTS public.legal_documents (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text NOT NULL UNIQUE CHECK (slug IN ('terms','privacy')),
  title text NOT NULL,
  eyebrow text,
  last_revision text,                    -- "15 de março de 2026" (free-text label)
  intro text,                            -- subtítulo opcional
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.legal_document_sections (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id bigint NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
  number text,                           -- "01", "02"... (ou vazio)
  title text NOT NULL,
  body text NOT NULL DEFAULT '',         -- HTML simples (p, strong, a, ul, li)
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_sections_doc
  ON public.legal_document_sections(document_id, order_index);

-- Trigger updated_at no documento (ao editar seções, atualiza pai? não — só ao
-- editar o doc; mas o admin chama explicitamente)
DROP TRIGGER IF EXISTS legal_documents_touch_updated_at ON public.legal_documents;
CREATE TRIGGER legal_documents_touch_updated_at
  BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_document_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS legal_docs_select_public ON public.legal_documents;
CREATE POLICY legal_docs_select_public ON public.legal_documents FOR SELECT
  USING (true);

DROP POLICY IF EXISTS legal_docs_admin_all ON public.legal_documents;
CREATE POLICY legal_docs_admin_all ON public.legal_documents FOR ALL
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS legal_sections_select_public ON public.legal_document_sections;
CREATE POLICY legal_sections_select_public ON public.legal_document_sections FOR SELECT
  USING (true);

DROP POLICY IF EXISTS legal_sections_admin_all ON public.legal_document_sections;
CREATE POLICY legal_sections_admin_all ON public.legal_document_sections FOR ALL
  USING (public.is_admin(auth.uid()));

-- ============================================
-- SEED dos 2 documentos
-- ============================================
INSERT INTO public.legal_documents (slug, title, eyebrow, last_revision, intro)
VALUES
  ('terms', 'Termos de uso', 'DOCUMENTOS LEGAIS', '15 de março de 2026', NULL),
  ('privacy', 'Política de privacidade', 'DOCUMENTOS LEGAIS · LGPD', '15 de março de 2026', NULL)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- SEED das seções de TERMOS
-- ============================================
WITH doc AS (SELECT id FROM public.legal_documents WHERE slug = 'terms')
INSERT INTO public.legal_document_sections (document_id, number, title, body, order_index)
SELECT doc.id, x.number, x.title, x.body, x.ord
FROM doc, (VALUES
  (
    '01',
    'Identificação das organizadoras',
    '<p>A <strong>Semana Empresarial de Açailândia 2026</strong> é organizada pela <strong>Associação Comercial e Industrial de Açailândia (ACIA)</strong> e pelo <strong>Serviço Brasileiro de Apoio às Micro e Pequenas Empresas (SEBRAE)</strong>, doravante denominadas "Organizadoras".</p>',
    1
  ),
  (
    '02',
    'Aceitação dos termos',
    '<p>Ao se inscrever em qualquer evento da Semana Empresarial de Açailândia 2026, o participante declara que leu, compreendeu e concorda integralmente com estes Termos de Uso e com a <a href="/privacidade">Política de Privacidade e LGPD</a>.</p>',
    2
  ),
  (
    '03',
    'Inscrição e participação',
    '<p><strong>3.1.</strong> A inscrição nos eventos está sujeita à disponibilidade de vagas e, quando aplicável, à confirmação do pagamento.</p><p><strong>3.2.</strong> O participante se compromete a fornecer informações verdadeiras, completas e atualizadas no momento da inscrição.</p><p><strong>3.3.</strong> A inscrição é pessoal e intransferível, salvo autorização expressa das Organizadoras.</p><p><strong>3.4.</strong> As Organizadoras reservam-se o direito de cancelar, alterar datas, horários, local ou palestrantes dos eventos, com aviso prévio sempre que possível.</p>',
    3
  ),
  (
    '04',
    'Pagamento e cancelamento',
    '<p><strong>4.1.</strong> Eventos pagos devem ser quitados dentro do prazo indicado no ato da inscrição. Pagamentos não confirmados dentro do prazo poderão resultar no cancelamento automático da inscrição.</p><p><strong>4.2.</strong> O pagamento é processado pela plataforma <strong>Asaas</strong>, que aceita PIX, boleto bancário e cartão de crédito.</p><p><strong>4.3.</strong> Em caso de cancelamento por parte do participante, não haverá reembolso, salvo em situações excepcionais avaliadas pelas Organizadoras.</p><p><strong>4.4.</strong> Em caso de cancelamento do evento pelas Organizadoras, o valor pago será integralmente devolvido ao participante.</p>',
    4
  ),
  (
    '05',
    'Uso de dados pessoais',
    '<p><strong>5.1.</strong> Ao se inscrever, o participante autoriza expressamente que a <strong>ACIA</strong> e o <strong>SEBRAE</strong> utilizem seus dados pessoais (nome, e-mail, telefone e CPF) para as seguintes finalidades:</p><ul><li>Gestão e operação dos eventos (inscrição, credenciamento, emissão de ingressos);</li><li>Comunicação sobre os eventos da Semana Empresarial;</li><li><strong>Contato direto para oferta de produtos, serviços, cursos, consultorias e programas</strong> oferecidos pela ACIA e pelo SEBRAE;</li><li>Envio de informativos, newsletters, convites para eventos futuros e conteúdos relacionados ao empreendedorismo;</li><li>Pesquisas de satisfação e melhoria dos serviços;</li><li>Cumprimento de obrigações legais e regulatórias.</li></ul><p><strong>5.2.</strong> O participante poderá, a qualquer momento, solicitar a exclusão ou alteração de seus dados entrando em contato pelo e-mail <a href="mailto:acia.aca@gmail.com">acia.aca@gmail.com</a>.</p><p><strong>5.3.</strong> Para informações completas sobre o tratamento de dados, consulte nossa <a href="/privacidade">Política de Privacidade e LGPD</a>.</p>',
    5
  ),
  (
    '06',
    'Propriedade intelectual',
    '<p><strong>6.1.</strong> Todo o conteúdo apresentado nos eventos (palestras, materiais, apresentações) é de propriedade dos respectivos autores e palestrantes, sendo vedada a reprodução sem autorização.</p><p><strong>6.2.</strong> As Organizadoras poderão captar imagens e vídeos durante os eventos para divulgação institucional. Ao participar, o inscrito consente com o uso de sua imagem para fins promocionais vinculados à Semana Empresarial.</p>',
    6
  ),
  (
    '07',
    'Conduta do participante',
    '<p><strong>7.1.</strong> O participante compromete-se a manter conduta respeitosa durante os eventos.</p><p><strong>7.2.</strong> As Organizadoras reservam-se o direito de recusar ou retirar participantes que apresentem comportamento inadequado, sem direito a reembolso.</p>',
    7
  ),
  (
    '08',
    'Responsabilidade',
    '<p><strong>8.1.</strong> As Organizadoras não se responsabilizam por objetos pessoais perdidos ou danificados durante os eventos.</p><p><strong>8.2.</strong> A participação nos eventos é de inteira responsabilidade do inscrito, que deve zelar por sua saúde e segurança.</p>',
    8
  ),
  (
    '09',
    'Foro',
    '<p>Fica eleito o foro da Comarca de Açailândia/MA para dirimir quaisquer questões oriundas destes Termos de Uso, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>',
    9
  ),
  (
    '10',
    'Contato',
    '<p>Para dúvidas sobre estes termos, entre em contato:</p><ul><li><strong>ACIA</strong> — Associação Comercial e Industrial de Açailândia</li><li>E-mail: <a href="mailto:acia.aca@gmail.com">acia.aca@gmail.com</a></li><li>Telefone: <a href="tel:+5599988334432">+55 99 98833-4432</a></li></ul>',
    10
  )
) AS x(number, title, body, ord)
WHERE NOT EXISTS (
  SELECT 1 FROM public.legal_document_sections s WHERE s.document_id = doc.id
);

-- ============================================
-- SEED das seções de PRIVACIDADE
-- ============================================
WITH doc AS (SELECT id FROM public.legal_documents WHERE slug = 'privacy')
INSERT INTO public.legal_document_sections (document_id, number, title, body, order_index)
SELECT doc.id, x.number, x.title, x.body, x.ord
FROM doc, (VALUES
  (
    '01',
    'Introdução',
    '<p>Esta Política de Privacidade descreve como a <strong>Associação Comercial e Industrial de Açailândia (ACIA)</strong> e o <strong>Serviço Brasileiro de Apoio às Micro e Pequenas Empresas (SEBRAE)</strong> coletam, utilizam, armazenam e protegem os dados pessoais dos participantes da <strong>Semana Empresarial de Açailândia 2026</strong>, em conformidade com a <strong>Lei Geral de Proteção de Dados (Lei n.º 13.709/2018 — LGPD)</strong>.</p>',
    1
  ),
  (
    '02',
    'Controladores de dados',
    '<p>Os controladores dos dados pessoais coletados são:</p><ul><li><strong>ACIA</strong> — Associação Comercial e Industrial de Açailândia. E-mail: <a href="mailto:acia.aca@gmail.com">acia.aca@gmail.com</a> · Telefone: +55 99 98833-4432</li><li><strong>SEBRAE</strong> — Serviço Brasileiro de Apoio às Micro e Pequenas Empresas. Atuando como co-organizador e co-controlador dos dados coletados neste evento.</li></ul>',
    2
  ),
  (
    '03',
    'Dados coletados',
    '<p>Durante o processo de inscrição, coletamos os seguintes dados pessoais:</p><ul><li><strong>Identificação:</strong> nome completo, CPF</li><li><strong>Contato:</strong> e-mail, telefone</li><li><strong>Profissionais:</strong> nome da empresa, cargo (quando informados)</li><li><strong>Endereço:</strong> CEP, rua, número, bairro, cidade, estado, complemento (quando informados)</li><li><strong>Pagamento:</strong> informações da transação processadas pela plataforma Asaas (não armazenamos dados de cartão de crédito)</li></ul>',
    3
  ),
  (
    '04',
    'Finalidades do tratamento',
    '<p>Os dados pessoais coletados são utilizados para as seguintes finalidades:</p><p><strong>4.1. Execução do evento</strong></p><ul><li>Processamento e gestão de inscrições</li><li>Emissão de ingressos e credenciamento</li><li>Comunicação sobre horários, alterações e informações do evento</li><li>Controle de acesso e check-in via QR Code</li></ul><p><strong>4.2. Relacionamento e oferta de serviços</strong> — ao aceitar os termos de uso, o participante autoriza expressamente que a ACIA e o SEBRAE utilizem seus dados de contato para entrar em contato com ofertas de produtos/serviços, divulgar cursos, capacitações e programas, enviar newsletters e realizar pesquisas de satisfação.</p><p><strong>4.3. Obrigações legais</strong></p><ul><li>Cumprimento de obrigações fiscais e tributárias</li><li>Atendimento a requisições de autoridades competentes</li><li>Exercício regular de direitos em processos administrativos ou judiciais</li></ul>',
    4
  ),
  (
    '05',
    'Base legal',
    '<p>O tratamento dos dados pessoais fundamenta-se nas seguintes bases legais previstas na LGPD:</p><ul><li><strong>Consentimento (Art. 7º, I):</strong> para comunicações comerciais e oferta de produtos e serviços</li><li><strong>Execução de contrato (Art. 7º, V):</strong> para gestão da inscrição e participação no evento</li><li><strong>Legítimo interesse (Art. 7º, IX):</strong> para envio de informações relevantes sobre empreendedorismo e desenvolvimento empresarial</li><li><strong>Cumprimento de obrigação legal (Art. 7º, II):</strong> para obrigações fiscais e regulatórias</li></ul>',
    5
  ),
  (
    '06',
    'Compartilhamento de dados',
    '<p>Os dados pessoais poderão ser compartilhados com:</p><ul><li><strong>Entre ACIA e SEBRAE:</strong> como co-organizadores do evento</li><li><strong>Plataforma de pagamento (Asaas):</strong> exclusivamente para processamento de transações financeiras</li><li><strong>Prestadores de serviço:</strong> empresas contratadas para operacionalização do evento, sob obrigação de confidencialidade</li><li><strong>Autoridades públicas:</strong> quando exigido por lei ou determinação judicial</li></ul><p><strong>Não comercializamos</strong> dados pessoais com terceiros para fins de marketing externo.</p>',
    6
  ),
  (
    '07',
    'Armazenamento e segurança',
    '<p><strong>7.1.</strong> Os dados são armazenados em servidores seguros com criptografia e controle de acesso.</p><p><strong>7.2.</strong> Utilizamos a plataforma <strong>Supabase</strong> para armazenamento de dados, que implementa padrões de segurança de mercado.</p><p><strong>7.3.</strong> Os dados de pagamento são processados diretamente pela <strong>Asaas</strong>, certificada nos padrões PCI-DSS.</p><p><strong>7.4.</strong> Os dados serão mantidos pelo período necessário ao cumprimento das finalidades descritas ou conforme exigido por legislação aplicável.</p>',
    7
  ),
  (
    '08',
    'Direitos do titular',
    '<p>Conforme a LGPD, o participante tem direito a:</p><ul><li><strong>Confirmação e acesso:</strong> saber se seus dados são tratados e acessar seus dados</li><li><strong>Correção:</strong> solicitar correção de dados incompletos ou desatualizados</li><li><strong>Anonimização ou eliminação:</strong> solicitar anonimização ou eliminação de dados desnecessários</li><li><strong>Portabilidade:</strong> solicitar a transferência de dados a outro fornecedor</li><li><strong>Revogação do consentimento:</strong> retirar o consentimento a qualquer momento</li><li><strong>Oposição:</strong> opor-se ao tratamento de dados para finalidades com as quais não concorde</li><li><strong>Informação sobre compartilhamento:</strong> saber com quais entidades seus dados foram compartilhados</li></ul><p>Para exercer qualquer desses direitos, entre em contato pelo e-mail <a href="mailto:acia.aca@gmail.com">acia.aca@gmail.com</a> com o assunto <strong>"Direitos LGPD"</strong>. Responderemos em até 15 dias úteis.</p>',
    8
  ),
  (
    '09',
    'Cookies e tecnologias de rastreamento',
    '<p>Este site utiliza cookies essenciais para funcionamento da plataforma (autenticação, sessão). Não utilizamos cookies de rastreamento para publicidade de terceiros.</p>',
    9
  ),
  (
    '10',
    'Cancelamento de comunicações',
    '<p>O participante poderá, a qualquer momento, solicitar o cancelamento do recebimento de comunicações comerciais e promocionais enviando e-mail para <a href="mailto:acia.aca@gmail.com">acia.aca@gmail.com</a> com o assunto <strong>"Cancelar comunicações"</strong>.</p><p>O cancelamento das comunicações comerciais não afeta o envio de comunicações transacionais relacionadas a inscrições ativas.</p>',
    10
  ),
  (
    '11',
    'Alterações nesta política',
    '<p>Esta Política de Privacidade poderá ser atualizada periodicamente. Recomendamos a consulta regular desta página. Alterações significativas serão comunicadas por e-mail aos participantes cadastrados.</p>',
    11
  ),
  (
    '12',
    'Contato e encarregado de dados (DPO)',
    '<p>Para questões relacionadas à privacidade e proteção de dados:</p><ul><li><strong>ACIA</strong> — Associação Comercial e Industrial de Açailândia</li><li>E-mail: <a href="mailto:acia.aca@gmail.com">acia.aca@gmail.com</a></li><li>Telefone: <a href="tel:+5599988334432">+55 99 98833-4432</a></li><li>Açailândia — MA</li></ul>',
    12
  ),
  (
    '13',
    'Foro',
    '<p>Fica eleito o foro da Comarca de Açailândia/MA para dirimir quaisquer questões oriundas desta Política de Privacidade, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>',
    13
  )
) AS x(number, title, body, ord)
WHERE NOT EXISTS (
  SELECT 1 FROM public.legal_document_sections s WHERE s.document_id = doc.id
);

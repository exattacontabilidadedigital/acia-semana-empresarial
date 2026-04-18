import Link from 'next/link'

export const metadata = {
  title: 'Política de Privacidade e LGPD | Semana Empresarial de Açailândia 2026',
}

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-[#F5F5FA] py-8 md:py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-10">
          <h1 className="text-2xl md:text-3xl font-bold text-dark mb-2">Política de Privacidade e LGPD</h1>
          <p className="text-sm text-gray-400 mb-8">Última atualização: 15 de março de 2026</p>

          <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
            <section>
              <h2 className="text-lg font-bold text-dark mt-0">1. Introdução</h2>
              <p>
                Esta Política de Privacidade descreve como a <strong>Associação Comercial e Industrial de Açailândia (ACIA)</strong>{' '}
                e o <strong>Serviço Brasileiro de Apoio às Micro e Pequenas Empresas (SEBRAE)</strong>{' '}
                coletam, utilizam, armazenam e protegem os dados pessoais dos participantes da{' '}
                <strong>Semana Empresarial de Açailândia 2026</strong>, em conformidade com a{' '}
                <strong>Lei Geral de Proteção de Dados (Lei n.º 13.709/2018 — LGPD)</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-dark">2. Controladores de Dados</h2>
              <p>Os controladores dos dados pessoais coletados são:</p>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div>
                  <p className="font-semibold text-dark mb-1">ACIA — Associação Comercial e Industrial de Açailândia</p>
                  <p className="text-sm">E-mail: <a href="mailto:acia.aca@gmail.com" className="text-purple hover:underline">acia.aca@gmail.com</a></p>
                  <p className="text-sm">Telefone: +55 99 98833-4432</p>
                </div>
                <div>
                  <p className="font-semibold text-dark mb-1">SEBRAE — Serviço Brasileiro de Apoio às Micro e Pequenas Empresas</p>
                  <p className="text-sm">Atuando como co-organizador e co-controlador dos dados coletados neste evento.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-dark">3. Dados Coletados</h2>
              <p>Durante o processo de inscrição, coletamos os seguintes dados pessoais:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Dados de identificação:</strong> nome completo, CPF;</li>
                <li><strong>Dados de contato:</strong> e-mail, telefone;</li>
                <li><strong>Dados profissionais:</strong> nome da empresa, cargo (quando informados);</li>
                <li><strong>Dados de endereço:</strong> CEP, rua, número, bairro, cidade, estado, complemento (quando informados);</li>
                <li><strong>Dados de pagamento:</strong> informações da transação processadas pela plataforma Asaas (não armazenamos dados de cartão de crédito).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-dark">4. Finalidades do Tratamento</h2>
              <p>Os dados pessoais coletados são utilizados para as seguintes finalidades:</p>

              <h3 className="text-base font-semibold text-dark mt-4">4.1. Execução do Evento</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Processamento e gestão de inscrições;</li>
                <li>Emissão de ingressos e credenciamento;</li>
                <li>Comunicação sobre horários, alterações e informações do evento;</li>
                <li>Controle de acesso e check-in via QR Code.</li>
              </ul>

              <h3 className="text-base font-semibold text-dark mt-4">4.2. Relacionamento e Oferta de Serviços</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 my-3">
                <p className="text-sm font-semibold text-yellow-800 mb-2">Consentimento para comunicação comercial</p>
                <p className="text-sm text-yellow-700">
                  Ao aceitar os termos de uso no momento da inscrição, o participante <strong>autoriza expressamente</strong>{' '}
                  que a ACIA e o SEBRAE utilizem seus dados de contato (e-mail e telefone) para:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-yellow-700">
                  <li><strong>Entrar em contato</strong> para oferecer produtos e serviços;</li>
                  <li><strong>Divulgar cursos, consultorias, capacitações e programas</strong> do SEBRAE;</li>
                  <li><strong>Informar sobre benefícios, eventos e oportunidades</strong> oferecidos pela ACIA;</li>
                  <li><strong>Enviar newsletters, informativos e convites</strong> para eventos futuros;</li>
                  <li><strong>Realizar pesquisas de satisfação</strong> e levantamento de necessidades empresariais.</li>
                </ul>
              </div>

              <h3 className="text-base font-semibold text-dark mt-4">4.3. Obrigações Legais</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Cumprimento de obrigações fiscais e tributárias;</li>
                <li>Atendimento a requisições de autoridades competentes;</li>
                <li>Exercício regular de direitos em processos administrativos ou judiciais.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-dark">5. Base Legal</h2>
              <p>O tratamento dos dados pessoais fundamenta-se nas seguintes bases legais previstas na LGPD:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Consentimento (Art. 7º, I):</strong> para comunicações comerciais e oferta de produtos e serviços;</li>
                <li><strong>Execução de contrato (Art. 7º, V):</strong> para gestão da inscrição e participação no evento;</li>
                <li><strong>Legítimo interesse (Art. 7º, IX):</strong> para envio de informações relevantes sobre empreendedorismo e desenvolvimento empresarial;</li>
                <li><strong>Cumprimento de obrigação legal (Art. 7º, II):</strong> para obrigações fiscais e regulatórias.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-dark">6. Compartilhamento de Dados</h2>
              <p>Os dados pessoais poderão ser compartilhados com:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Entre ACIA e SEBRAE:</strong> como co-organizadores do evento, ambas as entidades têm acesso aos dados dos participantes para as finalidades descritas nesta política;</li>
                <li><strong>Plataforma de pagamento (Asaas):</strong> exclusivamente para processamento de transações financeiras;</li>
                <li><strong>Prestadores de serviço:</strong> empresas contratadas para operacionalização do evento (envio de e-mails, suporte técnico), sob obrigação de confidencialidade;</li>
                <li><strong>Autoridades públicas:</strong> quando exigido por lei ou determinação judicial.</li>
              </ul>
              <p className="mt-2">
                <strong>Não comercializamos</strong> dados pessoais com terceiros para fins de marketing externo.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-dark">7. Armazenamento e Segurança</h2>
              <p>7.1. Os dados são armazenados em servidores seguros com criptografia e controle de acesso.</p>
              <p>7.2. Utilizamos a plataforma <strong>Supabase</strong> para armazenamento de dados, que implementa padrões de segurança de mercado.</p>
              <p>7.3. Os dados de pagamento são processados diretamente pela <strong>Asaas</strong>, certificada nos padrões PCI-DSS.</p>
              <p>7.4. Os dados serão mantidos pelo período necessário ao cumprimento das finalidades descritas ou conforme exigido por legislação aplicável.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-dark">8. Direitos do Titular</h2>
              <p>Conforme a LGPD, o participante tem direito a:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Confirmação e acesso:</strong> saber se seus dados são tratados e acessar seus dados;</li>
                <li><strong>Correção:</strong> solicitar correção de dados incompletos ou desatualizados;</li>
                <li><strong>Anonimização ou eliminação:</strong> solicitar anonimização ou eliminação de dados desnecessários;</li>
                <li><strong>Portabilidade:</strong> solicitar a transferência de dados a outro fornecedor;</li>
                <li><strong>Revogação do consentimento:</strong> retirar o consentimento a qualquer momento, sem prejuízo da legalidade do tratamento anterior;</li>
                <li><strong>Oposição:</strong> opor-se ao tratamento de dados para finalidades com as quais não concorde;</li>
                <li><strong>Informação sobre compartilhamento:</strong> saber com quais entidades seus dados foram compartilhados.</li>
              </ul>
              <div className="bg-purple/5 rounded-xl p-4 mt-3">
                <p className="text-sm text-dark">
                  Para exercer qualquer desses direitos, entre em contato pelo e-mail{' '}
                  <a href="mailto:acia.aca@gmail.com" className="text-purple font-semibold hover:underline">acia.aca@gmail.com</a>{' '}
                  com o assunto <strong>"Direitos LGPD"</strong>. Responderemos em até 15 dias úteis.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-dark">9. Cookies e Tecnologias de Rastreamento</h2>
              <p>
                Este site utiliza cookies essenciais para funcionamento da plataforma (autenticação, sessão).
                Não utilizamos cookies de rastreamento para publicidade de terceiros.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-dark">10. Cancelamento de Comunicações</h2>
              <p>
                O participante poderá, a qualquer momento, solicitar o cancelamento do recebimento de
                comunicações comerciais e promocionais enviando e-mail para{' '}
                <a href="mailto:acia.aca@gmail.com" className="text-purple font-semibold hover:underline">acia.aca@gmail.com</a>{' '}
                com o assunto <strong>"Cancelar comunicações"</strong>.
              </p>
              <p>
                O cancelamento das comunicações comerciais não afeta o envio de comunicações transacionais
                relacionadas a inscrições ativas (confirmações, alterações de evento, etc.).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-dark">11. Alterações nesta Política</h2>
              <p>
                Esta Política de Privacidade poderá ser atualizada periodicamente. Recomendamos a consulta
                regular desta página. Alterações significativas serão comunicadas por e-mail aos participantes cadastrados.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-dark">12. Contato e Encarregado de Dados (DPO)</h2>
              <p>Para questões relacionadas à privacidade e proteção de dados:</p>
              <ul className="list-none pl-0 space-y-1">
                <li><strong>ACIA</strong> — Associação Comercial e Industrial de Açailândia</li>
                <li>E-mail: <a href="mailto:acia.aca@gmail.com" className="text-purple font-semibold hover:underline">acia.aca@gmail.com</a></li>
                <li>Telefone: <a href="tel:+5599988334432" className="text-purple font-semibold hover:underline">+55 99 98833-4432</a></li>
                <li>Açailândia — MA</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-dark">13. Foro</h2>
              <p>
                Fica eleito o foro da Comarca de Açailândia/MA para dirimir quaisquer questões oriundas desta
                Política de Privacidade, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <Link href="/termos" className="text-purple font-semibold text-sm hover:underline">
              Ver Termos de Uso
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

import Link from 'next/link'

export const metadata = {
  title: 'Termos de Uso | Semana Empresarial de Açailândia 2026',
}

export default function TermosPage() {
  return (
    <main className="min-h-screen bg-[#F5F5FA] py-8 md:py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-10">
          <h1 className="text-2xl md:text-3xl font-bold text-dark mb-2">Termos de Uso</h1>
          <p className="text-sm text-gray-400 mb-8">Última atualização: 15 de março de 2026</p>

          <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
            <section>
              <h2 className="text-lg font-bold text-dark mt-0">1. Identificação das Organizadoras</h2>
              <p>
                A <strong>Semana Empresarial de Açailândia 2026</strong> é organizada pela{' '}
                <strong>Associação Comercial e Industrial de Açailândia (ACIA)</strong> e pelo{' '}
                <strong>Serviço Brasileiro de Apoio às Micro e Pequenas Empresas (SEBRAE)</strong>, doravante denominadas "Organizadoras".
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-dark">2. Aceitação dos Termos</h2>
              <p>
                Ao se inscrever em qualquer evento da Semana Empresarial de Açailândia 2026,
                o participante declara que leu, compreendeu e concorda integralmente com estes Termos de Uso
                e com a <Link href="/privacidade" className="text-purple font-semibold hover:underline">Política de Privacidade e LGPD</Link>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-dark">3. Inscrição e Participação</h2>
              <p>3.1. A inscrição nos eventos está sujeita à disponibilidade de vagas e, quando aplicável, à confirmação do pagamento.</p>
              <p>3.2. O participante se compromete a fornecer informações verdadeiras, completas e atualizadas no momento da inscrição.</p>
              <p>3.3. A inscrição é pessoal e intransferível, salvo autorização expressa das Organizadoras.</p>
              <p>3.4. As Organizadoras reservam-se o direito de cancelar, alterar datas, horários, local ou palestrantes dos eventos, com aviso prévio sempre que possível.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-dark">4. Pagamento e Cancelamento</h2>
              <p>4.1. Eventos pagos devem ser quitados dentro do prazo indicado no ato da inscrição. Pagamentos não confirmados dentro do prazo poderão resultar no cancelamento automático da inscrição.</p>
              <p>4.2. O pagamento é processado pela plataforma <strong>Asaas</strong>, que aceita PIX, boleto bancário e cartão de crédito.</p>
              <p>4.3. Em caso de cancelamento por parte do participante, não haverá reembolso, salvo em situações excepcionais avaliadas pelas Organizadoras.</p>
              <p>4.4. Em caso de cancelamento do evento pelas Organizadoras, o valor pago será integralmente devolvido ao participante.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-dark">5. Uso de Dados Pessoais</h2>
              <p>
                5.1. Ao se inscrever, o participante autoriza expressamente que a <strong>ACIA</strong> e o <strong>SEBRAE</strong>{' '}
                utilizem seus dados pessoais (nome, e-mail, telefone e CPF) para as seguintes finalidades:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Gestão e operação dos eventos (inscrição, credenciamento, emissão de ingressos);</li>
                <li>Comunicação sobre os eventos da Semana Empresarial;</li>
                <li><strong>Contato direto para oferta de produtos, serviços, cursos, consultorias e programas</strong> oferecidos pela ACIA e pelo SEBRAE;</li>
                <li>Envio de informativos, newsletters, convites para eventos futuros e conteúdos relacionados ao empreendedorismo;</li>
                <li>Pesquisas de satisfação e melhoria dos serviços;</li>
                <li>Cumprimento de obrigações legais e regulatórias.</li>
              </ul>
              <p>
                5.2. O participante poderá, a qualquer momento, solicitar a exclusão ou alteração de seus dados
                entrando em contato pelo e-mail <a href="mailto:acia.aca@gmail.com" className="text-purple font-semibold hover:underline">acia.aca@gmail.com</a>.
              </p>
              <p>
                5.3. Para informações completas sobre o tratamento de dados, consulte nossa{' '}
                <Link href="/privacidade" className="text-purple font-semibold hover:underline">Política de Privacidade e LGPD</Link>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-dark">6. Propriedade Intelectual</h2>
              <p>
                6.1. Todo o conteúdo apresentado nos eventos (palestras, materiais, apresentações) é de propriedade
                dos respectivos autores e palestrantes, sendo vedada a reprodução sem autorização.
              </p>
              <p>
                6.2. As Organizadoras poderão captar imagens e vídeos durante os eventos para divulgação institucional.
                Ao participar, o inscrito consente com o uso de sua imagem para fins promocionais
                vinculados à Semana Empresarial.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-dark">7. Conduta do Participante</h2>
              <p>7.1. O participante compromete-se a manter conduta respeitosa durante os eventos.</p>
              <p>7.2. As Organizadoras reservam-se o direito de recusar ou retirar participantes que apresentem comportamento inadequado, sem direito a reembolso.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-dark">8. Responsabilidade</h2>
              <p>8.1. As Organizadoras não se responsabilizam por objetos pessoais perdidos ou danificados durante os eventos.</p>
              <p>8.2. A participação nos eventos é de inteira responsabilidade do inscrito, que deve zelar por sua saúde e segurança.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-dark">9. Foro</h2>
              <p>
                Fica eleito o foro da Comarca de Açailândia/MA para dirimir quaisquer questões oriundas destes Termos de Uso,
                com renúncia expressa a qualquer outro, por mais privilegiado que seja.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-dark">10. Contato</h2>
              <p>Para dúvidas sobre estes termos, entre em contato:</p>
              <ul className="list-none pl-0 space-y-1">
                <li><strong>ACIA</strong> — Associação Comercial e Industrial de Açailândia</li>
                <li>E-mail: <a href="mailto:acia.aca@gmail.com" className="text-purple font-semibold hover:underline">acia.aca@gmail.com</a></li>
                <li>Telefone: <a href="tel:+5599988334432" className="text-purple font-semibold hover:underline">+55 99 98833-4432</a></li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}

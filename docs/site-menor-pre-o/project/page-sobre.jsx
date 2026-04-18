// Sobre (About) page
function PageSobre({ setPage }) {
  return (
    <div className="page-enter">
      {/* Hero */}
      <section style={{paddingBottom: 32}}>
        <div className="container">
          <div className="eyebrow" style={{marginBottom: 24}}><span className="dot"></span>SOBRE O EVENTO</div>
          <h1 className="display" style={{fontSize:'clamp(48px, 8vw, 120px)', maxWidth: 1100, marginBottom: 40}}>
            Um território inteiro em <span style={{color:'var(--ciano)'}}>modo negócio</span> durante uma semana.
          </h1>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 64, paddingTop: 32, borderTop:'1px solid var(--line)'}} className="about-intro">
            <p style={{fontSize: 18, lineHeight: 1.6, color:'var(--ink-70)'}}>
              A Semana Empresarial de Açailândia nasceu em 2020 como uma resposta local ao desafio de fortalecer a economia do sudoeste maranhense. Cinco edições depois, virou o maior encontro multissetorial de negócios da região — reunindo indústria, comércio, serviços, agronegócio e setor público em um só lugar.
            </p>
            <p style={{fontSize: 18, lineHeight: 1.6, color:'var(--ink-70)'}}>
              Mais do que uma feira, é uma infraestrutura viva de conexões: rodadas de negócios, crédito, capacitação, talks, palestras e uma feira multissetorial com mais de 80 expositores. Conexões que geram vendas, vendas que geram desenvolvimento.
            </p>
          </div>
        </div>
      </section>

      {/* Big numbers 2025 */}
      <section style={{paddingTop: 56}}>
        <div className="container">
          <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom: 48, flexWrap:'wrap', gap: 16}}>
            <h2 className="display" style={{fontSize:'clamp(40px, 5vw, 58px)'}}>Edição 2025 em números</h2>
            <span className="mono" style={{fontSize: 12, color:'var(--ink-50)'}}>5ª EDIÇÃO · 28.07 — 02.08 · 2025</span>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap: 16, marginBottom: 16}} className="stat-row">
            <StatCard big value="R$ 5,29" unit="milhões" label="Em negócios imediatos gerados nas rodadas" bg="var(--laranja)" fg="white" />
            <StatCard value="7.200" unit="" label="Participantes" bg="var(--verde)" fg="#1a3300" />
            <StatCard value="+1.000" unit="" label="Empresas" bg="var(--laranja)" fg="#3a1600" />
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 2fr', gap: 16}} className="stat-row">
            <StatCard value="80" unit="" label="Expositores na feira" bg="var(--ciano)" fg="#062e36" />
            <StatCard value="147" unit="" label="Visitantes/dia por empresa" bg="white" fg="var(--ink)" border />
            <StatCard value="R$ 1 mi+" unit="" label="Mobilizado em crédito durante o mutirão" bg="var(--ink)" fg="white" />
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 16, marginTop: 16}} className="stat-row">
            <StatCard value="688 mil" unit="" label="Visualizações nos últimos 30 dias da edição" bg="white" fg="var(--ink)" border />
            <StatCard value="9.600" unit="" label="Interações nas redes" bg="white" fg="var(--ink)" border />
            <StatCard value="16" unit="cotas" label="Cotas de patrocínio confirmadas" bg="white" fg="var(--ink)" border />
          </div>
        </div>
      </section>

      {/* Mission / Pillars */}
      <section>
        <div className="container">
          <div className="eyebrow" style={{marginBottom: 20}}><span className="dot"></span>PILARES</div>
          <h2 className="display" style={{fontSize:'clamp(40px, 5vw, 58px)', maxWidth: 900, marginBottom: 56}}>Três frentes, um objetivo: desenvolvimento regional.</h2>

          <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 24}} className="pillars-grid">
            {[
              { k: '01', c:'var(--laranja)', t:'Conectar', d:'Aproximar empresas, investidores, governo e empreendedores em um calendário único. Criar o lugar onde os negócios da região acontecem.' },
              { k: '02', c:'var(--verde)', t:'Capacitar', d:'Oficinas, palestras e talks para elevar o nível de gestão dos pequenos e médios negócios do sudoeste maranhense.' },
              { k: '03', c:'var(--ciano)', t:'Financiar', d:'O Mutirão de Crédito reúne bancos de fomento em um só espaço, destravando capital para empresas que querem crescer.' },
            ].map(p => (
              <div key={p.k} style={{padding: 32, background:'white', border:'1px solid var(--line)', borderRadius: 16, position:'relative'}}>
                <div style={{display:'flex', alignItems:'center', gap: 12, marginBottom: 40}}>
                  <span style={{width: 10, height: 10, borderRadius:'50%', background: p.c}}></span>
                  <span className="mono" style={{fontSize: 11, color:'var(--ink-50)', letterSpacing:'.1em'}}>{p.k}</span>
                </div>
                <h3 className="display" style={{fontSize: 40, marginBottom: 16, letterSpacing:'-.03em'}}>{p.t}</h3>
                <p style={{fontSize: 15, lineHeight: 1.55, color:'var(--ink-70)'}}>{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section style={{background:'var(--paper-2)'}}>
        <div className="container">
          <div className="eyebrow" style={{marginBottom: 20}}><span className="dot"></span>UMA SEMANA EM MOVIMENTO</div>
          <h2 className="display" style={{fontSize:'clamp(40px, 5vw, 58px)', marginBottom: 56}}>Como se organiza o evento</h2>
          <div style={{display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap: 8}} className="week-grid">
            {[
              { d:'28', w:'TER', t:'Abertura', e:['Palestra Magna','Feira aberta','Mutirão'], c:'var(--laranja)' },
              { d:'29', w:'QUA', t:'Conexão', e:['Rodada de Negócios','Oficinas','Feira'], c:'var(--laranja)' },
              { d:'30', w:'QUI', t:'Liderança', e:['Talk Mulheres','Rodada','Feira'], c:'var(--ciano)' },
              { d:'31', w:'SEX', t:'Capital', e:['Rodada final','Mutirão','Feira'], c:'var(--verde)' },
              { d:'01', w:'SÁB', t:'Território', e:['Showcase','Feira ampliada','Oficinas'], c:'var(--laranja)' },
              { d:'02', w:'DOM', t:'Encerramento', e:['Premiação','Feira','Celebração'], c:'var(--laranja)' },
            ].map((day, i) => (
              <div key={i} style={{background:'white', padding: '24px 18px', borderRadius: 12, borderTop:`3px solid ${day.c}`}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 16}}>
                  <div className="display" style={{fontSize: 40, letterSpacing:'-.03em'}}>{day.d}</div>
                  <div className="mono" style={{fontSize: 10, color:'var(--ink-50)', letterSpacing:'.1em'}}>{day.w}</div>
                </div>
                <div style={{fontWeight: 600, fontSize: 14, marginBottom: 14}}>{day.t}</div>
                <ul style={{listStyle:'none', display:'flex', flexDirection:'column', gap: 6, fontSize: 12, color:'var(--ink-70)'}}>
                  {day.e.map((ev,j) => <li key={j} style={{paddingLeft: 10, position:'relative'}}><span style={{position:'absolute', left: 0, top: 6, width: 4, height: 4, background:'var(--ink-50)'}}></span>{ev}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mensagem + CTA */}
      <section>
        <div className="container">
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 64, alignItems:'center'}} className="about-manifesto">
            <Ph label="FOTO ABERTURA · PALCO" h={480} style={{borderRadius: 16}} />
            <div>
              <div className="eyebrow" style={{marginBottom: 20}}><span className="dot"></span>MANIFESTO</div>
              <h2 className="display" style={{fontSize:'clamp(40px, 5vw, 58px)', marginBottom: 24}}>
                Desenvolvimento não acontece sozinho. <span style={{color:'var(--laranja)'}}>Se organiza.</span>
              </h2>
              <p style={{fontSize: 17, lineHeight: 1.6, color:'var(--ink-70)', marginBottom: 24}}>
                A Semana Empresarial é onde o sudoeste maranhense marca o seu compasso. Por seis dias, empresas, governo, academia e sociedade se encontram para projetar a próxima década da região.
              </p>
              <p style={{fontSize: 17, lineHeight: 1.6, color:'var(--ink-70)', marginBottom: 32}}>
                É pouco tempo para um movimento tão grande. Por isso, cada minuto é desenhado para gerar valor — da primeira rodada ao último aperto de mão.
              </p>
              <button className="btn btn-primary" onClick={() => setPage('edicoes')}>Ver edições anteriores <Icon name="arrow" size={14} /></button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ value, unit, label, bg, fg, border, big }) {
  return (
    <div style={{background: bg, color: fg, borderRadius: 16, padding: big ? '36px 32px' : '28px 24px', border: border ? '1px solid var(--line)' : 'none', position:'relative', overflow:'hidden', minHeight: big ? 220 : 160, display:'flex', flexDirection:'column', justifyContent:'space-between'}}>
      <div className="mono" style={{fontSize: 11, letterSpacing:'.1em', opacity: .7}}>—</div>
      <div>
        <div className="display" style={{fontSize: big ? 'clamp(56px, 8vw, 120px)' : 'clamp(36px, 5vw, 64px)', letterSpacing:'-.03em', lineHeight: .9}}>
          {value}
          {unit && <span style={{fontSize: '.4em', marginLeft: 8, opacity:.7, fontWeight: 500}}>{unit}</span>}
        </div>
        <div style={{fontSize: big ? 16 : 13.5, marginTop: 14, opacity: .85, maxWidth: 280}}>{label}</div>
      </div>
    </div>
  );
}

Object.assign(window, { PageSobre });

// Home page
function PageHome({ setPage }) {
  const [count, setCount] = useState({ d: 0, h: 0, m: 0, s: 0 });
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setShowVideo(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const target = new Date('2026-07-28T08:00:00').getTime();
    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, target - now);
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCount({ d, h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="page-enter">
      {/* HERO */}
      <section style={{paddingTop: 48, paddingBottom: 56, overflow:'hidden'}}>
        <div className="container" style={{position:'relative'}}>
          <div style={{display:'grid', gridTemplateColumns:'1.15fr .85fr', gap: 64, alignItems:'center'}} className="hero-grid">
            <div>
              <div className="eyebrow" style={{marginBottom: 24}}>
                <span className="dot"></span>5ª EDIÇÃO · 17 — 22 DE AGOSTO · 2026
              </div>
              <h1 className="display" style={{fontSize: '102px', marginBottom: 28}}>
                Gente que pensa<br/>
                <span style={{color:'var(--laranja)'}}>negócios</span><br/>
                que evoluem.
              </h1>
              <p style={{fontSize: 18, lineHeight: 1.55, color:'var(--ink-70)', maxWidth: 520, marginBottom: 36}}>
                Seis dias conectando empresários, compradores e fornecedores em um só lugar — ampliando networking, gerando negócios e fortalecendo a economia.
              </p>
              <div style={{display:'flex', gap: 12, flexWrap:'wrap', alignItems:'center'}}>
                <button className="btn btn-orange btn-lg" onClick={() => setPage('inscricoes')}>
                  Garantir ingresso <Icon name="arrow" size={16} />
                </button>
                <button className="btn btn-ghost btn-lg" onClick={() => setPage('expositores')}>
                  Quero ser expositor
                </button>
                <button onClick={() => setShowVideo(true)} className="video-btn" aria-label="Assistir vídeo institucional" style={{display:'flex', alignItems:'center', gap: 12, background:'transparent', border:'none', cursor:'pointer', padding:'8px 4px', color:'var(--ink)'}}>
                  <span className="video-btn-circle" style={{position:'relative', width: 48, height: 48, borderRadius:'50%', background:'var(--verde)', display:'grid', placeItems:'center', flexShrink: 0}}>
                    <span className="video-btn-pulse" style={{position:'absolute', inset: 0, borderRadius:'50%', border:'2px solid var(--verde)', opacity: .5}}></span>
                    <span className="video-btn-pulse video-btn-pulse-2" style={{position:'absolute', inset: 0, borderRadius:'50%', border:'2px solid var(--verde)', opacity: .5}}></span>
                    <svg width="14" height="16" viewBox="0 0 14 16" fill="#1a3300" style={{marginLeft: 2, position:'relative', zIndex: 1}}>
                      <path d="M0 0L14 8L0 16V0Z"/>
                    </svg>
                  </span>
                  <span style={{textAlign:'left'}}>
                    <span style={{display:'block', fontSize: 14, fontWeight: 600}}>Vídeo institucional</span>
                    <span style={{display:'block', fontSize: 12, color:'var(--ink-50)'}}>1:42 min</span>
                  </span>
                </button>
              </div>

              {/* Quick facts */}
              <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 0, marginTop: 56, borderTop:'1px solid var(--line)', borderBottom:'1px solid var(--line)'}}>
                <div style={{padding:'18px 0', borderRight:'1px solid var(--line)'}}>
                  <div className="mono" style={{fontSize:10, color:'var(--ink-50)', letterSpacing:'.1em'}}>LOCAL</div>
                  <div style={{fontWeight:600, fontSize: 14, marginTop:4}}>Açailândia — MA</div>
                </div>
                <div style={{padding:'18px 0 18px 18px', borderRight:'1px solid var(--line)'}}>
                  <div className="mono" style={{fontSize:10, color:'var(--ink-50)', letterSpacing:'.1em'}}>ENTRADA</div>
                  <div style={{fontWeight:600, fontSize: 14, marginTop:4}}>Gratuita</div>
                </div>
                <div style={{padding:'18px 0 18px 18px'}}>
                  <div className="mono" style={{fontSize:10, color:'var(--ink-50)', letterSpacing:'.1em'}}>EDIÇÃO</div>
                  <div style={{fontWeight:600, fontSize: 14, marginTop:4}}>6ª · 2026</div>
                </div>
              </div>
            </div>

            {/* Hero visual */}
            <HeroArt count={count} />
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div style={{padding:'18px 0', background: 'var(--azul)', color:'white', overflow:'hidden', borderBottom:'1px solid var(--azul-900)'}}>
        <div className="marquee">
          <div className="marquee-track display" style={{fontSize: 28, letterSpacing:'-.02em'}}>
            {Array.from({length: 2}).map((_, i) => (
              <React.Fragment key={i}>
                <span>Feira Multissetorial</span>
                <span style={{color:'var(--verde)'}}>✦</span>
                <span>Rodada de Negócios</span>
                <span style={{color:'var(--laranja)'}}>✦</span>
                <span>Palestra Magna</span>
                <span style={{color:'var(--ciano)'}}>✦</span>
                <span>Rodada de Crédito</span>
                <span style={{color:'var(--verde)'}}>✦</span>
                <span>Talk Mulheres Empreendedoras</span>
                <span style={{color:'var(--laranja)'}}>✦</span>
                <span>Oficinas de Negócios</span>
                <span style={{color:'var(--ciano)'}}>✦</span>
                <span>Plantão de Consultorias</span>
                <span style={{color:'var(--verde)'}}>✦</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Realização */}
      <section style={{padding:'80px 0 96px'}}>
        <div className="container">
          <div style={{display:'grid', gridTemplateColumns:'1fr 1.4fr', gap: 64, alignItems:'center'}} className="about-intro">
            <div>
              <div className="eyebrow" style={{marginBottom: 16}}><span className="dot"></span>REALIZAÇÃO</div>
              <h2 className="display" style={{fontSize:'clamp(40px, 5vw, 58px)', letterSpacing:'-.02em', maxWidth: 498}}>
                Um evento realizado por quem <span style={{color:'var(--laranja)'}}>vive</span> o comércio da cidade.
              </h2>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 12}}>
              {[
                {n:'ACIA', d:'Associação Comercial, Industrial e Serviços de Açailândia', c:'var(--laranja)', logo:'assets/logo-acia.png'},
                {n:'SICA', d:'Sindicato do Comércio Varejista de Açailândia', c:'var(--laranja)', logo:'assets/logo-sica.png'},
                {n:'CDL', d:'Câmara de Dirigentes Lojistas de Açailândia', c:'var(--verde)', logo:'assets/logo-cdl.png'},
                {n:'SEBRAE', d:'Serviço Brasileiro de Apoio às Micro e Pequenas Empresas', c:'var(--ciano)', logo:'assets/logo-sebrae.png'},
              ].map(r => (
                <div key={r.n} style={{padding:'28px 22px', background:'white', border:'1px solid var(--line)', borderRadius: 12, borderTop: `3px solid ${r.c}`, minHeight: 262, display:'flex', flexDirection:'column', justifyContent:'space-between', gap: 20}}>
                  <div style={{height: 110, display:'flex', alignItems:'center', justifyContent:'flex-start'}}>
                    <img src={r.logo} alt={r.n} style={{maxHeight: '100%', maxWidth:'100%', objectFit:'contain', objectPosition:'left center'}}/>
                  </div>
                  <div style={{fontSize: 13, color:'var(--ink-70)', lineHeight: 1.5, fontWeight: 500}}>{r.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={{padding:'96px 0 118px'}}>
        <div className="container">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom: 56, flexWrap:'wrap', gap: 24}}>
            <div>
              <div className="eyebrow" style={{marginBottom: 16}}><span className="dot"></span>PROGRAMAÇÃO 2026</div>
              <h2 className="display" style={{fontSize:'clamp(40px, 5vw, 58px)'}}>Seis dias.<br/>Seis frentes de<br/>desenvolvimento.</h2>
            </div>
            <p style={{maxWidth: 380, color:'var(--ink-70)', lineHeight: 1.6}}>
              A Semana Empresarial de Açailândia articula feira, capacitação, crédito e rodadas de negócios em um único território de oportunidades.
            </p>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 0, borderTop:'1px solid var(--line)'}} className="program-grid">
            {[
              { t: 'Feira de Exposição Multissetorial', d: 'Mais de 80 expositores em 6.000 m² dedicados à exposição e negociação direta com compradores e fornecedores.', c: 'var(--laranja)', day: '20 — 22.08' },
              { t: 'Palestra Magna', d: 'Referência nacional abre oficialmente a semana com um recorte sobre economia regional e desenvolvimento.', c: 'var(--laranja)', day: '19.08 · 19h' },
              { t: 'Oficina de Negócios', d: 'Capacitações práticas em gestão, marketing digital, finanças e vendas para pequenos e médios negócios.', c: 'var(--verde)', day: '17 — 22.08' },
              { t: 'Rodada de Negócios', d: 'Encontros estruturados entre compradores e fornecedores. Em 2025, R$ 5,29 mi em negócios imediatos.', c: 'var(--laranja)', day: '18 — 20.08' },
              { t: 'Plantão de Consultorias', d: 'Consultores atendendo empresários em pautas de gestão, jurídico, contábil e inovação.', c: 'var(--ciano)', day: '17 — 22.08' },
              { t: 'Rodada de Crédito', d: 'Bancos de fomento presentes com linhas de financiamento específicas e atendimento presencial.', c: 'var(--verde)', day: '17 — 22.08' },
              { t: 'Talk Mulheres Empreendedoras', d: 'Encontro dedicado à liderança feminina e ao empreendedorismo regional.', c: 'var(--ciano)', day: '18.08 · 18h' },
            ].map((it, i) => (
              <div key={i} style={{padding: '36px 28px 36px 0', borderBottom:'1px solid var(--line)', borderRight: (i % 3 !== 2) ? '1px solid var(--line)' : 'none', paddingLeft: (i % 3 !== 0) ? 28 : 0, position:'relative'}}>
                <div style={{display:'flex', alignItems:'center', gap: 10, marginBottom: 18}}>
                  <span style={{width: 8, height: 8, borderRadius:'50%', background: it.c}}></span>
                  <span className="mono" style={{fontSize: 11, color:'var(--ink-50)', letterSpacing:'.1em'}}>{String(i+1).padStart(2,'0')} / 08 · {it.day}</span>
                </div>
                <h3 className="display" style={{fontSize: 26, marginBottom: 12, letterSpacing:'-0.02em'}}>{it.t}</h3>
                <p style={{fontSize: 14.5, color:'var(--ink-70)', lineHeight: 1.55}}>{it.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Numbers band */}
      <section style={{background:'var(--ink)', color:'white', padding:'96px 0 118px'}}>
        <div className="container">
          <div className="eyebrow" style={{color:'#8a8ca8', marginBottom: 24}}>
            <span className="dot" style={{background:'var(--verde)'}}></span>EDIÇÃO 2025 · EM NÚMEROS
          </div>
          <h2 className="display" style={{fontSize:'clamp(40px, 5vw, 58px)', maxWidth: 960, marginBottom: 64}}>
            5,29 milhões em negócios.<br/>
            <span style={{color:'var(--verde)'}}>em seis dias.</span>
          </h2>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 32}} className="stats-grid">
            {[
              { n:'7.200', l:'Participantes', c:'var(--verde)' },
              { n:'+1.000', l:'Empresas', c:'var(--laranja)' },
              { n:'80', l:'Expositores', c:'var(--ciano)' },
              { n:'R$ 5,29 mi', l:'Em negócios', c:'var(--verde)' },
            ].map((s,i) => (
              <div key={i} style={{borderTop:`2px solid ${s.c}`, paddingTop: 20}}>
                <div className="display" style={{fontSize:'clamp(40px, 5vw, 72px)', lineHeight: 1}}>{s.n}</div>
                <div style={{marginTop: 12, fontSize: 14, color:'#a0a2c2'}}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop: 48}}>
            <button className="btn btn-ghost btn-lg" style={{borderColor:'#3a3c6a', color:'white'}} onClick={() => setPage('sobre')}>
              Ver relatório completo <Icon name="arrow" size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Inscrições */}
      <section style={{padding: '96px 0 32px'}}>
        <div className="container">
          <div style={{display:'grid', gridTemplateColumns:'5fr 7fr', gap: 48, alignItems:'center'}} className="insc-grid">
            <div>
              <div className="eyebrow" style={{marginBottom: 16}}><span className="dot"></span>INSCRIÇÕES ABERTAS</div>
              <h2 className="display" style={{fontSize:'clamp(40px, 5vw, 64px)', letterSpacing:'-.03em', marginBottom: 24}}>
                Monte sua <span style={{color:'var(--verde)'}}>agenda</span> na semana.
              </h2>
              <p style={{fontSize: 17, color:'var(--ink-70)', lineHeight: 1.6, marginBottom: 32, maxWidth: 420}}>
                Escolha entre palestras, rodadas de negócios, oficinas e plantões. Algumas atividades são gratuitas, outras com valor simbólico.
              </p>
              <div style={{display:'flex', gap: 12, flexWrap:'wrap'}}>
                <button className="btn btn-primary btn-lg" onClick={() => setPage('inscricoes')}>
                  Fazer inscrição <Icon name="arrow" size={16} />
                </button>
                <button className="btn btn-ghost btn-lg" onClick={() => setPage('inscricoes')}>
                  Ver programação
                </button>
              </div>
              <div style={{marginTop: 32, display:'flex', gap: 32, paddingTop: 24, borderTop:'1px solid var(--line)'}}>
                <div>
                  <div className="display" style={{fontSize: 36, letterSpacing:'-.02em'}}>7</div>
                  <div className="mono" style={{fontSize: 11, color:'var(--ink-50)', letterSpacing:'.1em'}}>ATIVIDADES</div>
                </div>
                <div>
                  <div className="display" style={{fontSize: 36, letterSpacing:'-.02em'}}>4</div>
                  <div className="mono" style={{fontSize: 11, color:'var(--ink-50)', letterSpacing:'.1em'}}>GRATUITAS</div>
                </div>
                <div>
                  <div className="display" style={{fontSize: 36, letterSpacing:'-.02em', color:'var(--laranja)'}}>R$ 50+</div>
                  <div className="mono" style={{fontSize: 11, color:'var(--ink-50)', letterSpacing:'.1em'}}>A PARTIR DE</div>
                </div>
              </div>
            </div>
            <div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10}}>
                {[
                  { t:'Feira Multissetorial', d:'20 — 22.08', p:'Gratuito', c:'var(--laranja)' },
                  { t:'Palestra Magna', d:'19.08 · 19h', p:'R$ 80', c:'var(--azul)' },
                  { t:'Rodada de Negócios', d:'18 — 20.08', p:'R$ 120', c:'var(--laranja)' },
                  { t:'Talk Mulheres', d:'18.08 · 18h', p:'R$ 50', c:'var(--ciano)' },
                  { t:'Oficinas e consultorias', d:'17 — 22.08', p:'Gratuito', c:'var(--verde)', slots: { open: 5, closed: 2 } },
                  { t:'Rodada de Crédito', d:'17 — 22.08', p:'Gratuito', c:'var(--verde)' },
                ].map((x,i) => (
                  <button key={i} onClick={() => setPage('inscricoes')} style={{
                    background:'white', border:'1px solid var(--line)', borderRadius: 14,
                    padding: 20, textAlign:'left', cursor:'pointer', transition:'all .2s',
                    position:'relative', overflow:'hidden'
                  }} onMouseEnter={e => { e.currentTarget.style.borderColor = x.c; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 12}}>
                      <span style={{width: 10, height: 10, borderRadius:'50%', background: x.c}}></span>
                      <span className="mono" style={{fontSize: 10, color:'var(--ink-50)', letterSpacing:'.1em'}}>{x.d}</span>
                    </div>
                    <div style={{fontSize: 16, fontWeight: 600, letterSpacing:'-.01em', marginBottom: 8}}>{x.t}</div>
                    {x.slots ? (
                      <div style={{display:'flex', flexDirection:'column', gap: 6, marginTop: 4}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                          <span style={{fontSize: 13, fontWeight: 600, color:'var(--verde-600)'}}>Gratuito</span>
                          <Icon name="arrow" size={14} />
                        </div>
                        <div style={{display:'flex', gap: 10, fontSize: 11, color:'var(--ink-50)', flexWrap:'wrap'}}>
                          <span style={{display:'flex', alignItems:'center', gap: 5}}>
                            <span style={{width: 6, height: 6, borderRadius:'50%', background:'var(--verde-600)'}}></span>
                            {x.slots.open} com vagas
                          </span>
                          <span style={{display:'flex', alignItems:'center', gap: 5}}>
                            <span style={{width: 6, height: 6, borderRadius:'50%', background:'var(--ink-50)', opacity:.4}}></span>
                            {x.slots.closed} sem vagas
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <span style={{fontSize: 13, fontWeight: 600, color: x.p === 'Gratuito' ? 'var(--verde-600)' : 'var(--ink)'}}>{x.p}</span>
                        <Icon name="arrow" size={14} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Patrocinadores Confirmados */}
      <section style={{background:'var(--paper-2)', padding:'96px 0 118px'}}>
        <div className="container">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom: 32, flexWrap:'wrap', gap: 16}}>
            <div>
              <div className="eyebrow" style={{marginBottom: 12}}><span className="dot"></span>PATROCINADORES CONFIRMADOS · 2026</div>
              <h2 className="display" style={{fontSize:'clamp(28px, 4vw, 58px)', letterSpacing:'-.02em'}}>
                Marcas que acreditam na <span style={{color:'var(--laranja)'}}>semana.</span>
              </h2>
            </div>
            <button className="btn btn-ghost" onClick={() => setPage('parceiros')}>
              Ver todas as cotas <Icon name="arrow" size={14} />
            </button>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'repeat(12, 1fr)', gap: 10}}>
            {[
              { n:'Diamante', c:'var(--laranja)', img:'assets/patrocinadores/diamante.png', h: 56, span: 6 },
              { n:'Master', c:'var(--laranja)', img:'assets/patrocinadores/master.png', h: 56, span: 6 },
              { n:'Ouro', c:'var(--verde)', img:'assets/patrocinadores/ouro.png', h: 130, span: 12 },
              { n:'Prata', c:'var(--ciano)', img:'assets/patrocinadores/prata.png', h: 52, span: 5 },
              { n:'Apoio Institucional', c:'var(--ink)', img:'assets/patrocinadores/apoio-institucional.png', h: 48, span: 4 },
              { n:'Apoio', c:'#8a8c9c', img:'assets/patrocinadores/apoio.png', h: 72, span: 3 },
            ].map(t => (
              <div key={t.n} style={{gridColumn: `span ${t.span}`, display:'flex', flexDirection:'column', gap: 10, padding:'16px 18px', background:'white', border:'1px solid var(--line)', borderRadius: 10}}>
                <div style={{display:'flex', alignItems:'center', gap: 8}}>
                  <span style={{width: 8, height: 8, borderRadius: '50%', background: t.c}}></span>
                  <div className="mono" style={{fontSize: 10, color:'var(--ink-50)', letterSpacing:'.12em'}}>{t.n.toUpperCase()}</div>
                </div>
                <div style={{display:'flex', alignItems:'center', justifyContent:'center', minHeight: t.h}}>
                  <img src={t.img} alt={`Patrocinadores ${t.n}`} style={{maxWidth:'100%', maxHeight: t.h, objectFit:'contain'}}/>
                </div>
              </div>
            ))}
          </div>

          <div style={{marginTop: 28, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap: 16, paddingTop: 24, borderTop:'1px solid var(--line)'}}>
            <p style={{fontSize: 14, color:'var(--ink-70)'}}>Quer ter sua marca entre os apoiadores da 6ª edição?</p>
            <button className="btn btn-primary" onClick={() => setPage('parceiros')}>Quero ser parceiro <Icon name="arrow" size={14} /></button>
          </div>
        </div>
      </section>

      {/* Sponsors strip — removed (replaced by "Patrocinadores Confirmados · 2026" above) */}


      {/* CTA last */}
      <section style={{padding: '96px 0 118px'}}>
        <div className="container">
          <div style={{background:'var(--laranja)', borderRadius: 24, padding:'72px 64px', position:'relative', overflow:'hidden'}} className="cta-band">
            <div style={{position:'absolute', right:-80, top:-80, width: 400, height: 400, border:'1px solid rgba(255,255,255,.25)', borderRadius:'50%'}}></div>
            <div style={{position:'absolute', right:-40, top:-40, width: 300, height: 300, border:'1px solid rgba(255,255,255,.25)', borderRadius:'50%'}}></div>
            <div style={{position:'relative', maxWidth: 720}}>
              <div className="eyebrow" style={{color:'rgba(255,255,255,.8)', marginBottom: 16}}>
                <span className="dot" style={{background:'white'}}></span>RESERVE SEU LUGAR
              </div>
              <h2 className="display" style={{fontSize: 'clamp(36px, 5vw, 64px)', color:'white', marginBottom: 24}}>
                Os melhores stands vão primeiro.
              </h2>
              <p style={{fontSize: 17, color:'rgba(255,255,255,.9)', lineHeight: 1.55, marginBottom: 32, maxWidth: 540}}>
                Escolha sua posição no mapa, garanta seu stand e integre o maior encontro de negócios do sudoeste maranhense.
              </p>
              <div style={{display:'flex', gap: 12, flexWrap:'wrap'}}>
                <button className="btn btn-lg" style={{background:'white', color:'var(--laranja)'}} onClick={() => setPage('expositores')}>
                  Ver mapa de stands <Icon name="arrow" size={16} />
                </button>
                <button className="btn btn-lg" style={{background:'transparent', color:'white', border:'1px solid rgba(255,255,255,.5)'}} onClick={() => setPage('parceiros')}>
                  Cotas de patrocínio
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Modal */}
      {showVideo && (
        <div onClick={() => setShowVideo(false)} style={{position:'fixed', inset:0, background:'rgba(10,12,24,.88)', zIndex: 1000, display:'flex', alignItems:'center', justifyContent:'center', padding: 24, animation:'fadeIn .2s ease'}}>
          <div onClick={(e) => e.stopPropagation()} style={{width:'100%', maxWidth: 1100, position:'relative'}}>
            <button onClick={() => setShowVideo(false)} aria-label="Fechar" style={{position:'absolute', top: -48, right: 0, background:'transparent', border:'none', color:'white', fontSize: 14, cursor:'pointer', display:'flex', alignItems:'center', gap: 8}}>
              Fechar
              <span style={{width: 28, height: 28, borderRadius:'50%', border:'1px solid rgba(255,255,255,.4)', display:'grid', placeItems:'center', fontSize: 14}}>×</span>
            </button>
            <div style={{aspectRatio:'16/9', background:'#000', borderRadius: 16, overflow:'hidden', boxShadow:'0 40px 80px rgba(0,0,0,.5)'}}>
              <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0" title="Vídeo institucional" style={{width:'100%', height:'100%', border:'none'}} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Animated hero art: grid of 4 color blocks + date card
function HeroArt({ count }) {
  return (
    <div style={{position:'relative', aspectRatio: '4/5', width: '100%'}}>
      {/* Big colored composition */}
      <div style={{position:'absolute', inset:0, display:'grid', gridTemplateColumns:'1fr 1fr', gridTemplateRows:'1fr 1fr', gap: 8, borderRadius: 20, overflow:'hidden'}}>
        <div style={{background:'var(--laranja)', position:'relative', overflow:'hidden'}}>
          <div style={{position:'absolute', bottom: 16, left: 16, color:'white'}}>
            <div className="mono" style={{fontSize: 10, opacity:.7, letterSpacing:'.1em'}}>01</div>
            <div className="display" style={{fontSize: 22, marginTop:6, letterSpacing:'-.02em'}}>Feira</div>
          </div>
          <svg style={{position:'absolute', right:-20, top:-20, opacity:.25}} width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="68" stroke="white" strokeWidth="1" fill="none"/>
            <circle cx="70" cy="70" r="40" stroke="white" strokeWidth="1" fill="none"/>
          </svg>
        </div>
        <div style={{background:'var(--verde)', position:'relative'}}>
          <div style={{position:'absolute', top: 16, left: 16}}>
            <div className="mono" style={{fontSize: 10, color:'#2e4a00', letterSpacing:'.1em'}}>02</div>
            <div className="display" style={{fontSize: 22, marginTop:6, letterSpacing:'-.02em', color:'#1a3300'}}>Rodadas</div>
          </div>
          <div style={{position:'absolute', bottom: 16, right: 16, display:'grid', gridTemplateColumns:'repeat(4, 6px)', gap: 4}}>
            {Array.from({length: 16}).map((_,i) => <span key={i} style={{width: 6, height: 6, background:'#2e4a00', borderRadius: '50%', opacity: 0.2 + (i/20)}}></span>)}
          </div>
        </div>
        <div style={{background:'var(--ciano)', position:'relative'}}>
          <div style={{position:'absolute', bottom: 16, left: 16}}>
            <div className="mono" style={{fontSize: 10, color:'#0a4650', letterSpacing:'.1em'}}>03</div>
            <div className="display" style={{fontSize: 22, marginTop:6, letterSpacing:'-.02em', color:'#062e36'}}>Crédito</div>
          </div>
          <div style={{position:'absolute', top: 16, right: 16, width: 48, height: 48, border: '2px solid #062e36', borderRadius: 4, transform:'rotate(12deg)'}}></div>
        </div>
        <div style={{background:'var(--azul)', position:'relative'}}>
          <div style={{position:'absolute', bottom: 16, right: 16, textAlign:'right', color:'white'}}>
            <div className="mono" style={{fontSize: 10, opacity:.7, letterSpacing:'.1em'}}>04</div>
            <div className="display" style={{fontSize: 22, marginTop:6, letterSpacing:'-.02em'}}>Palestras</div>
          </div>
          <div style={{position:'absolute', top: 16, left: 16, display:'flex', gap: 4}}>
            {[0,1,2].map(i => <span key={i} style={{display:'block', width: 4, height: 28 + i*4, background:'rgba(255,255,255,.7)'}}></span>)}
          </div>
        </div>
      </div>

      {/* Floating date card */}
      <div style={{position:'absolute', left: '50%', top: '50%', transform:'translate(-50%, -50%)', background:'white', borderRadius: 16, padding: '20px 24px', boxShadow:'0 30px 60px -20px rgba(20,20,60,0.25)', minWidth: 280}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 12}}>
          <div className="mono" style={{fontSize: 10, color:'var(--ink-50)', letterSpacing:'.1em'}}>CONTAGEM REGRESSIVA</div>
          <span style={{width: 8, height: 8, borderRadius:'50%', background:'var(--verde)', boxShadow:'0 0 0 4px rgba(166,206,58,.25)'}}></span>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 8, textAlign:'center'}}>
          {[{l:'DIAS', v: count.d}, {l:'HRS', v: count.h}, {l:'MIN', v: count.m}, {l:'SEG', v: count.s}].map(u => (
            <div key={u.l}>
              <div className="display" style={{fontSize: 28, letterSpacing:'-.02em'}}>{String(u.v).padStart(2,'0')}</div>
              <div className="mono" style={{fontSize: 9, color:'var(--ink-50)', letterSpacing:'.1em', marginTop:2}}>{u.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PageHome });

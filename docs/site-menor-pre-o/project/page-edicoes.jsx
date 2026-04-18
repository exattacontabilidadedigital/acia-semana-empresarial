// Edições Anteriores
function PageEdicoes({ setPage }) {
  const editions = [
    { year: 2019, n: '1ª', t: 'Primeira edição', d: 'O ponto zero. Nasce em Açailândia o compromisso de reunir empresas e poder público num só calendário.', stats: [['1.200','participantes'],['24','expositores'],['R$ 420 mil','em negócios']], c: 'var(--ciano)' },
    { year: 2021, n: '2ª', t: 'Retomada pós-pandemia', d: 'Após um ano de hiato pela pandemia, a semana volta ampliada: a feira dobra de tamanho e a Rodada de Negócios vira protagonista.', stats: [['2.800','participantes'],['42','expositores'],['R$ 1,2 mi','em negócios']], c: 'var(--verde)' },
    { year: 2023, n: '3ª', t: 'Entrada do mutirão de crédito', d: 'Bancos de fomento presentes na semana, linhas específicas para pequenos negócios da região.', stats: [['4.100','participantes'],['58','expositores'],['R$ 2,4 mi','em negócios']], c: 'var(--laranja)' },
    { year: 2024, n: '4ª', t: 'Talk Mulheres estreia', d: 'Liderança feminina ganha dia próprio. A semana vira território de representatividade.', stats: [['5.600','participantes'],['68','expositores'],['R$ 3,8 mi','em negócios']], c: 'var(--azul)' },
    { year: 2025, n: '5ª', t: 'Recorde histórico', d: '7.200 participantes, +1.000 empresas, R$ 5,29 milhões em negócios imediatos. A maior feira multissetorial do sudoeste maranhense.', stats: [['7.200','participantes'],['80','expositores'],['R$ 5,29 mi','em negócios']], c: 'var(--laranja)' },
  ];

  const [active, setActive] = useState(editions.length - 1);
  const ed = editions[active];

  // Galeria (incorporada)
  const [mediaTab, setMediaTab] = useState('fotos');
  const [mediaEd, setMediaEd] = useState('todas');
  const [lightbox, setLightbox] = useState(null);
  const mediaEditions = ['todas','2025','2024','2023','2021','2019'];

  const photos = [
    { id: 1, cap:'Abertura · Palestra Magna', ed:'2025', c:'var(--azul)', span:'2x2' },
    { id: 2, cap:'Rodada de Negócios · 2º dia', ed:'2025', c:'var(--laranja)' },
    { id: 3, cap:'Feira Multissetorial', ed:'2025', c:'var(--verde)' },
    { id: 4, cap:'Talk Mulheres Empreendedoras', ed:'2025', c:'var(--ciano)' },
    { id: 5, cap:'Mutirão de Crédito', ed:'2024', c:'var(--laranja)', span:'2x1' },
    { id: 6, cap:'Palco Central', ed:'2024', c:'var(--azul)' },
    { id: 7, cap:'Expositor Destaque · Indústria', ed:'2024', c:'var(--verde)' },
    { id: 8, cap:'Oficinas · Gestão', ed:'2023', c:'var(--ciano)' },
    { id: 9, cap:'Público · Dia 3', ed:'2023', c:'var(--laranja)', span:'1x2' },
    { id:10, cap:'Encerramento · Premiação', ed:'2023', c:'var(--azul)' },
    { id:11, cap:'Credenciamento', ed:'2021', c:'var(--verde)' },
    { id:12, cap:'Stand Patrocinador Master', ed:'2021', c:'var(--laranja)' },
    { id:13, cap:'Coquetel de Abertura', ed:'2021', c:'var(--ciano)' },
    { id:14, cap:'Feira · Vista aérea', ed:'2025', c:'var(--azul)', span:'2x2' },
    { id:15, cap:'Networking', ed:'2024', c:'var(--verde)' },
    { id:16, cap:'Oficina Digital', ed:'2023', c:'var(--ciano)' },
  ];

  const videos = [
    { id:'v1', cap:'Aftermovie · 5ª Edição', ed:'2025', dur:'2:14', c:'var(--azul)', feat:true },
    { id:'v2', cap:'Destaques · Rodada de Negócios', ed:'2025', dur:'1:08', c:'var(--laranja)' },
    { id:'v3', cap:'Talk Mulheres · Compilação', ed:'2025', dur:'3:42', c:'var(--ciano)' },
    { id:'v4', cap:'Aftermovie · 4ª Edição', ed:'2024', dur:'2:32', c:'var(--verde)' },
    { id:'v5', cap:'Mutirão de Crédito · Depoimentos', ed:'2024', dur:'4:10', c:'var(--laranja)' },
    { id:'v6', cap:'Aftermovie · 3ª Edição', ed:'2023', dur:'2:04', c:'var(--azul)' },
  ];

  const filteredMedia = (mediaTab === 'fotos' ? photos : videos).filter(x => mediaEd === 'todas' || x.ed === mediaEd);

  return (
    <div className="page-enter">
      <section style={{paddingBottom: 40}}>
        <div className="container">
          <div className="eyebrow" style={{marginBottom: 24}}><span className="dot"></span>EDIÇÕES ANTERIORES</div>
          <h1 className="display" style={{fontSize:'clamp(48px, 8vw, 120px)', maxWidth: 1100, marginBottom: 24}}>
            Seis anos construindo a <span style={{color:'var(--verde)'}}>economia</span> da região.
          </h1>
          <p style={{fontSize: 18, color:'var(--ink-70)', maxWidth: 700, lineHeight: 1.6}}>
            Cada edição é um salto. Veja como a Semana Empresarial cresceu de um encontro local para o principal evento de negócios do sudoeste maranhense.
          </p>
        </div>
      </section>

      {/* Timeline track */}
      <section style={{paddingTop: 32}}>
        <div className="container">
          <div style={{display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap: 8, marginBottom: 48}}>
            {editions.map((e, i) => (
              <button key={e.year} onClick={() => setActive(i)} style={{
                textAlign:'left', padding: '20px 16px', borderRadius: 10,
                background: active === i ? e.c : 'white',
                color: active === i ? (e.c === 'var(--verde)' || e.c === 'var(--ciano)' ? '#062e36' : 'white') : 'var(--ink)',
                border: active === i ? 'none' : '1px solid var(--line)',
                transition: 'all .2s ease', cursor:'pointer'
              }}>
                <div className="mono" style={{fontSize: 10, opacity: .7, letterSpacing:'.1em'}}>{e.n} EDIÇÃO</div>
                <div className="display" style={{fontSize: 28, marginTop: 6, letterSpacing:'-.02em'}}>{e.year}</div>
              </button>
            ))}
          </div>

          {/* Active detail */}
          <div style={{display:'grid', gridTemplateColumns:'1.2fr .8fr', gap: 48}} className="edition-detail">
            <div>
              <div style={{display:'flex', alignItems:'center', gap: 12, marginBottom: 20}}>
                <span style={{width: 10, height: 10, borderRadius:'50%', background: ed.c}}></span>
                <span className="mono" style={{fontSize: 12, color:'var(--ink-50)', letterSpacing:'.1em'}}>{ed.n} EDIÇÃO · {ed.year}</span>
              </div>
              <h2 className="display" style={{fontSize:'clamp(40px, 5vw, 72px)', marginBottom: 24}}>{ed.t}</h2>
              <p style={{fontSize: 18, color:'var(--ink-70)', lineHeight: 1.6, marginBottom: 32}}>{ed.d}</p>
              <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 0, borderTop:'1px solid var(--line)', borderBottom:'1px solid var(--line)'}}>
                {ed.stats.map((s, i) => (
                  <div key={i} style={{padding:'20px 0', borderRight: i < 2 ? '1px solid var(--line)' : 'none', paddingLeft: i > 0 ? 20 : 0}}>
                    <div className="display" style={{fontSize: 32, letterSpacing:'-.02em'}}>{s[0]}</div>
                    <div className="mono" style={{fontSize: 10, color:'var(--ink-50)', letterSpacing:'.1em', marginTop: 6}}>{s[1].toUpperCase()}</div>
                  </div>
                ))}
              </div>
              <div style={{marginTop: 32, display:'flex', gap: 12}}>
                <button className="btn btn-primary" onClick={() => { setMediaEd(String(ed.year)); const el = document.getElementById('galeria-section'); if (el) window.scrollTo({ top: el.offsetTop - 20, behavior: 'smooth' }); }}>Ver galeria {ed.year} <Icon name="arrow" size={14} /></button>
                <button className="btn btn-ghost"><Icon name="download" size={14} /> Relatório {ed.year}</button>
              </div>
            </div>
            <div>
              <Ph label={`FOTO · ${ed.n} EDIÇÃO`} h={420} style={{borderRadius: 16}} tint={ed.c === 'var(--verde)' ? '#a6ce3a22' : ed.c === 'var(--laranja)' ? '#f8821e22' : ed.c === 'var(--laranja)' ? '#f8821e15' : '#56c6d022'} />
            </div>
          </div>
        </div>
      </section>

      {/* Growth chart */}
      <section>
        <div className="container">
          <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom: 40, flexWrap:'wrap', gap:16}}>
            <h2 className="display" style={{fontSize:'clamp(32px, 4vw, 48px)'}}>Evolução em gráfico</h2>
            <span className="mono" style={{fontSize: 12, color:'var(--ink-50)'}}>PARTICIPANTES · 2019—2025</span>
          </div>

          <div style={{background:'white', border:'1px solid var(--line)', borderRadius: 16, padding: 40, position:'relative'}}>
            <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap: 16, height: 280}}>
              {editions.map((e, i) => {
                const max = 7200;
                const val = parseInt(e.stats[0][0].replace(/\./g,''));
                const h = (val / max) * 100;
                return (
                  <div key={i} style={{flex: 1, display:'flex', flexDirection:'column', alignItems:'center', gap: 12}}>
                    <div style={{fontSize: 12, fontWeight: 600}}>{e.stats[0][0]}</div>
                    <div style={{width: '80%', height: `${h}%`, background: active === i ? e.c : '#e6e7df', borderRadius: '6px 6px 0 0', transition:'all .3s'}}></div>
                    <div className="mono" style={{fontSize: 11, color:'var(--ink-50)'}}>{e.year}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Galeria incorporada */}
      <section id="galeria-section" style={{paddingTop: 96, paddingBottom: 32}}>
        <div className="container">
          <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom: 32, flexWrap:'wrap', gap:16}}>
            <div>
              <div className="eyebrow" style={{marginBottom: 16}}><span className="dot"></span>GALERIA</div>
              <h2 className="display" style={{fontSize:'clamp(40px, 5vw, 58px)'}}>O evento <span style={{color:'var(--laranja)'}}>em imagens</span>.</h2>
            </div>
          </div>

          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap: 16, paddingTop: 24, borderTop:'1px solid var(--line)'}}>
            <div style={{display:'flex', gap: 4, padding: 4, background:'var(--paper-2)', borderRadius: 999}}>
              {['fotos','videos'].map(t => (
                <button key={t} onClick={() => setMediaTab(t)} style={{
                  padding: '10px 22px', borderRadius: 999,
                  background: mediaTab === t ? 'var(--ink)' : 'transparent',
                  color: mediaTab === t ? 'white' : 'var(--ink-70)',
                  fontSize: 13, fontWeight: 500, textTransform:'capitalize'
                }}>{t === 'videos' ? 'Vídeos' : 'Fotos'} ({t === 'fotos' ? photos.length : videos.length})</button>
              ))}
            </div>
            <div style={{display:'flex', gap: 6, flexWrap:'wrap'}}>
              {mediaEditions.map(e => (
                <button key={e} onClick={() => setMediaEd(e)} style={{
                  padding:'8px 14px', borderRadius: 999, fontSize: 12,
                  border: mediaEd === e ? '1px solid var(--ink)' : '1px solid var(--line)',
                  background: mediaEd === e ? 'var(--ink)' : 'white',
                  color: mediaEd === e ? 'white' : 'var(--ink-70)', fontWeight: 500,
                  textTransform: e === 'todas' ? 'capitalize' : 'none'
                }}>{e === 'todas' ? 'Todas' : e}</button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={{paddingTop: 0, paddingBottom: 64}}>
        <div className="container">
          {mediaTab === 'fotos' ? (
            <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gridAutoRows:'180px', gap: 8}} className="photo-grid">
              {filteredMedia.map(p => {
                const span = p.span;
                const style = {};
                if (span === '2x2') { style.gridColumn = 'span 2'; style.gridRow = 'span 2'; }
                if (span === '2x1') { style.gridColumn = 'span 2'; }
                if (span === '1x2') { style.gridRow = 'span 2'; }
                return (
                  <button key={p.id} onClick={() => setLightbox(p)} style={{
                    ...style, borderRadius: 10, overflow:'hidden', position:'relative',
                    background: p.c, cursor:'pointer', transition:'transform .2s', border:'none'
                  }} className="photo-item">
                    <div style={{position:'absolute', inset: 0, background: 'repeating-linear-gradient(135deg, transparent 0 14px, rgba(255,255,255,.06) 14px 15px)'}}></div>
                    <div style={{position:'absolute', top: 12, left: 12}}>
                      <div className="mono" style={{fontSize: 10, color:'rgba(255,255,255,.7)', letterSpacing:'.1em'}}>{p.ed} · #{String(p.id).padStart(3,'0')}</div>
                    </div>
                    <div style={{position:'absolute', bottom: 12, left: 12, right: 12, color:'white'}}>
                      <div style={{fontSize: 13, fontWeight: 600, letterSpacing:'-.005em'}}>{p.cap}</div>
                    </div>
                    <div style={{position:'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius:'50%', background:'rgba(255,255,255,.15)', display:'grid', placeItems:'center', color:'white'}}>
                      <Icon name="arrowUpRight" size={14} />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{display:'grid', gridTemplateColumns: filteredMedia[0]?.feat ? '2fr 1fr 1fr' : 'repeat(3, 1fr)', gap: 16}} className="video-grid">
              {filteredMedia.map(v => (
                <button key={v.id} onClick={() => setLightbox(v)} style={{
                  gridColumn: v.feat ? 'span 3' : 'auto',
                  aspectRatio: v.feat ? '21/9' : '4/3',
                  borderRadius: 14, overflow:'hidden', position:'relative',
                  background: v.c, cursor:'pointer', textAlign:'left', border:'none'
                }}>
                  <div style={{position:'absolute', inset: 0, background:'linear-gradient(180deg, transparent 40%, rgba(0,0,0,.5) 100%)'}}></div>
                  <div style={{position:'absolute', top: 16, left: 16}}>
                    <div className="mono" style={{fontSize: 11, color:'rgba(255,255,255,.85)', letterSpacing:'.1em'}}>{v.ed}</div>
                  </div>
                  <div style={{position:'absolute', top: 16, right: 16, padding:'4px 10px', background:'rgba(0,0,0,.45)', borderRadius: 999, color:'white', fontSize: 11, fontFamily:'JetBrains Mono'}}>
                    {v.dur}
                  </div>
                  <div style={{position:'absolute', inset: 0, display:'grid', placeItems:'center'}}>
                    <div style={{width: v.feat ? 84 : 60, height: v.feat ? 84 : 60, borderRadius:'50%', background:'rgba(255,255,255,.95)', display:'grid', placeItems:'center', color: v.c}}>
                      <Icon name="play" size={v.feat ? 30 : 22} stroke={0} />
                    </div>
                  </div>
                  <div style={{position:'absolute', bottom: 16, left: 16, right: 16, color:'white'}}>
                    <div style={{fontSize: v.feat ? 22 : 15, fontWeight: 600, letterSpacing:'-.01em'}} className={v.feat ? 'display' : ''}>{v.cap}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{position:'fixed', inset: 0, background:'rgba(10,10,30,.85)', zIndex: 200, display:'grid', placeItems:'center', padding: 40, backdropFilter:'blur(10px)'}}>
          <div onClick={e => e.stopPropagation()} style={{maxWidth: 1100, width: '100%', aspectRatio: '16/10', background: lightbox.c, borderRadius: 16, position:'relative', overflow:'hidden'}}>
            {mediaTab === 'videos' && (
              <div style={{position:'absolute', inset: 0, display:'grid', placeItems:'center'}}>
                <div style={{width: 100, height: 100, borderRadius:'50%', background:'rgba(255,255,255,.95)', display:'grid', placeItems:'center', color: lightbox.c}}>
                  <Icon name="play" size={40} stroke={0} />
                </div>
              </div>
            )}
            <div style={{position:'absolute', bottom: 24, left: 32, color:'white'}}>
              <div className="mono" style={{fontSize: 11, opacity:.8, letterSpacing:'.1em', marginBottom: 6}}>{lightbox.ed}{lightbox.dur ? ' · ' + lightbox.dur : ''}</div>
              <div className="display" style={{fontSize: 28, letterSpacing:'-.02em'}}>{lightbox.cap}</div>
            </div>
          </div>
          <button onClick={() => setLightbox(null)} style={{position:'fixed', top: 24, right: 24, width: 44, height: 44, borderRadius:'50%', background:'white', color:'var(--ink)', fontSize: 18, border:'none', cursor:'pointer'}}>✕</button>
        </div>
      )}

      <section style={{paddingTop: 0, paddingBottom: 96}}>
        <div className="container">
          <div style={{background:'var(--paper-2)', borderRadius: 16, padding: '48px 40px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap: 24}}>
            <div>
              <h3 className="display" style={{fontSize: 32, marginBottom: 8}}>Material de imprensa</h3>
              <p style={{color:'var(--ink-70)'}}>Fotos em alta, vídeos brutos e kit de comunicação.</p>
            </div>
            <button className="btn btn-primary"><Icon name="download" size={14}/> Baixar press kit</button>
          </div>
        </div>
      </section>
    </div>
  );
}

Object.assign(window, { PageEdicoes });

// Parceiros (sponsors) page
function PageParceiros({ setPage }) {
  const [activeTier, setActiveTier] = useState('master');
  const [form, setForm] = useState({ nome:'', empresa:'', email:'', cota:'diamante', mensagem:'' });
  const [sent, setSent] = useState(false);

  const tiers = [
    { id:'master', n:'Master', price:'R$ 250 mil', c:'var(--laranja)', fg:'white',
      benefits:['Naming rights do evento','Logo em todo material','Stand premium 60m²','Palco próprio','10 rodadas de negócios','Palestra institucional','Vídeo institucional em todos os LEDs'],
      limit:'1 cota'
    },
    { id:'diamante', n:'Diamante', price:'R$ 120 mil', c:'var(--laranja)', fg:'white',
      benefits:['Logo com destaque','Stand 40m² premium','6 rodadas de negócios','Talk institucional','LED principal','Brindes oficiais'],
      limit:'3 cotas'
    },
    { id:'ouro', n:'Ouro', price:'R$ 60 mil', c:'var(--verde)', fg:'#1a3300',
      benefits:['Logo em material principal','Stand 24m²','4 rodadas','Presença em LED','Kit expositor'],
      limit:'6 cotas'
    },
    { id:'prata', n:'Prata', price:'R$ 25 mil', c:'var(--ciano)', fg:'#062e36',
      benefits:['Logo em material','Stand 16m²','2 rodadas','Menção institucional'],
      limit:'12 cotas'
    },
    { id:'apoio', n:'Apoio', price:'Sob consulta', c:'white', fg:'var(--ink)',
      benefits:['Logo na listagem de apoio','Acesso credenciado','Visibilidade digital'],
      limit:'Institucional'
    },
  ];

  const tier = tiers.find(t => t.id === activeTier);

  const currentSponsors = {
    master: ['SEINC', 'GOVERNO DO MARANHÃO'],
    diamante: ['AGEMSUL', 'PREFEITURA DE AÇAILÂNDIA', 'SEBRAE'],
    ouro: ['ACIA', 'CACB', 'FIEMA', 'SENAI', 'SESI', 'SENAC'],
    prata: ['FECOMÉRCIO', 'CAIXA', 'BB', 'BNB', 'SICOOB', 'SICREDI'],
    apoio: ['UFMA', 'UEMA', 'IFMA', 'CEMAR', 'CEASA', 'OAB', 'CRA', 'CRC', 'SINDICATO COM.', 'ROTARY', 'LIONS', 'JCI']
  };

  const submit = (e) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => setSent(false), 4000);
    setForm({ nome:'', empresa:'', email:'', cota:'diamante', mensagem:'' });
  };

  return (
    <div className="page-enter">
      <section style={{paddingBottom: 40}}>
        <div className="container">
          <div className="eyebrow" style={{marginBottom: 24}}><span className="dot"></span>PARCEIROS & PATROCÍNIO</div>
          <h1 className="display" style={{fontSize:'clamp(48px, 8vw, 120px)', maxWidth: 1100, marginBottom: 32}}>
            Quem faz a semana <span style={{color:'var(--ciano)'}}>acontecer.</span>
          </h1>
          <div style={{display:'grid', gridTemplateColumns:'1.2fr .8fr', gap: 64, paddingTop: 24, borderTop:'1px solid var(--line)'}} className="about-intro">
            <p style={{fontSize: 18, color:'var(--ink-70)', lineHeight: 1.6}}>
              Patrocinar a Semana Empresarial é colocar sua marca no centro do calendário de negócios do sudoeste maranhense. 7.200 participantes, +1.000 empresas, mídia regional em peso e resultado imediato em vendas.
            </p>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 0}}>
              <div style={{padding:'12px 0', borderRight:'1px solid var(--line)'}}>
                <div className="display" style={{fontSize: 40, letterSpacing:'-.02em'}}>688k</div>
                <div className="mono" style={{fontSize: 10, color:'var(--ink-50)', letterSpacing:'.1em', marginTop: 4}}>VIEWS · 30 DIAS</div>
              </div>
              <div style={{padding:'12px 0 12px 20px'}}>
                <div className="display" style={{fontSize: 40, letterSpacing:'-.02em'}}>16</div>
                <div className="mono" style={{fontSize: 10, color:'var(--ink-50)', letterSpacing:'.1em', marginTop: 4}}>COTAS EM 2025</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tier selector */}
      <section>
        <div className="container">
          <div className="eyebrow" style={{marginBottom: 20}}><span className="dot"></span>COTAS DE PATROCÍNIO</div>
          <h2 className="display" style={{fontSize:'clamp(32px, 4vw, 56px)', marginBottom: 40}}>Escolha o tamanho da sua presença</h2>

          <div style={{display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap: 8, marginBottom: 32}} className="tier-selector">
            {tiers.map(t => (
              <button key={t.id} onClick={() => setActiveTier(t.id)} style={{
                padding:'24px 20px', textAlign:'left', borderRadius: 10,
                background: activeTier === t.id ? t.c : 'white',
                color: activeTier === t.id ? t.fg : 'var(--ink)',
                border: activeTier === t.id ? 'none' : '1px solid var(--line)',
                transition: 'all .2s'
              }}>
                <div className="mono" style={{fontSize: 10, opacity:.7, letterSpacing:'.1em'}}>COTA</div>
                <div className="display" style={{fontSize: 26, marginTop: 6, letterSpacing:'-.02em'}}>{t.n}</div>
                <div style={{fontSize: 12, marginTop: 10, opacity: .8}}>{t.limit}</div>
              </button>
            ))}
          </div>

          <div style={{background: tier.c, color: tier.fg, borderRadius: 20, padding: 48, position:'relative', overflow:'hidden', border: tier.id === 'apoio' ? '1px solid var(--line)' : 'none'}}>
            <div style={{display:'grid', gridTemplateColumns:'1.3fr 1fr', gap: 48, alignItems:'center'}} className="tier-detail">
              <div>
                <div className="mono" style={{fontSize: 11, letterSpacing:'.1em', opacity: .7, marginBottom: 12}}>PATROCINADOR {tier.n.toUpperCase()}</div>
                <div className="display" style={{fontSize:'clamp(48px, 7vw, 96px)', letterSpacing:'-.03em', lineHeight: .95, marginBottom: 20}}>
                  {tier.price}
                </div>
                <div style={{fontSize: 14, opacity: .8, marginBottom: 28}}>{tier.limit} · Investimento anual</div>
                <button className="btn" style={{background: tier.id === 'apoio' ? 'var(--ink)' : 'white', color: tier.id === 'apoio' ? 'white' : tier.c}} onClick={() => document.getElementById('parceiro-form')?.scrollIntoView({behavior:'smooth', block:'start'})}>
                  Quero esta cota <Icon name="arrow" size={14} />
                </button>
              </div>
              <div>
                <div className="mono" style={{fontSize: 11, letterSpacing:'.1em', opacity: .7, marginBottom: 16}}>O QUE INCLUI</div>
                <ul style={{listStyle:'none', display:'flex', flexDirection:'column', gap: 12}}>
                  {tier.benefits.map((b,i) => (
                    <li key={i} style={{display:'flex', alignItems:'flex-start', gap: 10, fontSize: 15}}>
                      <span style={{marginTop: 3, opacity: .7}}><Icon name="check" size={16} /></span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Current sponsors by tier - 2026 */}
      <section style={{background:'var(--paper-2)'}}>
        <div className="container">
          <div className="eyebrow" style={{marginBottom: 20}}><span className="dot"></span>PATROCINADORES CONFIRMADOS · 2026</div>
          <h2 className="display" style={{fontSize:'clamp(32px, 4vw, 48px)', marginBottom: 16}}>Marcas que acreditam na <span style={{color:'var(--laranja)'}}>semana.</span></h2>
          <p style={{fontSize: 16, color:'var(--ink-70)', lineHeight: 1.6, maxWidth: 640, marginBottom: 48}}>
            A 6ª edição já conta com a confirmação das marcas abaixo, organizadas por cota de patrocínio e apoio.
          </p>

          <div style={{display:'flex', flexDirection:'column', gap: 28}}>
            {[
              { id:'diamante', n:'Diamante', c:'var(--laranja)', img:'assets/patrocinadores/diamante.png?v=2', count: 2, h: 110 },
              { id:'master', n:'Master', c:'var(--laranja)', img:'assets/patrocinadores/master.png?v=2', count: 3, h: 110 },
              { id:'ouro', n:'Ouro', c:'var(--verde)', img:'assets/patrocinadores/ouro.png?v=2', count: 8, h: 240 },
              { id:'prata', n:'Prata', c:'var(--ciano)', img:'assets/patrocinadores/prata.png?v=2', count: 3, h: 100 },
              { id:'apoio-inst', n:'Apoio Institucional', c:'var(--ink)', img:'assets/patrocinadores/apoio-institucional.png?v=2', count: 1, h: 90 },
              { id:'apoio', n:'Apoio', c:'#999', img:'assets/patrocinadores/apoio.png?v=2', count: 1, h: 170 },
            ].map(t => (
              <div key={t.id} style={{display:'grid', gridTemplateColumns:'220px 1fr', gap: 40, alignItems:'center', padding: '28px 32px', background:'white', border:'1px solid var(--line)', borderRadius: 16}} className="sponsor-row">
                <div style={{display:'flex', alignItems:'center', gap: 14, borderRight:'1px solid var(--line)', paddingRight: 20}}>
                  <span style={{width: 4, height: 44, borderRadius: 2, background: t.c}}></span>
                  <div>
                    <div className="mono" style={{fontSize: 10, color:'var(--ink-50)', letterSpacing:'.12em'}}>COTA</div>
                    <div className="display" style={{fontSize: 24, letterSpacing:'-.02em', marginTop: 2}}>{t.n}</div>
                    <div className="mono" style={{fontSize: 10, color:'var(--ink-50)', letterSpacing:'.1em', marginTop: 4}}>{t.count} {t.count === 1 ? 'MARCA' : 'MARCAS'}</div>
                  </div>
                </div>
                <div style={{display:'flex', alignItems:'center', justifyContent:'center', padding: '8px 0', minHeight: t.h}}>
                  <img src={t.img} alt={`Patrocinadores ${t.n}`} style={{maxWidth:'100%', maxHeight: t.h, objectFit:'contain'}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quero ser parceiro form */}
      <section id="parceiro-form">
        <div className="container">
          <div style={{display:'grid', gridTemplateColumns:'1fr 1.2fr', gap: 64}} className="form-split">
            <div>
              <div className="eyebrow" style={{marginBottom: 20}}><span className="dot"></span>QUERO SER PARCEIRO</div>
              <h2 className="display" style={{fontSize:'clamp(36px, 5vw, 64px)', marginBottom: 24}}>
                Vamos conversar sobre a <span style={{color:'var(--laranja)'}}>sua cota.</span>
              </h2>
              <p style={{fontSize: 16, color:'var(--ink-70)', lineHeight: 1.6, marginBottom: 32}}>
                Envie seus dados e a cota de interesse. Nosso time comercial retorna em até 48 horas com proposta personalizada.
              </p>
              <div style={{borderTop:'1px solid var(--line)', paddingTop: 24}}>
                <div className="mono" style={{fontSize: 11, color:'var(--ink-50)', letterSpacing:'.1em', marginBottom: 12}}>OU FALE DIRETO</div>
                <div style={{fontSize: 16, fontWeight: 600}}>comercial@semanaempresarial.com.br</div>
                <div style={{fontSize: 16, fontWeight: 600, marginTop: 6}}>(99) 99999-9999</div>
              </div>
            </div>
            <form onSubmit={submit} style={{background:'white', border:'1px solid var(--line)', borderRadius: 16, padding: 40}}>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 20, marginBottom: 20}}>
                <Field label="Nome" value={form.nome} onChange={v => setForm({...form, nome:v})} />
                <Field label="Empresa" value={form.empresa} onChange={v => setForm({...form, empresa:v})} />
              </div>
              <div style={{marginBottom: 20}}>
                <Field label="E-mail corporativo" type="email" value={form.email} onChange={v => setForm({...form, email:v})} />
              </div>
              <div style={{marginBottom: 20}}>
                <div className="mono" style={{fontSize: 10, color:'var(--ink-50)', letterSpacing:'.1em', marginBottom: 10}}>COTA DE INTERESSE</div>
                <div style={{display:'flex', flexWrap:'wrap', gap: 6}}>
                  {tiers.map(t => (
                    <button key={t.id} type="button" onClick={() => setForm({...form, cota: t.id})} style={{
                      padding:'8px 14px', fontSize: 12, borderRadius: 999, fontWeight: 500,
                      border: form.cota === t.id ? '1px solid var(--ink)' : '1px solid var(--line)',
                      background: form.cota === t.id ? 'var(--ink)' : 'white',
                      color: form.cota === t.id ? 'white' : 'var(--ink-70)'
                    }}>{t.n}</button>
                  ))}
                </div>
              </div>
              <div style={{marginBottom: 24}}>
                <Field label="Mensagem" textarea value={form.mensagem} onChange={v => setForm({...form, mensagem:v})} />
              </div>
              <button type="submit" className="btn btn-orange btn-lg" style={{width:'100%', justifyContent:'center'}}>
                {sent ? 'Recebido! Retornaremos em até 48h' : <>Enviar proposta <Icon name="arrow" size={14} /></>}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, onChange, type='text', textarea=false }) {
  return (
    <label style={{display:'block'}}>
      <div className="mono" style={{fontSize: 10, color:'var(--ink-50)', letterSpacing:'.1em', marginBottom: 8}}>{label.toUpperCase()}</div>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={4} style={{
          width:'100%', padding:'12px 14px', background:'var(--paper)', border:'1px solid var(--line)', borderRadius: 8, fontSize: 14, fontFamily:'inherit', resize:'vertical'
        }} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} style={{
          width:'100%', padding:'12px 14px', background:'var(--paper)', border:'1px solid var(--line)', borderRadius: 8, fontSize: 14, fontFamily:'inherit'
        }} />
      )}
    </label>
  );
}

Object.assign(window, { PageParceiros });

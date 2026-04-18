// Inscrições / Eventos - Ticket purchase page
function PageInscricoes({ setPage }) {
  const events = [
    { id:'feira', n:'Feira de Exposição Multissetorial', d:'Acesso à feira durante os 3 dias de feira. Mais de 80 expositores.', price: 0, date:'20 — 22.08', c:'var(--laranja)', free: true, vagas: 'Livre' },
    { id:'palestra', n:'Palestra Magna', d:'Abertura oficial com referência nacional. Certificado incluso.', price: 80, date:'19.08 · 19h', c:'var(--laranja)', vagas: '1.200 vagas' },
    { id:'talk', n:'Talk Mulheres Empreendedoras', d:'Encontro dedicado à liderança feminina e empreendedorismo regional.', price: 50, date:'18.08 · 18h', c:'var(--ciano)', vagas: '400 vagas' },
    { id:'rodada-neg', n:'Rodada de Negócios', d:'Inscrição estratégica: encontros entre compradores e fornecedores pré-agendados.', price: 120, date:'18 — 20.08', c:'var(--laranja)', vagas: '300 vagas' },
    { id:'rodada-cred', n:'Rodada de Crédito', d:'Atendimento com bancos de fomento. Agendamento online obrigatório.', price: 0, date:'17 — 22.08', c:'var(--verde)', free: true, vagas: 'Agendamento' },
    { id:'oficinas', n:'Oficinas de Negócios (combo)', d:'Acesso a todas as oficinas da semana. Gestão, marketing e finanças.', price: 90, date:'17 — 22.08', c:'var(--verde)', vagas: '500 vagas' },
    { id:'plantao', n:'Plantão de Consultorias', d:'Agendamento com consultores especializados. Slots de 30 min.', price: 0, date:'17 — 22.08', c:'var(--ciano)', free: true, vagas: 'Por slot' },
  ];

  const [selected, setSelected] = useState({});
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ nome:'', email:'', cpf:'', fone:'', empresa:'' });
  const [confirmed, setConfirmed] = useState(false);

  const toggle = (id) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const chosen = events.filter(e => selected[e.id]);
  const total = chosen.reduce((a, e) => a + e.price, 0);

  const goNext = () => {
    if (step === 1 && chosen.length === 0) return;
    setStep(step + 1);
  };

  const finish = (e) => {
    e.preventDefault();
    setConfirmed(true);
  };

  const ticketCode = 'SE-' + Date.now().toString(36).toUpperCase();

  if (confirmed) {
    return (
      <div className="page-enter">
        <section style={{minHeight: '70vh', display:'grid', placeItems:'center', padding:'96px 0'}}>
          <div className="container" style={{maxWidth: 640, textAlign:'center'}}>
            <div style={{width: 80, height: 80, margin:'0 auto 32px', borderRadius:'50%', background:'var(--verde)', display:'grid', placeItems:'center'}}>
              <Icon name="check" size={40} stroke={2.5} />
            </div>
            <div className="eyebrow" style={{marginBottom: 16}}><span className="dot" style={{background:'var(--verde)'}}></span>INSCRIÇÃO CONFIRMADA</div>
            <h1 className="display" style={{fontSize:'clamp(40px, 5vw, 64px)', marginBottom: 20}}>Pronto, {form.nome.split(' ')[0] || 'você'}!</h1>
            <p style={{fontSize: 17, color:'var(--ink-70)', lineHeight: 1.6, marginBottom: 32}}>
              Enviamos seus ingressos e o comprovante para <strong>{form.email}</strong>. Você também pode acessar pela área de inscrições.
            </p>
            <div style={{background:'var(--ink)', color:'white', borderRadius: 16, padding: 32, textAlign:'left', marginBottom: 32}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 16}}>
                <div className="mono" style={{fontSize: 10, opacity:.6, letterSpacing:'.1em'}}>CÓDIGO DE INSCRIÇÃO</div>
                <div className="mono" style={{fontSize: 10, color:'var(--verde)', letterSpacing:'.1em'}}>● PAGO</div>
              </div>
              <div className="display" style={{fontSize: 28, letterSpacing:'-.02em', marginBottom: 20}}>{ticketCode}</div>
              <div style={{display:'flex', flexDirection:'column', gap: 8, paddingTop: 16, borderTop:'1px solid #2a2b52'}}>
                {chosen.map(e => (
                  <div key={e.id} style={{display:'flex', justifyContent:'space-between', fontSize: 13}}>
                    <span>{e.n}</span>
                    <span className="mono">{e.free ? 'GRÁTIS' : 'R$ ' + e.price}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:'flex', gap: 12, justifyContent:'center', flexWrap:'wrap'}}>
              <button className="btn btn-primary"><Icon name="download" size={14}/> Baixar ingresso</button>
              <button className="btn btn-ghost" onClick={() => { setConfirmed(false); setStep(1); setSelected({}); }}>Nova inscrição</button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <section style={{paddingBottom: 32}}>
        <div className="container">
          <div className="eyebrow" style={{marginBottom: 24}}><span className="dot"></span>INSCRIÇÕES · 6ª EDIÇÃO</div>
          <h1 className="display" style={{fontSize:'clamp(48px, 8vw, 120px)', maxWidth: 1100, marginBottom: 24}}>
            Garanta sua <span style={{color:'var(--laranja)'}}>vaga</span>.
          </h1>
          <p style={{fontSize: 18, color:'var(--ink-70)', maxWidth: 700, lineHeight: 1.6}}>
            Escolha os eventos que você vai participar. A entrada na feira é gratuita; palestras, talks e rodadas exigem inscrição específica.
          </p>

          {/* Progress */}
          <div style={{display:'flex', gap: 8, marginTop: 40, paddingTop: 32, borderTop:'1px solid var(--line)'}}>
            {['Escolha os eventos','Seus dados','Pagamento'].map((s, i) => (
              <div key={i} style={{flex: 1, padding:'14px 16px', borderRadius: 8, background: step === i+1 ? 'var(--ink)' : step > i+1 ? 'var(--verde)' : 'var(--paper-2)', color: step >= i+1 ? 'white' : 'var(--ink-70)'}}>
                <div className="mono" style={{fontSize: 10, opacity: .7, letterSpacing:'.1em'}}>ETAPA {i+1}</div>
                <div style={{fontSize: 14, fontWeight: 600, marginTop: 4}}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{paddingTop: 40}}>
        <div className="container">
          <div style={{display:'grid', gridTemplateColumns:'1fr 360px', gap: 32, alignItems:'flex-start'}} className="map-split">
            <div>
              {step === 1 && (
                <div>
                  <div className="eyebrow" style={{marginBottom: 24}}><span className="dot"></span>ESCOLHA SEUS EVENTOS</div>
                  <div style={{display:'grid', gap: 12}}>
                    {events.map(e => (
                      <button key={e.id} onClick={() => toggle(e.id)} style={{
                        padding: 24, background:'white', borderRadius: 14, textAlign:'left',
                        border: selected[e.id] ? `2px solid ${e.c}` : '1px solid var(--line)',
                        display:'grid', gridTemplateColumns:'auto 1fr auto', gap: 20, alignItems:'center',
                        transition:'all .15s'
                      }}>
                        <div style={{width: 24, height: 24, borderRadius: 6, border: `2px solid ${selected[e.id] ? e.c : 'var(--line)'}`, background: selected[e.id] ? e.c : 'white', display:'grid', placeItems:'center', color:'white'}}>
                          {selected[e.id] && <Icon name="check" size={14} stroke={3} />}
                        </div>
                        <div>
                          <div style={{display:'flex', alignItems:'center', gap: 10, marginBottom: 6}}>
                            <span className="mono" style={{fontSize: 10, color:'var(--ink-50)', letterSpacing:'.1em'}}>{e.date}</span>
                            <span style={{width: 3, height: 3, borderRadius:'50%', background:'var(--ink-50)'}}></span>
                            <span className="mono" style={{fontSize: 10, color:'var(--ink-50)', letterSpacing:'.1em'}}>{e.vagas}</span>
                          </div>
                          <div className="display" style={{fontSize: 22, letterSpacing:'-.02em', marginBottom: 4}}>{e.n}</div>
                          <div style={{fontSize: 13.5, color:'var(--ink-70)', lineHeight: 1.5}}>{e.d}</div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          {e.free ? (
                            <div style={{padding:'6px 12px', background: 'var(--verde)', color:'#1a3300', borderRadius: 999, fontSize: 11, fontWeight: 600, fontFamily:'JetBrains Mono', letterSpacing:'.06em'}}>GRÁTIS</div>
                          ) : (
                            <div className="display" style={{fontSize: 28, letterSpacing:'-.02em'}}>R$ {e.price}</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div style={{background:'white', borderRadius: 16, padding: 40, border:'1px solid var(--line)'}}>
                  <div className="eyebrow" style={{marginBottom: 20}}><span className="dot"></span>SEUS DADOS</div>
                  <h2 className="display" style={{fontSize: 32, marginBottom: 32}}>Quem está se inscrevendo?</h2>
                  <div style={{display:'grid', gap: 20}}>
                    <InscField label="Nome completo" value={form.nome} onChange={v => setForm({...form, nome:v})} />
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 20}}>
                      <InscField label="E-mail" type="email" value={form.email} onChange={v => setForm({...form, email:v})} />
                      <InscField label="Telefone" value={form.fone} onChange={v => setForm({...form, fone:v})} />
                    </div>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 20}}>
                      <InscField label="CPF" value={form.cpf} onChange={v => setForm({...form, cpf:v})} />
                      <InscField label="Empresa (opcional)" value={form.empresa} onChange={v => setForm({...form, empresa:v})} />
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <form onSubmit={finish} style={{background:'white', borderRadius: 16, padding: 40, border:'1px solid var(--line)'}}>
                  <div className="eyebrow" style={{marginBottom: 20}}><span className="dot"></span>PAGAMENTO</div>
                  <h2 className="display" style={{fontSize: 32, marginBottom: 32}}>Como você quer pagar?</h2>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 12, marginBottom: 32}}>
                    {['PIX','Cartão','Boleto'].map((m,i) => (
                      <label key={m} style={{padding: 20, border:'1px solid var(--line)', borderRadius: 12, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap: 10}}>
                        <input type="radio" name="pay" defaultChecked={i === 0} />
                        <div style={{fontWeight: 600}}>{m}</div>
                        {m === 'PIX' && <div style={{fontSize: 11, color:'var(--verde-600)', fontWeight: 600}}>5% desconto</div>}
                      </label>
                    ))}
                  </div>
                  <div style={{padding: 20, background:'var(--paper-2)', borderRadius: 10, marginBottom: 20}}>
                    <div className="mono" style={{fontSize: 10, color:'var(--ink-50)', letterSpacing:'.1em', marginBottom: 12}}>PIX · QR CODE</div>
                    <div style={{display:'grid', gridTemplateColumns:'auto 1fr', gap: 20, alignItems:'center'}}>
                      <div style={{width: 110, height: 110, background:`repeating-conic-gradient(var(--ink) 0 25%, white 0 50%)`, backgroundSize:'16px 16px', borderRadius: 6}}></div>
                      <div>
                        <div style={{fontSize: 13, color:'var(--ink-70)', marginBottom: 8}}>Pague agora pelo app do seu banco.</div>
                        <div className="display" style={{fontSize: 28, letterSpacing:'-.02em'}}>R$ {(total * 0.95).toFixed(2).replace('.',',')}</div>
                        <div style={{fontSize: 11, color:'var(--ink-50)'}}>com 5% de desconto PIX</div>
                      </div>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary btn-lg" style={{width:'100%', justifyContent:'center'}}>
                    Confirmar pagamento <Icon name="arrow" size={16} />
                  </button>
                </form>
              )}

              {/* Nav */}
              <div style={{display:'flex', justifyContent:'space-between', marginTop: 24}}>
                {step > 1 ? <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>← Voltar</button> : <span />}
                {step < 3 && (
                  <button className="btn btn-primary" onClick={goNext} disabled={chosen.length === 0 && step === 1}>
                    Avançar <Icon name="arrow" size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Summary */}
            <div style={{position:'sticky', top: 88, background:'var(--ink)', color:'white', borderRadius: 16, padding: 28}}>
              <div className="mono" style={{fontSize: 10, opacity:.6, letterSpacing:'.1em', marginBottom: 16}}>RESUMO DA INSCRIÇÃO</div>
              {chosen.length === 0 ? (
                <div style={{fontSize: 14, opacity: .7, lineHeight: 1.5, padding:'32px 0', textAlign:'center'}}>Selecione pelo menos um evento para continuar.</div>
              ) : (
                <>
                  <div style={{display:'flex', flexDirection:'column', gap: 10, marginBottom: 20}}>
                    {chosen.map(e => (
                      <div key={e.id} style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap: 12}}>
                        <div>
                          <div style={{fontSize: 13, fontWeight: 500}}>{e.n}</div>
                          <div className="mono" style={{fontSize: 10, opacity: .6, letterSpacing:'.05em', marginTop: 2}}>{e.date}</div>
                        </div>
                        <div className="mono" style={{fontSize: 13, whiteSpace:'nowrap'}}>{e.free ? 'Grátis' : 'R$ ' + e.price}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{paddingTop: 16, borderTop:'1px solid #2a2b52', display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
                    <div className="mono" style={{fontSize: 10, opacity:.6, letterSpacing:'.1em'}}>TOTAL</div>
                    <div className="display" style={{fontSize: 32, letterSpacing:'-.02em'}}>R$ {total}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Área do inscrito */}
      <section>
        <div className="container">
          <div style={{background:'var(--paper-2)', borderRadius: 16, padding:'48px 40px', display:'grid', gridTemplateColumns:'1fr auto', gap: 32, alignItems:'center'}} className="about-intro">
            <div>
              <div className="eyebrow" style={{marginBottom: 12}}><span className="dot"></span>JÁ SE INSCREVEU?</div>
              <h3 className="display" style={{fontSize: 32, marginBottom: 8}}>Acesse suas inscrições</h3>
              <p style={{color:'var(--ink-70)', fontSize: 15}}>Baixe ingressos, emita certificados e acompanhe sua agenda do evento.</p>
            </div>
            <button className="btn btn-primary btn-lg">Entrar na minha conta <Icon name="arrow" size={14}/></button>
          </div>
        </div>
      </section>
    </div>
  );
}

function InscField({ label, value, onChange, type='text' }) {
  return (
    <label style={{display:'block'}}>
      <div className="mono" style={{fontSize: 10, color:'var(--ink-50)', letterSpacing:'.1em', marginBottom: 8}}>{label.toUpperCase()}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} style={{
        width:'100%', padding:'14px 16px', background:'var(--paper)', border:'1px solid var(--line)', borderRadius: 8, fontSize: 15, fontFamily:'inherit'
      }} />
    </label>
  );
}

Object.assign(window, { PageInscricoes });

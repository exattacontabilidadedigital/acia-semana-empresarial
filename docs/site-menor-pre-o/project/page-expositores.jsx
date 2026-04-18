// Expositores + Mapa de Stands
function PageExpositores({ setPage }) {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('todos');
  const [cart, setCart] = useState([]);

  // Stand data — 4 rows × 12 cols approximately, with named zones
  // status: available, reserved, sold, blocked (not for sale / aisle)
  const stands = useMemo(() => buildStands(), []);

  const legendMap = {
    available: { label:'Disponível', c: 'white', fg:'var(--ink)', border:'var(--line)' },
    reserved: { label:'Reservado', c: '#fff5e0', fg:'var(--laranja-600)', border:'var(--laranja)' },
    sold: { label:'Vendido', c: 'var(--ink)', fg:'white', border:'var(--ink)' },
    premium: { label:'Premium', c: 'var(--laranja)', fg:'white', border:'var(--laranja)' },
    corner: { label:'Esquina', c: 'var(--verde)', fg:'#1a3300', border:'var(--verde)' },
  };

  const filteredStands = stands.filter(s => {
    if (filter === 'todos') return true;
    if (filter === 'disponiveis') return s.status === 'available' || s.status === 'premium' || s.status === 'corner';
    return s.status === filter;
  });

  const filteredSet = new Set(filteredStands.map(s => s.id));

  const exhibitors = [
    { name:'Vale', cat:'Indústria', c:'var(--verde)' },
    { name:'Suzano', cat:'Indústria', c:'var(--verde)' },
    { name:'Gerdau', cat:'Indústria', c:'var(--laranja)' },
    { name:'Caixa', cat:'Financeiro', c:'var(--laranja)' },
    { name:'Banco do Brasil', cat:'Financeiro', c:'var(--laranja)' },
    { name:'Sicoob', cat:'Financeiro', c:'var(--verde)' },
    { name:'Sebrae', cat:'Institucional', c:'var(--ciano)' },
    { name:'Fiema', cat:'Institucional', c:'var(--laranja)' },
    { name:'Senai', cat:'Educação', c:'var(--laranja)' },
    { name:'Senac', cat:'Educação', c:'var(--laranja)' },
    { name:'IFMA', cat:'Educação', c:'var(--laranja)' },
    { name:'Light Veículos', cat:'Automotivo', c:'var(--ciano)' },
    { name:'Agro Açailândia', cat:'Agronegócio', c:'var(--verde)' },
    { name:'Tec Norte', cat:'Tecnologia', c:'var(--laranja)' },
    { name:'Constrular', cat:'Construção', c:'var(--laranja)' },
    { name:'Casa & Lar', cat:'Varejo', c:'var(--ciano)' },
    { name:'Sicredi', cat:'Financeiro', c:'var(--verde)' },
    { name:'Banco do Nordeste', cat:'Financeiro', c:'var(--laranja)' },
    { name:'Sesi', cat:'Institucional', c:'var(--laranja)' },
    { name:'CEMAR', cat:'Energia', c:'var(--verde)' },
  ];

  const categories = ['Todos', 'Indústria','Financeiro','Institucional','Educação','Automotivo','Agronegócio','Tecnologia','Construção','Varejo','Energia'];
  const [cat, setCat] = useState('Todos');
  const filteredExh = exhibitors.filter(e => cat === 'Todos' || e.cat === cat);

  const toggleStand = (s) => {
    if (s.status === 'sold' || s.status === 'reserved' || s.status === 'blocked') return;
    setSelected(s);
  };

  const addToCart = () => {
    if (selected && !cart.find(c => c.id === selected.id)) {
      setCart([...cart, selected]);
    }
    setSelected(null);
  };

  const removeFromCart = (id) => setCart(cart.filter(c => c.id !== id));

  const total = cart.reduce((acc, s) => acc + s.price, 0);

  return (
    <div className="page-enter">
      <section style={{paddingBottom: 40}}>
        <div className="container">
          <div className="eyebrow" style={{marginBottom: 24}}><span className="dot"></span>EXPOSITORES</div>
          <h1 className="display" style={{fontSize:'clamp(48px, 8vw, 120px)', maxWidth: 1100, marginBottom: 32}}>
            Seu stand na maior <span style={{color:'var(--verde)'}}>feira</span> do sudoeste maranhense.
          </h1>
          <p style={{fontSize: 18, color:'var(--ink-70)', maxWidth: 700, lineHeight: 1.6}}>
            Mais de 80 expositores em 6.000 m² de feira. Escolha seu stand no mapa, reserve online e garanta visibilidade para 7.200+ visitantes.
          </p>
        </div>
      </section>

      {/* Exhibitors that already exposed */}
      <section style={{paddingTop: 0, paddingBottom: 64}}>
        <div className="container">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap: 16, marginBottom: 32}}>
            <div>
              <div className="eyebrow" style={{marginBottom: 16}}><span className="dot"></span>QUEM JÁ EXPÔS</div>
              <h2 className="display" style={{fontSize:'clamp(28px, 3.5vw, 44px)'}}>+80 marcas nas últimas edições</h2>
            </div>
            <div style={{display:'flex', flexWrap:'wrap', gap: 6}}>
              {categories.slice(0,6).map(c => (
                <button key={c} onClick={() => setCat(c)} style={{
                  padding:'8px 14px', fontSize: 12, borderRadius: 999, fontWeight: 500,
                  border: cat === c ? '1px solid var(--ink)' : '1px solid var(--line)',
                  background: cat === c ? 'var(--ink)' : 'white',
                  color: cat === c ? 'white' : 'var(--ink-70)'
                }}>{c}</button>
              ))}
            </div>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap: 12}} className="exhibitor-grid">
            {filteredExh.map((e, i) => (
              <div key={i} style={{padding:'24px 18px', background:'white', border:'1px solid var(--line)', borderRadius: 10, display:'flex', flexDirection:'column', gap: 14, minHeight: 140}}>
                <div style={{display:'flex', alignItems:'center', gap: 10}}>
                  <span style={{width: 8, height: 8, borderRadius:'50%', background: e.c}}></span>
                  <span className="mono" style={{fontSize: 10, color:'var(--ink-50)', letterSpacing:'.1em'}}>{e.cat.toUpperCase()}</span>
                </div>
                <div style={{fontFamily:'Space Grotesk', fontWeight:700, fontSize: 22, letterSpacing:'-.02em', marginTop:'auto'}}>{e.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MAP */}
      <section style={{background:'var(--paper-2)', paddingTop: 80, paddingBottom: 80}}>
        <div className="container">
          <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom: 32, flexWrap:'wrap', gap: 16}}>
            <div>
              <div className="eyebrow" style={{marginBottom: 16}}><span className="dot"></span>MAPA DE STANDS · 2026</div>
              <h2 className="display" style={{fontSize:'clamp(36px, 5vw, 64px)'}}>Escolha sua posição.</h2>
            </div>
            <div style={{display:'flex', gap: 20, fontSize: 13, flexWrap:'wrap'}}>
              {Object.entries(legendMap).map(([k, v]) => (
                <div key={k} style={{display:'flex', alignItems:'center', gap: 8}}>
                  <span style={{width: 14, height: 14, borderRadius: 3, background: v.c, border: `1.5px solid ${v.border}`}}></span>
                  <span style={{color:'var(--ink-70)'}}>{v.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{display:'flex', gap: 6, marginBottom: 24, flexWrap:'wrap'}}>
            {[
              {id:'todos', l:`Todos (${stands.filter(s => s.status !== 'blocked').length})`},
              {id:'disponiveis', l:`Disponíveis (${stands.filter(s => ['available','premium','corner'].includes(s.status)).length})`},
              {id:'premium', l:`Premium (${stands.filter(s => s.status === 'premium').length})`},
              {id:'corner', l:`Esquina (${stands.filter(s => s.status === 'corner').length})`},
              {id:'sold', l:`Vendidos (${stands.filter(s => s.status === 'sold').length})`},
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                padding:'8px 16px', fontSize: 13, borderRadius: 999, fontWeight: 500,
                border: filter === f.id ? '1px solid var(--ink)' : '1px solid var(--line)',
                background: filter === f.id ? 'var(--ink)' : 'white',
                color: filter === f.id ? 'white' : 'var(--ink-70)'
              }}>{f.l}</button>
            ))}
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 340px', gap: 24, alignItems:'flex-start'}} className="map-split">
            {/* Map canvas */}
            <div style={{background:'white', borderRadius: 16, padding: 32, border:'1px solid var(--line)', overflow:'auto'}}>
              <div style={{minWidth: 720, position:'relative'}}>
                {/* Entrance markers */}
                <div style={{display:'flex', justifyContent:'space-between', marginBottom: 12}}>
                  <span className="mono" style={{fontSize: 11, color:'var(--ink-50)', letterSpacing:'.1em', padding:'4px 10px', background:'var(--paper-2)', borderRadius: 4}}>↓ ENTRADA PRINCIPAL</span>
                  <span className="mono" style={{fontSize: 11, color:'var(--ink-50)', letterSpacing:'.1em', padding:'4px 10px', background:'var(--paper-2)', borderRadius: 4}}>PALCO →</span>
                </div>

                <StandMap stands={stands} selected={selected} filteredSet={filteredSet} cart={cart} onSelect={toggleStand} legendMap={legendMap} />

                <div style={{display:'flex', justifyContent:'space-between', marginTop: 12}}>
                  <span className="mono" style={{fontSize: 11, color:'var(--ink-50)', letterSpacing:'.1em', padding:'4px 10px', background:'var(--paper-2)', borderRadius: 4}}>↑ PRAÇA DE ALIMENTAÇÃO</span>
                  <span className="mono" style={{fontSize: 11, color:'var(--ink-50)', letterSpacing:'.1em', padding:'4px 10px', background:'var(--paper-2)', borderRadius: 4}}>ESTACIONAMENTO →</span>
                </div>
              </div>
            </div>

            {/* Sidebar: details + cart */}
            <div style={{display:'flex', flexDirection:'column', gap: 16, position:'sticky', top: 88}}>
              {selected ? (
                <div style={{background:'white', borderRadius: 16, padding: 28, border:'1px solid var(--line)'}}>
                  <div className="mono" style={{fontSize: 10, color:'var(--ink-50)', letterSpacing:'.1em', marginBottom: 8}}>STAND SELECIONADO</div>
                  <div className="display" style={{fontSize: 48, letterSpacing:'-.03em', lineHeight: 1}}>{selected.id}</div>
                  <div style={{marginTop: 14, display:'flex', alignItems:'center', gap: 8}}>
                    <span style={{width: 10, height: 10, borderRadius: 2, background: legendMap[selected.status].c, border:`1.5px solid ${legendMap[selected.status].border}`}}></span>
                    <span style={{fontSize: 14, fontWeight: 500}}>{legendMap[selected.status].label}</span>
                  </div>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12, marginTop: 20, paddingTop: 20, borderTop:'1px solid var(--line)'}}>
                    <div>
                      <div className="mono" style={{fontSize: 10, color:'var(--ink-50)', letterSpacing:'.1em'}}>ÁREA</div>
                      <div style={{fontSize: 20, fontWeight: 600, marginTop: 4}}>{selected.size} m²</div>
                    </div>
                    <div>
                      <div className="mono" style={{fontSize: 10, color:'var(--ink-50)', letterSpacing:'.1em'}}>SETOR</div>
                      <div style={{fontSize: 20, fontWeight: 600, marginTop: 4}}>{selected.sector}</div>
                    </div>
                  </div>
                  <div style={{marginTop: 24}}>
                    <div className="mono" style={{fontSize: 10, color:'var(--ink-50)', letterSpacing:'.1em'}}>INVESTIMENTO</div>
                    <div className="display" style={{fontSize: 36, letterSpacing:'-.02em', marginTop: 4}}>R$ {selected.price.toLocaleString('pt-BR')}</div>
                  </div>
                  <button className="btn btn-primary btn-lg" style={{width:'100%', justifyContent:'center', marginTop: 20}} onClick={addToCart}>
                    Adicionar à reserva <Icon name="arrow" size={14} />
                  </button>
                </div>
              ) : (
                <div style={{background:'white', borderRadius: 16, padding: 28, border:'1px solid var(--line)', textAlign:'center'}}>
                  <div style={{width: 56, height: 56, background:'var(--paper-2)', borderRadius:'50%', margin:'0 auto 16px', display:'grid', placeItems:'center'}}>
                    <Icon name="pin" size={24} />
                  </div>
                  <h4 style={{fontFamily:'Space Grotesk', fontSize: 18, letterSpacing:'-.01em', marginBottom: 6}}>Selecione um stand</h4>
                  <p style={{fontSize: 13, color:'var(--ink-70)'}}>Clique em qualquer stand disponível para ver detalhes e reservar.</p>
                </div>
              )}

              {cart.length > 0 && (
                <div style={{background:'var(--ink)', color:'white', borderRadius: 16, padding: 24}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 16}}>
                    <div className="mono" style={{fontSize: 10, opacity:.6, letterSpacing:'.1em'}}>SUA RESERVA ({cart.length})</div>
                    <div className="mono" style={{fontSize: 10, color:'var(--verde)', letterSpacing:'.1em'}}>● PRÉ-RESERVA</div>
                  </div>
                  <div style={{display:'flex', flexDirection:'column', gap: 10, marginBottom: 16}}>
                    {cart.map(s => (
                      <div key={s.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', background:'#2a2b52', borderRadius: 8}}>
                        <div>
                          <div style={{fontWeight: 600, fontSize: 14}}>{s.id}</div>
                          <div style={{fontSize: 11, opacity: .7}}>{s.size}m² · {s.sector}</div>
                        </div>
                        <div style={{display:'flex', alignItems:'center', gap: 12}}>
                          <div className="mono" style={{fontSize: 13}}>R$ {s.price.toLocaleString('pt-BR')}</div>
                          <button onClick={() => removeFromCart(s.id)} style={{width: 20, height: 20, borderRadius:'50%', background:'rgba(255,255,255,.1)', color:'white', fontSize: 11}}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', paddingTop: 16, borderTop:'1px solid #2a2b52'}}>
                    <div>
                      <div className="mono" style={{fontSize: 10, opacity:.6, letterSpacing:'.1em'}}>TOTAL</div>
                      <div className="display" style={{fontSize: 28, letterSpacing:'-.02em', marginTop: 4}}>R$ {total.toLocaleString('pt-BR')}</div>
                    </div>
                  </div>
                  <button className="btn btn-orange" style={{width:'100%', justifyContent:'center', marginTop: 16}}>
                    Ir para pagamento <Icon name="arrow" size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Info blocks */}
      <section>
        <div className="container">
          <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 16}}>
            {[
              { t:'O que inclui', i:[['Espaço construído e montado'],['Energia 220v · iluminação'],['Identificação frontal'],['1 mesa · 4 cadeiras'],['Wi-fi · limpeza'],['4 credenciais expositor']], c:'var(--laranja)' },
              { t:'Como reservar', i:[['1. Escolha o stand no mapa'],['2. Adicione à sua reserva'],['3. Preencha dados da empresa'],['4. Pagamento em até 5x'],['5. Receba contrato digital'],['6. Confirmação em 24h']], c:'var(--laranja)' },
              { t:'Prazos', i:[['Pré-reserva: até 20.07'],['Pagamento: até 31.07'],['Montagem: 18 e 19.08'],['Abertura: 20.08 · 14h'],['Desmontagem: 23.08'],['Suporte 24h durante evento']], c:'var(--verde)' },
            ].map((b,i) => (
              <div key={i} style={{background:'white', border:'1px solid var(--line)', borderRadius: 14, padding: 32}}>
                <div style={{display:'flex', alignItems:'center', gap: 10, marginBottom: 18}}>
                  <span style={{width: 8, height: 8, borderRadius:'50%', background: b.c}}></span>
                  <span className="mono" style={{fontSize: 11, color:'var(--ink-50)', letterSpacing:'.1em'}}>{String(i+1).padStart(2,'0')}</span>
                </div>
                <h3 className="display" style={{fontSize: 24, marginBottom: 18, letterSpacing:'-.02em'}}>{b.t}</h3>
                <ul style={{listStyle:'none', display:'flex', flexDirection:'column', gap: 8}}>
                  {b.i.map((it,j) => (
                    <li key={j} style={{fontSize: 14, color:'var(--ink-70)', display:'flex', alignItems:'flex-start', gap: 8}}>
                      <span style={{color: b.c, marginTop: 2}}><Icon name="check" size={14} /></span>
                      <span>{it[0]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function buildStands() {
  const stands = [];
  // 4 rows (A-D) × 10 cols
  // Corners: col 1 and 10 are corner stands (larger)
  // Row A and D: bordering walls — standard
  // Row B, C: inner
  const rows = ['A','B','C','D'];
  const sectors = {
    'A': 'Indústria',
    'B': 'Serviços',
    'C': 'Financeiro',
    'D': 'Varejo',
  };
  // Predetermined sold/reserved to feel realistic
  const sold = new Set(['A01','A02','A05','A06','B03','B07','B08','C02','C05','C09','D01','D04','D06','D10']);
  const reserved = new Set(['A08','B01','C06','D03','D08']);

  for (let r = 0; r < rows.length; r++) {
    for (let c = 1; c <= 10; c++) {
      const id = `${rows[r]}${String(c).padStart(2,'0')}`;
      const isCorner = c === 1 || c === 10;
      const isPremium = (rows[r] === 'A' || rows[r] === 'D') && c >= 4 && c <= 7;
      const size = isCorner ? 24 : (isPremium ? 20 : 12);
      const basePrice = isCorner ? 18000 : (isPremium ? 14000 : 8500);
      let status = 'available';
      if (sold.has(id)) status = 'sold';
      else if (reserved.has(id)) status = 'reserved';
      else if (isCorner) status = 'corner';
      else if (isPremium) status = 'premium';
      stands.push({
        id, row: rows[r], col: c,
        size, price: basePrice,
        sector: sectors[rows[r]],
        status,
        wide: isCorner
      });
    }
  }
  return stands;
}

function StandMap({ stands, selected, filteredSet, cart, onSelect, legendMap }) {
  // Render as CSS grid
  const cartIds = new Set(cart.map(c => c.id));

  return (
    <div style={{display:'flex', flexDirection:'column', gap: 4}}>
      {['A','B','C','D'].map((row, ri) => {
        const rowStands = stands.filter(s => s.row === row);
        return (
          <React.Fragment key={row}>
            {/* Aisle */}
            {ri === 2 && (
              <div style={{height: 28, background:'repeating-linear-gradient(90deg, var(--paper-2) 0 20px, transparent 20px 30px)', borderRadius: 4, display:'grid', placeItems:'center', margin:'2px 0'}}>
                <span className="mono" style={{fontSize: 10, color:'var(--ink-50)', letterSpacing:'.2em'}}>CORREDOR CENTRAL</span>
              </div>
            )}
            <div style={{display:'grid', gridTemplateColumns:'30px repeat(10, 1fr)', gap: 4, alignItems:'stretch'}}>
              <div style={{display:'grid', placeItems:'center', fontFamily:'Space Grotesk', fontWeight: 700, fontSize: 14, color:'var(--ink-50)'}}>{row}</div>
              {rowStands.map(s => {
                const st = legendMap[s.status];
                const isSelected = selected?.id === s.id;
                const inCart = cartIds.has(s.id);
                const dim = filteredSet.size > 0 && !filteredSet.has(s.id);
                return (
                  <button key={s.id} onClick={() => onSelect(s)} disabled={s.status === 'sold' || s.status === 'reserved'} style={{
                    aspectRatio: '1.2/1', borderRadius: 6, padding: 4,
                    background: inCart ? 'var(--ink)' : (isSelected ? 'var(--laranja)' : st.c),
                    color: inCart || isSelected ? 'white' : st.fg,
                    border: inCart || isSelected ? '2px solid var(--laranja)' : `1.5px solid ${st.border}`,
                    cursor: (s.status === 'sold' || s.status === 'reserved') ? 'not-allowed' : 'pointer',
                    opacity: dim ? 0.3 : 1,
                    transition: 'all .15s',
                    display:'flex', flexDirection:'column', justifyContent:'space-between',
                    fontSize: 10, fontFamily:'JetBrains Mono', letterSpacing:'.02em',
                    position:'relative', overflow:'hidden'
                  }}>
                    <div style={{textAlign:'left', fontWeight: 600}}>{s.id}</div>
                    <div style={{textAlign:'right', fontSize: 9, opacity:.75}}>{s.size}m²</div>
                  </button>
                );
              })}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

Object.assign(window, { PageExpositores });

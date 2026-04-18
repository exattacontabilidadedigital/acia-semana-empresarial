// Shared components: Nav, Footer, icons, placeholders
const { useState, useEffect, useRef, useMemo } = React;

const PAGES = [
  { id: 'home', label: 'Início' },
  { id: 'sobre', label: 'Sobre' },
  { id: 'edicoes', label: 'Edições' },
  { id: 'parceiros', label: 'Parceiros' },
  { id: 'expositores', label: 'Expositores' },
  { id: 'inscricoes', label: 'Inscrições' },
];

function Icon({ name, size = 16, stroke = 1.6 }) {
  const paths = {
    arrow: 'M5 12h14M13 6l6 6-6 6',
    arrowUpRight: 'M7 17L17 7M8 7h9v9',
    check: 'M5 12l5 5L20 7',
    play: 'M8 5v14l11-7L8 5z',
    calendar: 'M3 9h18M7 3v4M17 3v4M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
    pin: 'M12 22s-7-7.5-7-13a7 7 0 1 1 14 0c0 5.5-7 13-7 13z M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
    grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
    chart: 'M3 3v18h18 M7 14l4-4 4 4 5-5',
    spark: 'M12 2l2.3 6.9L21 11l-6.7 2.1L12 20l-2.3-6.9L3 11l6.7-2.1L12 2z',
    mic: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v3',
    ticket: 'M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8z M13 6v12',
    download: 'M12 3v12 M7 10l5 5 5-5 M5 21h14',
    instagram: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z M16 11.4a4 4 0 1 1-8 0 4 4 0 0 1 8 0z M17.5 6.5v.01',
    facebook: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z',
    youtube: 'M22 8.5a3 3 0 0 0-2.1-2.1c-1.9-.5-9.9-.5-9.9-.5s-8 0-9.9.5A3 3 0 0 0 2 8.5C1.5 10.4 1.5 12 1.5 12s0 1.6.5 3.5A3 3 0 0 0 4.1 17.6c1.9.5 9.9.5 9.9.5s8 0 9.9-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-3.5.5-3.5s0-1.6-.5-3.5z M10 15.5l5-3.5-5-3.5v7z',
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  );
}

function BrandMark() {
  return (
    <div className="brand-mark">
      <div style={{position:'relative', zIndex:2, color:'white', fontFamily:'Space Grotesk', fontWeight:700, fontSize:14, letterSpacing:'-0.02em'}}>SE</div>
    </div>
  );
}

function Nav({ page, setPage }) {
  return (
    <nav className="nav">
      <div className="container nav-inner">
        <div className="brand" onClick={() => setPage('home')} style={{cursor:'pointer', display:'flex', alignItems:'center'}}>
          <img src="assets/logo-semana-nav.png" alt="Semana Empresarial Açailândia" style={{height: 48, width:'auto', display:'block'}}/>
        </div>
        <div className="nav-links">
          {PAGES.map(p => (
            <button key={p.id} className={`nav-link ${page === p.id ? 'active' : ''}`} onClick={() => setPage(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <div style={{display:'flex', gap: 8, alignItems:'center'}}>
          <button className="nav-link" onClick={() => setPage('inscricoes')} style={{fontSize: 13}}>Minhas inscrições</button>
          <button className="nav-cta" onClick={() => setPage('inscricoes')} style={{background:'transparent', color:'var(--laranja)'}}>
            Garantir ingresso
            <span className="arr"><Icon name="arrow" size={14} /></span>
          </button>
        </div>
      </div>
    </nav>
  );
}

function Footer({ setPage }) {
  return (
    <footer>
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <div className="brand" style={{marginBottom: 20, display:'flex', alignItems:'center'}}>
              <img src="assets/logo-semana-rodape.png" alt="Semana Empresarial Açailândia" style={{height: 72, width:'auto', display:'block'}}/>
            </div>
            <p style={{fontSize: 14, lineHeight: 1.6, color:'#a0a2c2', maxWidth: 320}}>
              Gente que pensa negócios que evoluem. O maior evento empresarial do sudoeste maranhense.
            </p>
            <div style={{marginTop: 24}}>
              <div className="mono" style={{fontSize: 10, color:'#8a8ca8', letterSpacing:'.14em', marginBottom: 10}}>REALIZAÇÃO</div>
              <div style={{display:'flex', flexWrap:'wrap', gap: 6}}>
                {['ACIA','SICA','CDL','SEBRAE'].map(r => (
                  <span key={r} style={{padding:'6px 12px', borderRadius: 6, background:'#2a2b52', fontFamily:'Space Grotesk', fontWeight:600, fontSize: 11, color:'white', letterSpacing:'-.01em'}}>{r}</span>
                ))}
              </div>
            </div>
            <div style={{display:'flex', gap: 12, marginTop: 24}}>
              <a href="#" style={{width: 36, height: 36, borderRadius: 8, background:'#2a2b52', display:'grid', placeItems:'center'}}><Icon name="instagram" size={16}/></a>
              <a href="#" style={{width: 36, height: 36, borderRadius: 8, background:'#2a2b52', display:'grid', placeItems:'center'}}><Icon name="facebook" size={16}/></a>
              <a href="#" style={{width: 36, height: 36, borderRadius: 8, background:'#2a2b52', display:'grid', placeItems:'center'}}><Icon name="youtube" size={16}/></a>
            </div>
          </div>
          <div className="footer-col">
            <h5>Navegue</h5>
            <ul>
              {PAGES.map(p => <li key={p.id}><a onClick={() => setPage(p.id)} style={{cursor:'pointer'}}>{p.label}</a></li>)}
            </ul>
          </div>
          <div className="footer-col">
            <h5>Participe</h5>
            <ul>
              <li><a>Quero ser expositor</a></li>
              <li><a>Quero ser parceiro</a></li>
              <li><a>Inscreva-se</a></li>
              <li><a>Área do credenciado</a></li>
              <li><a>Emissão de certificado</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h5>Contato</h5>
            <ul>
              <li>Açailândia — MA</li>
              <li>acia.aca@gmail.com</li>
              <li>+55 99 98833-4432</li>
              <li style={{marginTop: 12}}><a>Imprensa</a></li>
              <li><a>Termos de uso</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <div>© 2026 SEMANA EMPRESARIAL DE AÇAILÂNDIA</div>
          <div>17 — 22 DE AGOSTO · 2026</div>
        </div>
      </div>
    </footer>
  );
}

// Placeholder: labeled visual block with diagonal lines
function Ph({ label = 'IMAGEM', h = 200, dark = false, style = {}, tint }) {
  const s = { height: h, ...style };
  if (tint) s.background = `linear-gradient(135deg, ${tint} 0%, ${tint}ee 100%)`;
  return (
    <div className={`ph ${dark ? 'dark' : ''}`} style={s}>
      <span>{label}</span>
    </div>
  );
}

Object.assign(window, { Icon, Nav, Footer, BrandMark, Ph, PAGES });

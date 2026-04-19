import Link from 'next/link'
import Image from 'next/image'
import { Instagram, Facebook, Youtube } from 'lucide-react'

const PAGES = [
  { href: '/', label: 'Início' },
  { href: '/sobre', label: 'Sobre' },
  { href: '/edicoes', label: 'Edições' },
  { href: '/parceiros', label: 'Parceiros' },
  { href: '/expositores', label: 'Expositores' },
  { href: '/inscricoes', label: 'Inscrições' },
]

const REALIZADORES = ['ACIA', 'SICA', 'CDL', 'SEBRAE']

export default function Footer() {
  return (
    <footer className="bg-ink text-[#d4d5e8] pt-20 pb-8">
      <div className="container-site">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-12">
          {/* Brand col */}
          <div>
            <Link href="/" className="inline-flex items-center mb-5">
              <Image
                src="/site/logo-semana-rodape.png"
                alt="Semana Empresarial Açailândia"
                width={216}
                height={72}
                className="h-[72px] w-auto block"
              />
            </Link>
            <p
              className="leading-relaxed text-[#a0a2c2] max-w-xs"
              style={{ fontSize: 14 }}
            >
              Gente que pensa negócios que evoluem. O maior evento empresarial do sudoeste
              maranhense.
            </p>
            <div className="mt-6">
              <div className="mono text-[10px] text-[#8a8ca8] tracking-[0.14em] mb-2.5">
                REALIZAÇÃO
              </div>
              <div className="flex flex-wrap gap-1.5">
                {REALIZADORES.map((r) => (
                  <span
                    key={r}
                    className="display px-3 py-1.5 rounded-md bg-[#2a2b52] text-white text-[11px] tracking-[-0.01em]"
                    style={{ fontWeight: 600 }}
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <a
                href="https://www.instagram.com/aciaacailandia"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-lg bg-[#2a2b52] grid place-items-center hover:text-white transition-colors"
              >
                <Instagram size={16} />
              </a>
              <a
                href="https://www.facebook.com/aciaacailandia"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-9 h-9 rounded-lg bg-[#2a2b52] grid place-items-center hover:text-white transition-colors"
              >
                <Facebook size={16} />
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="w-9 h-9 rounded-lg bg-[#2a2b52] grid place-items-center hover:text-white transition-colors"
              >
                <Youtube size={16} />
              </a>
            </div>
          </div>

          {/* Navegue */}
          <div>
            <h5 className="mono text-[11px] tracking-[0.14em] uppercase text-[#8a8ca8] mb-4 font-medium">
              Navegue
            </h5>
            <ul className="flex flex-col gap-2.5" style={{ fontSize: 14 }}>
              {PAGES.map((p) => (
                <li key={p.href}>
                  <Link href={p.href} className="hover:text-white transition-colors">
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Participe */}
          <div>
            <h5 className="mono text-[11px] tracking-[0.14em] uppercase text-[#8a8ca8] mb-4 font-medium">
              Participe
            </h5>
            <ul className="flex flex-col gap-2.5" style={{ fontSize: 14 }}>
              <li>
                <Link href="/expositores" className="hover:text-white transition-colors">
                  Quero ser expositor
                </Link>
              </li>
              <li>
                <Link href="/parceiros" className="hover:text-white transition-colors">
                  Quero ser parceiro
                </Link>
              </li>
              <li>
                <Link href="/inscricoes" className="hover:text-white transition-colors">
                  Inscreva-se
                </Link>
              </li>
              <li>
                <Link href="/inscricoes/minhas" className="hover:text-white transition-colors">
                  Minhas inscrições
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Área do credenciado
                </Link>
              </li>
              <li>
                <Link href="/inscricoes/minhas" className="hover:text-white transition-colors">
                  Emissão de certificado
                </Link>
              </li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h5 className="mono text-[11px] tracking-[0.14em] uppercase text-[#8a8ca8] mb-4 font-medium">
              Contato
            </h5>
            <ul className="flex flex-col gap-2.5" style={{ fontSize: 14 }}>
              <li>Açailândia — MA</li>
              <li>
                <a href="mailto:acia.aca@gmail.com" className="hover:text-white transition-colors">
                  acia.aca@gmail.com
                </a>
              </li>
              <li>
                <a href="tel:+5599988334432" className="hover:text-white transition-colors">
                  +55 99 98833-4432
                </a>
              </li>
              <li className="mt-3">
                <Link href="/parceiros" className="hover:text-white transition-colors">
                  Imprensa
                </Link>
              </li>
              <li>
                <Link href="/termos" className="hover:text-white transition-colors">
                  Termos de uso
                </Link>
              </li>
              <li>
                <Link href="/privacidade" className="hover:text-white transition-colors">
                  Privacidade
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-6 border-t border-[#2a2b52] flex justify-between items-center flex-wrap gap-2 text-xs text-[#8a8ca8] mono">
          <div>© 2026 SEMANA EMPRESARIAL DE AÇAILÂNDIA</div>
          <div>17 — 22 DE AGOSTO · 2026</div>
        </div>
      </div>
    </footer>
  )
}

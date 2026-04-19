'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, ChevronDown, Check } from 'lucide-react'
import type { OrganizationSummary } from '@/lib/org-types'

const COOKIE_NAME = 'acia_active_org'

function setActiveOrgCookie(orgId: string) {
  const oneYear = 60 * 60 * 24 * 365
  document.cookie = `${COOKIE_NAME}=${orgId}; path=/; max-age=${oneYear}; SameSite=Lax`
}

export default function OrgSwitcher({
  orgs,
  activeOrgId,
}: {
  orgs: OrganizationSummary[]
  activeOrgId: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const active = orgs.find((o) => o.id === activeOrgId) ?? orgs[0]
  if (!active) return null

  function selectOrg(id: string) {
    setActiveOrgCookie(id)
    setOpen(false)
    router.refresh()
  }

  if (orgs.length <= 1) {
    // Read-only display
    return (
      <div className="flex items-center gap-2 min-w-0 pl-12 lg:pl-0">
        <div
          className="rounded-md grid place-items-center shrink-0"
          style={{
            width: 28,
            height: 28,
            background: 'var(--azul-50)',
            color: 'var(--azul)',
          }}
        >
          <Building2 size={14} />
        </div>
        <div className="min-w-0">
          <div
            className="mono text-[9px] tracking-[0.14em]"
            style={{ color: 'var(--ink-50)' }}
          >
            ORGANIZAÇÃO
          </div>
          <div
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--ink)' }}
          >
            {active.name}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative pl-12 lg:pl-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
      >
        <div
          className="rounded-md grid place-items-center shrink-0"
          style={{
            width: 28,
            height: 28,
            background: 'var(--azul-50)',
            color: 'var(--azul)',
          }}
        >
          <Building2 size={14} />
        </div>
        <div className="min-w-0 text-left">
          <div
            className="mono text-[9px] tracking-[0.14em]"
            style={{ color: 'var(--ink-50)' }}
          >
            ORGANIZAÇÃO
          </div>
          <div
            className="text-sm font-semibold truncate flex items-center gap-1"
            style={{ color: 'var(--ink)' }}
          >
            {active.name}
            <ChevronDown size={14} style={{ color: 'var(--ink-50)' }} />
          </div>
        </div>
      </button>

      {open && (
        <div
          className="absolute left-12 lg:left-0 top-full mt-2 z-40 rounded-xl bg-white p-1 min-w-[260px]"
          style={{
            border: '1px solid var(--line)',
            boxShadow: '0 12px 30px -10px rgba(0,0,0,0.15)',
          }}
        >
          {orgs.map((o) => {
            const isActive = o.id === activeOrgId
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => selectOrg(o.id)}
                className="w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 hover:bg-paper-2 transition-colors"
                style={isActive ? { background: 'var(--paper-2)' } : undefined}
              >
                <div
                  className="rounded-md grid place-items-center shrink-0"
                  style={{
                    width: 26,
                    height: 26,
                    background: 'var(--azul-50)',
                    color: 'var(--azul)',
                  }}
                >
                  <Building2 size={12} />
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="text-sm font-semibold truncate"
                    style={{ color: 'var(--ink)' }}
                  >
                    {o.name}
                  </div>
                  <div
                    className="mono text-[10px] tracking-[0.06em]"
                    style={{ color: 'var(--ink-50)' }}
                  >
                    {o.role === 'owner' ? 'OWNER' : 'MEMBRO'}
                  </div>
                </div>
                {isActive && (
                  <Check size={14} style={{ color: 'var(--verde-600)' }} />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

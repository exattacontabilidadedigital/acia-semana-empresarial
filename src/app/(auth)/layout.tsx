export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--paper)' }}
    >
      {/* Decorative brand stripe (bottom) */}
      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 flex"
        style={{ height: 6 }}
      >
        <span style={{ flex: 1, background: 'var(--laranja)' }} />
        <span style={{ flex: 1, background: 'var(--verde)' }} />
        <span style={{ flex: 1, background: 'var(--ciano)' }} />
        <span style={{ flex: 1, background: 'var(--azul)' }} />
      </div>

      {/* Faint grid background */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          opacity: 0.35,
          maskImage:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 75%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 75%)',
        }}
      />

      <div className="relative w-full flex items-center justify-center py-16">
        {children}
      </div>
    </div>
  )
}

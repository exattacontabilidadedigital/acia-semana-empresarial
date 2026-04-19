'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Mail, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      const redirect = searchParams.get('redirect') || '/admin/dashboard';
      router.push(redirect);
    } catch {
      setError('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[440px] mx-4 page-enter">
      {/* Eyebrow */}
      <div className="eyebrow mb-6 flex items-center justify-center">
        <span className="dot" />
        SEMANA EMPRESARIAL · 2026
      </div>

      {/* Title */}
      <h1
        className="display text-center mb-3"
        style={{ fontSize: 'clamp(44px, 8vw, 64px)' }}
      >
        Entrar
      </h1>
      <p
        className="text-center mb-10"
        style={{ color: 'var(--ink-70)', fontSize: 15, lineHeight: 1.5 }}
      >
        Acesse sua conta para gerenciar
        <br />
        inscrições e ingressos.
      </p>

      {/* Card */}
      <div
        className="bg-white rounded-[20px] p-8"
        style={{
          border: '1px solid var(--line)',
          boxShadow: '0 20px 60px -30px rgba(20,20,60,0.15)',
        }}
      >
        {error && (
          <div
            className="mb-5 p-3 rounded-xl text-sm text-center"
            style={{
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              color: '#b91c1c',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label
              htmlFor="email"
              className="mono block text-[10px] tracking-[0.1em] mb-2"
              style={{ color: 'var(--ink-50)' }}
            >
              EMAIL
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--ink-50)' }}
              />
              <input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input w-full pl-11 pr-4 py-3 rounded-xl text-sm bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mono block text-[10px] tracking-[0.1em] mb-2"
              style={{ color: 'var(--ink-50)' }}
            >
              SENHA
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--ink-50)' }}
              />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="auth-input w-full pl-11 pr-4 py-3 rounded-xl text-sm bg-white focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-orange btn-lg w-full justify-center mt-1"
            style={loading ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
          >
            {loading ? (
              'Entrando...'
            ) : (
              <>
                Entrar <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div
          className="mt-7 pt-6 text-center text-sm"
          style={{ borderTop: '1px solid var(--line)', color: 'var(--ink-70)' }}
        >
          Ainda não tem conta?{' '}
          <Link
            href="/registro"
            className="font-semibold hover:underline"
            style={{ color: 'var(--laranja)' }}
          >
            Criar conta
          </Link>
        </div>
      </div>

      {/* Back link */}
      <div className="text-center mt-8">
        <Link
          href="/"
          className="mono text-[11px] tracking-[0.14em] hover:text-ink transition-colors"
          style={{ color: 'var(--ink-50)' }}
        >
          ← VOLTAR PARA O SITE
        </Link>
      </div>

      <style jsx>{`
        .auth-input {
          border: 1px solid var(--line);
          color: var(--ink);
          transition: border-color 0.18s ease, box-shadow 0.18s ease;
        }
        .auth-input::placeholder {
          color: var(--ink-50);
        }
        .auth-input:focus {
          border-color: var(--azul);
          box-shadow: 0 0 0 4px var(--azul-50);
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          className="w-full max-w-[440px] mx-4 text-center mono text-[11px] tracking-[0.1em]"
          style={{ color: 'var(--ink-50)' }}
        >
          CARREGANDO...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

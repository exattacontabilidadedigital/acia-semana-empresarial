'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function RegistroPage() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (senha !== confirmarSenha) {
      setError('As senhas não coincidem.');
      return;
    }

    if (senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: senha,
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            full_name: nome,
            phone: telefone,
          });

        if (profileError) {
          setError('Conta criada, mas houve um erro ao salvar o perfil. Entre em contato com o suporte.');
          return;
        }
      }

      setSuccess(true);
    } catch {
      setError('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="flex justify-center mb-6">
            <Image
              src="/img/logo_branca.png"
              alt="Semana Empresarial"
              width={180}
              height={60}
              className="drop-shadow-md"
            />
          </div>
          <h2 className="text-2xl font-extrabold text-dark mb-4">
            Verifique seu email
          </h2>
          <p className="text-gray-500 mb-6">
            Enviamos um link de confirmação para <strong>{email}</strong>.
            Verifique sua caixa de entrada e clique no link para ativar sua conta.
          </p>
          <Link href="/login" className="text-purple font-semibold hover:underline">
            Voltar para o login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex justify-center mb-6">
          <Image
            src="/img/logo_branca.png"
            alt="Semana Empresarial"
            width={180}
            height={60}
            className="drop-shadow-md"
          />
        </div>

        <h1 className="text-2xl font-extrabold text-dark text-center mb-6">
          Criar Conta
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Input
            id="nome"
            label="Nome completo"
            type="text"
            placeholder="Seu nome completo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />

          <Input
            id="email"
            label="Email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            id="telefone"
            label="Telefone"
            type="tel"
            placeholder="(99) 99999-9999"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            required
          />

          <Input
            id="senha"
            label="Senha"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />

          <Input
            id="confirmarSenha"
            label="Confirmar senha"
            type="password"
            placeholder="Repita a senha"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            required
          />

          <Button
            type="submit"
            variant="orange"
            size="lg"
            className="w-full mt-2"
            disabled={loading}
          >
            {loading ? 'Criando conta...' : 'Registrar'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-purple font-semibold hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}

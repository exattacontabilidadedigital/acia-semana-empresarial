import { z } from 'zod'

export const inscriptionPersonalSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  cpf: z
    .string()
    .min(11, 'CPF inválido')
    .refine(
      (val) => val.replace(/\D/g, '').length === 11,
      'CPF deve ter 11 dígitos',
    ),
  telefone: z
    .string()
    .min(10, 'Telefone inválido')
    .refine((val) => {
      const digits = val.replace(/\D/g, '')
      return digits.length >= 10 && digits.length <= 11
    }, 'Telefone deve ter 10 ou 11 dígitos'),
  nome_empresa: z.string().optional(),
  cargo: z.string().optional(),
  cep: z
    .string()
    .min(8, 'CEP inválido')
    .refine(
      (val) => val.replace(/\D/g, '').length === 8,
      'CEP deve ter 8 dígitos',
    ),
  rua: z.string().min(1, 'Rua é obrigatória'),
  numero: z.string().min(1, 'Número é obrigatório'),
  bairro: z.string().min(1, 'Bairro é obrigatório'),
  cidade: z.string().min(1, 'Cidade é obrigatória'),
  estado: z.string().min(2, 'Estado é obrigatório'),
  complemento: z.string().optional(),
  accepted_terms: z.literal(true, {
    errorMap: () => ({ message: 'Você deve aceitar os termos de uso' }),
  }),
})

export type InscriptionPersonalData = z.infer<typeof inscriptionPersonalSchema>

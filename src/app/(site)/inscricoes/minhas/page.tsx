import { redirect } from 'next/navigation'

export default function MinhasInscricoesRedirect() {
  redirect('/carrinho?aba=confirmadas')
}

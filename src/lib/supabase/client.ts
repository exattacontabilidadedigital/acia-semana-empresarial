import { createBrowserClient } from '@supabase/ssr'

// Placeholders usados APENAS durante o build/prerender quando as env vars não
// estão definidas. No runtime real (browser), as vars NEXT_PUBLIC_* já foram
// embutidas no bundle pelo Next.js. Sem essa guarda, o build quebra em
// "Generating static pages" porque o supabase-ssr valida o formato da URL.
const FALLBACK_URL = 'https://placeholder.supabase.co'
const FALLBACK_KEY = 'placeholder-anon-key'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_KEY,
  )
}

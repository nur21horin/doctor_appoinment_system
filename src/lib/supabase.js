import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && anonKey)

// Only the public anon key is used in the browser. All privileged logic lives in
// Postgres functions protected by Row Level Security.
export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true },
})

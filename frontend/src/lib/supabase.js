import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseMisconfigured = !supabaseUrl || !supabaseAnonKey

// If keys are missing we export a dummy client so imports don't break,
// but the app will show a setup screen instead of trying to connect.
export const supabase = supabaseMisconfigured
  ? null
  : createClient(supabaseUrl, supabaseAnonKey)

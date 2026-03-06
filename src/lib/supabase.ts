import { createClient } from '@supabase/supabase-js'

// Using local Supabase defaults if env vars are missing
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZmF1bHQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY4MDAwMDAwMCwiZXhwIjoxOTk1NTg0MDAwfQ.XYZ' // Placeholder local anon key

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

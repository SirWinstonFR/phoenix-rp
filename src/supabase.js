import { createClient } from '@supabase/supabase-js'

// 👇 Remplace ces deux valeurs par celles de ton projet Supabase
// (Settings → API dans le dashboard Supabase)
const SUPABASE_URL = 'https://sjjqkscqsedovnqyplta.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqanFrc2Nxc2Vkb3ZucXlwbHRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NjAwODIsImV4cCI6MjA5NzEzNjA4Mn0.ryrdcLbyqLw5TtcII5_PTClEZjgr7pz3nNszX3C97Nk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

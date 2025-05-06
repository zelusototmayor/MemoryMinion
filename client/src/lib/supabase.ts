import { createClient } from '@supabase/supabase-js';

// In Vite, environment variables are accessed via import.meta.env
const supabaseUrl = import.meta.env.SUPABASE_URL || '';
const supabaseKey = import.meta.env.SUPABASE_ANON_KEY || '';

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);
import { createClient } from '@supabase/supabase-js';

// Get environment variables with VITE_ prefix
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL available:', !!supabaseUrl);
console.log('Supabase Key available:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Check environment variables.');
}

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);
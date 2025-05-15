import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Use a fallback URL and key for development if environment variables aren't available
// These won't work for actual auth but will prevent type errors and crashes
const fallbackUrl = 'https://your-project.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkaXVoeml';

// Get environment variables with VITE_ prefix
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Detailed debugging for environment variables
console.log('🔍 Client Environment Check:');
console.log('VITE_SUPABASE_URL exists:', !!envUrl);
console.log('VITE_SUPABASE_ANON_KEY exists:', !!envKey);

if (envKey) {
  console.log('VITE_SUPABASE_ANON_KEY starts with:', envKey.substring(0, 5));
  console.log('VITE_SUPABASE_ANON_KEY length:', envKey.length);
} else {
  console.log('⚠️ Warning: VITE_SUPABASE_ANON_KEY is missing');
}

// Use the environment variables if they exist, otherwise use the fallbacks
let supabaseUrl = envUrl || fallbackUrl;
let supabaseKey = envKey || fallbackKey;

// Clean up URL if it has formatting issues
if (supabaseUrl.includes('VITE_')) {
  supabaseUrl = supabaseUrl.replace(/VITE_/g, '');
}

// Ensure URL has proper https:// prefix
if (!supabaseUrl.startsWith('https://')) {
  supabaseUrl = `https://${supabaseUrl}`;
}

// Fix double https:// if present
if (supabaseUrl.includes('https://https://')) {
  supabaseUrl = supabaseUrl.replace('https://https://', 'https://');
}

console.log('Using Supabase URL:', supabaseUrl);
console.log('Using fallback URL?', supabaseUrl === fallbackUrl);
console.log('Using fallback key?', supabaseKey === fallbackKey);

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// If we're using fallbacks, log a warning
if (!envUrl || !envKey) {
  console.warn(
    'Supabase credentials not found in environment variables. ' +
    'Authentication functionality will be limited.'
  );
}
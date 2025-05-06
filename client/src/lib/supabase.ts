import { createClient } from '@supabase/supabase-js';

// Get environment variables with VITE_ prefix and ensure proper URL format
let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Make sure the URL is properly formatted
if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
  supabaseUrl = `https://${supabaseUrl}`;
}

console.log('Using Supabase URL:', supabaseUrl);

// Create a safe version of the Supabase client or fallback
let supabase;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Check environment variables.');
  // Fallback mock client
  supabase = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: { user: null }, error: { message: 'Supabase client not initialized' } }),
      signUp: async () => ({ data: { user: null }, error: { message: 'Supabase client not initialized' } }),
      signOut: async () => ({ error: null })
    }
  };
} else {
  try {
    // Initialize with valid credentials
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    // Fallback mock client
    supabase = {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signInWithPassword: async () => ({ data: { user: null }, error: { message: 'Supabase client not initialized' } }),
        signUp: async () => ({ data: { user: null }, error: { message: 'Supabase client not initialized' } }),
        signOut: async () => ({ error: null })
      }
    };
  }
}

export { supabase };
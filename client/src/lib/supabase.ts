import { createClient } from '@supabase/supabase-js';

// Hardcoded values for demonstration - in production, you would use environment variables
// These would be provided by the platform when deployed
const supabaseUrl = 'https://example.supabase.co'; // Replace with actual value during implementation
const supabaseKey = 'public-anon-key';             // Replace with actual value during implementation

console.log('Using Supabase URL:', supabaseUrl);

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);
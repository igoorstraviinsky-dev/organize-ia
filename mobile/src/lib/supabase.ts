import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jiygqgehptknjdtqdwks.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppeWdxZ2VocHRrbmpkdHFkd2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTAwMzMsImV4cCI6MjA4ODIyNjAzM30.vkLlkkBPoOFAJjF5XhkrjnlDIuxdbLwd0Wb2eqPJnko';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

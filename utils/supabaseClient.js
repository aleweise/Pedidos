
const SUPABASE_URL = 'https://hgchdhkcwvuqxrbcmvad.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnY2hkaGtjd3Z1cXhyYmNtdmFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NDA0NTMsImV4cCI6MjA4NDMxNjQ1M30.wvUdSkC4rzZwNt0AbhfoAACm1tPCzaZnoJgVzfDQJPE';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

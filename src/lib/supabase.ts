import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
    'https://yixqgiidybeacnxjflis.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpeHFnaWlkeWJlYWNueGpmbGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTY5MTgsImV4cCI6MjA4ODM5MjkxOH0.mV8KOr1gfh0VFBRtzRFh_T5pIYD111sqJLrMagqe-qs',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
            storageKey: 'pyramid-auth'
        }
    }
);

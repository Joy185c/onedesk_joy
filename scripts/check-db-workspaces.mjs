import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aknyividsxniasmuyaff.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrbnlpdmlkc3huaWFzbXV5YWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxODA5ODMsImV4cCI6MjEwODc1Njk4M30.3OKEQu4OgmFa3P8-HhVli42pi-Q83ypoTNqMH7u7sVU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('workspaces').select('id, name, slug, owner_id');
  console.log('Workspaces query result:', data, 'error:', error);
}

check();


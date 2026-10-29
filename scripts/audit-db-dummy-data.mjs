import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aknyividsxniasmuyaff.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrbnlpdmlkc3huaWFzbXV5YWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxODA5ODMsImV4cCI6MjEwODc1Njk4M30.3OKEQu4OgmFa3P8-HhVli42pi-Q83ypoTNqMH7u7sVU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runAudit() {
  console.log('Auditing Supabase database for Factor Labs and mock data...');

  // 1. Check workspaces
  const { data: workspaces, error: wsErr } = await supabase
    .from('workspaces')
    .select('id, name, slug, owner_id, created_at');
  console.log('Workspaces:', workspaces, wsErr ? `Error: ${wsErr.message}` : '');

  // 2. Check profiles
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, full_name, email, created_at');
  console.log('Profiles count:', profiles?.length, profErr ? `Error: ${profErr.message}` : '');
  if (profiles) {
    profiles.forEach(p => console.log(' - Profile:', p.id, p.full_name, p.email));
  }

  // 3. Check projects
  const { data: projects, error: projErr } = await supabase
    .from('projects')
    .select('id, key, name, workspace_id, owner_id');
  console.log('Projects count:', projects?.length, projErr ? `Error: ${projErr.message}` : '');
  if (projects) {
    projects.forEach(p => console.log(' - Project:', p.id, p.key, p.name, 'ws:', p.workspace_id));
  }

  // 4. Check tasks
  const { data: tasks, error: taskErr } = await supabase
    .from('tasks')
    .select('id, title, workspace_id, project_id');
  console.log('Tasks count:', tasks?.length, taskErr ? `Error: ${taskErr.message}` : '');
  if (tasks) {
    tasks.forEach(t => console.log(' - Task:', t.id, t.title));
  }

  // 5. Check channels
  const { data: channels, error: chanErr } = await supabase
    .from('channels')
    .select('id, name, slug, workspace_id, project_id');
  console.log('Channels count:', channels?.length, chanErr ? `Error: ${chanErr.message}` : '');
  if (channels) {
    channels.forEach(c => console.log(' - Channel:', c.id, c.name, c.slug));
  }
}

runAudit();


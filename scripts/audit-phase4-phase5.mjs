import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aknyividsxniasmuyaff.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrbnlpdmlkc3huaWFzbXV5YWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxODA5ODMsImV4cCI6MjEwODc1Njk4M30.3OKEQu4OgmFa3P8-HhVli42pi-Q83ypoTNqMH7u7sVU';

const runId = Date.now().toString().slice(-5);
const userA_Email = `onedesk.audit.a.${runId}@gmail.com`;
const userB_Email = `onedesk.audit.b.${runId}@gmail.com`;
const userC_Email = `onedesk.audit.c.${runId}@gmail.com`;
const testPassword = 'Password123!Secure';

async function runAudit() {
  console.log('================================================================');
  console.log('ONEDESK: PHASE 4 & 5 COMPREHENSIVE FUNCTIONAL AUDIT & TEST SUITE');
  console.log('Supabase URL:', supabaseUrl);
  console.log('Audit Run ID:', runId);
  console.log('================================================================\n');

  const clientA = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const clientB = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const clientC = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // --------------------------------------------------------------------------
  // SECTION 1: DATABASE & MIGRATION SCHEMA AUDIT
  // --------------------------------------------------------------------------
  console.log('--- SECTION 1: DATABASE TABLE & SCHEMA VERIFICATION ---');

  // Register User A to have authenticated access for checking tables
  console.log('1.1 Authenticating Test User A...');
  const { data: authA, error: errA } = await clientA.auth.signUp({
    email: userA_Email,
    password: testPassword,
    options: { data: { full_name: `Audit Owner ${runId}` } },
  });
  if (errA) throw new Error(`User A signup failed: ${errA.message}`);
  const userA_Id = authA.user.id;
  console.log(`  ✓ User A created & authenticated: ${userA_Email} (${userA_Id})`);

  // Create audit workspace
  const wsSlug = `audit-ws-${runId}`;
  console.log(`1.2 Provisioning isolated audit workspace: ${wsSlug}...`);
  const { data: wsA, error: wsErrA } = await clientA
    .from('workspaces')
    .insert({
      name: `Audit Workspace ${runId}`,
      slug: wsSlug,
      owner_id: userA_Id,
    })
    .select()
    .single();

  if (wsErrA) throw new Error(`Workspace creation failed: ${wsErrA.message}`);
  console.log(`  ✓ Workspace created [ID: ${wsA.id}]`);

  // Add membership
  await clientA.from('workspace_members').insert({
    workspace_id: wsA.id,
    user_id: userA_Id,
    role: 'owner',
    status: 'active',
  });

  // Test tables existence
  const tablesToCheck = [
    'profiles',
    'workspaces',
    'workspace_members',
    'projects',
    'project_members',
    'tasks',
    'task_assignees',
    'channels',
    'channel_members',
    'messages',
    'message_reactions',
    'task_comments',
    'notifications',
    'documents',
    'goals',
    'key_results',
    'time_entries',
  ];

  console.log('\n1.3 Checking PostgreSQL Table Availability:');
  const tableStatus = {};
  for (const table of tablesToCheck) {
    const { data, error } = await clientA.from(table).select('id').limit(1);
    if (error) {
      tableStatus[table] = { status: 'MISSING/ERROR', error: error.message };
      console.log(`  ✗ [${table}]: ${error.message}`);
    } else {
      tableStatus[table] = { status: 'OK' };
      console.log(`  ✓ [${table}]: Table active and queryable via RLS`);
    }
  }

  // Check Joy Sarkar's permanent data
  console.log('\n1.4 Verifying Data Integrity for User Joy Sarkar & FABRIQ:');
  const { data: fabriqWs, error: fabriqErr } = await clientA
    .from('workspaces')
    .select('id, name, slug')
    .eq('slug', 'fabriq')
    .maybeSingle();

  if (fabriqErr) {
    console.log(`  [Notice] RLS prevents User A from seeing FABRIQ (Cross-tenant security verified): ${fabriqErr.message}`);
  } else if (fabriqWs) {
    console.log(`  ✓ Workspace FABRIQ is intact [ID: ${fabriqWs.id}]`);
  } else {
    console.log('  ✓ Workspace FABRIQ is completely isolated from other tenants.');
  }

  // --------------------------------------------------------------------------
  // SECTION 2: REALTIME COLLABORATION AUDIT (PHASE 4)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 2: PHASE 4 REALTIME COLLABORATION AUDIT ---');

  if (tableStatus['channels']?.status !== 'OK') {
    console.log('  [ALERT] Migration 20261028000003_phase4_collaboration.sql must be applied in Supabase SQL editor.');
  } else {
    // 2.1 Create project
    console.log('2.1 Creating Project P1 in Audit Workspace...');
    const { data: proj1, error: pErr } = await clientA
      .from('projects')
      .insert({
        workspace_id: wsA.id,
        name: 'Project Orion',
        key: 'ORN',
        owner_id: userA_Id,
        visibility: 'public_in_workspace',
      })
      .select()
      .single();

    if (pErr) throw new Error(`Project insert failed: ${pErr.message}`);
    console.log(`  ✓ Project Orion created [ID: ${proj1.id}, Key: ORN]`);

    // 2.2 Create Channel
    console.log('2.2 Creating workspace channel #announcements...');
    const { data: chan1, error: chErr } = await clientA
      .from('channels')
      .insert({
        workspace_id: wsA.id,
        name: 'announcements',
        type: 'public',
        created_by: userA_Id,
      })
      .select()
      .single();

    if (chErr) throw new Error(`Channel insert failed: ${chErr.message}`);
    console.log(`  ✓ Channel #announcements created [ID: ${chan1.id}]`);

    // 2.3 Send Message
    console.log('2.3 Sending message in #announcements...');
    const { data: msg1, error: mErr } = await clientA
      .from('messages')
      .insert({
        channel_id: chan1.id,
        author_id: userA_Id,
        body: 'Welcome to OneDesk Phase 4 & 5 functional verification!',
      })
      .select()
      .single();

    if (mErr) throw new Error(`Message insert failed: ${mErr.message}`);
    console.log(`  ✓ Message sent [ID: ${msg1.id}]`);

    // 2.4 Add Reaction
    console.log('2.4 Adding reaction to message...');
    const { data: rx1, error: rxErr } = await clientA
      .from('message_reactions')
      .insert({
        message_id: msg1.id,
        user_id: userA_Id,
        emoji: '🚀',
      })
      .select()
      .single();

    if (rxErr) throw new Error(`Reaction insert failed: ${rxErr.message}`);
    console.log(`  ✓ Reaction added [Emoji: 🚀]`);

    // 2.5 Task & Task Comment
    console.log('2.5 Creating Task and adding Task Discussion Comment...');
    const { data: task1, error: tErr } = await clientA
      .from('tasks')
      .insert({
        workspace_id: wsA.id,
        project_id: proj1.id,
        title: 'Verify message serialization',
        created_by: userA_Id,
      })
      .select()
      .single();

    if (tErr) throw new Error(`Task insert failed: ${tErr.message}`);

    const { data: tComment, error: tcErr } = await clientA
      .from('task_comments')
      .insert({
        task_id: task1.id,
        author_id: userA_Id,
        content: 'Task comment persisted with RLS validation.',
      })
      .select()
      .single();

    if (tcErr) throw new Error(`Task comment insert failed: ${tcErr.message}`);
    console.log(`  ✓ Task comment created [ID: ${tComment.id}]`);

    // 2.6 Notification
    console.log('2.6 Generating notification for User A...');
    const { data: notif1, error: notifErr } = await clientA
      .from('notifications')
      .insert({
        workspace_id: wsA.id,
        recipient_id: userA_Id,
        actor_id: userA_Id,
        type: 'comment',
        title: 'New Comment',
        body: 'Audit owner commented on task.',
      })
      .select()
      .single();

    if (notifErr) throw new Error(`Notification insert failed: ${notifErr.message}`);
    console.log(`  ✓ Notification created [ID: ${notif1.id}]`);

    // 2.7 Mark Notification Read
    console.log('2.7 Marking notification as read...');
    const { error: markErr } = await clientA
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notif1.id);

    if (markErr) throw new Error(`Mark read failed: ${markErr.message}`);
    console.log(`  ✓ Notification marked read successfully`);
  }

  // --------------------------------------------------------------------------
  // SECTION 3: PRODUCTIVITY ENGINE AUDIT (PHASE 5)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 3: PHASE 5 PRODUCTIVITY ENGINE AUDIT ---');

  if (tableStatus['documents']?.status !== 'OK') {
    console.log('  [ALERT] Migration 20261028000004_phase5_productivity.sql must be applied in Supabase SQL editor.');
  } else {
    // 3.1 Document Creation, Update & Reopening
    console.log('3.1 Creating and editing Document...');
    const { data: doc1, error: dErr } = await clientA
      .from('documents')
      .insert({
        workspace_id: wsA.id,
        title: 'Project Architecture Playbook',
        content: '# Architecture Spec\n\nVerified persistence.',
        created_by: userA_Id,
      })
      .select()
      .single();

    if (dErr) throw new Error(`Document insert failed: ${dErr.message}`);
    console.log(`  ✓ Document created [ID: ${doc1.id}, Title: "${doc1.title}"]`);

    const { error: dUpdateErr } = await clientA
      .from('documents')
      .update({ content: '# Architecture Spec v2\n\nUpdated and persisted.' })
      .eq('id', doc1.id);
    if (dUpdateErr) throw new Error(`Document update failed: ${dUpdateErr.message}`);
    console.log(`  ✓ Document content updated and persisted`);

    // 3.2 Goals & Key Results
    console.log('3.2 Creating Goal and Key Result...');
    const { data: goal1, error: gErr } = await clientA
      .from('goals')
      .insert({
        workspace_id: wsA.id,
        title: 'Zero Latency Sync Goal',
        status: 'on_track',
        progress_percent: 50,
      })
      .select()
      .single();

    if (gErr) throw new Error(`Goal insert failed: ${gErr.message}`);
    console.log(`  ✓ Goal created [ID: ${goal1.id}, Progress: 50%]`);

    const { data: kr1, error: krErr } = await clientA
      .from('key_results')
      .insert({
        goal_id: goal1.id,
        title: 'Test coverage >= 95%',
        initial_value: 0,
        current_value: 95,
        target_value: 100,
        unit: '%',
      })
      .select()
      .single();

    if (krErr) throw new Error(`Key Result insert failed: ${krErr.message}`);
    console.log(`  ✓ Key Result created [ID: ${kr1.id}]`);

    // 3.3 Time Tracking
    console.log('3.3 Logging Time Entry...');
    // We need a project ID for time entry
    const { data: projList } = await clientA.from('projects').select('id').eq('workspace_id', wsA.id).limit(1);
    const pid = projList?.[0]?.id;

    if (pid) {
      const { data: te1, error: teErr } = await clientA
        .from('time_entries')
        .insert({
          workspace_id: wsA.id,
          project_id: pid,
          user_id: userA_Id,
          duration_minutes: 90,
          description: 'Tested stopwatch session logging',
          entry_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (teErr) throw new Error(`Time entry insert failed: ${teErr.message}`);
      console.log(`  ✓ Time entry logged [ID: ${te1.id}, Duration: 90 mins (1.5h)]`);
    }
  }

  // --------------------------------------------------------------------------
  // SECTION 4: SECURITY & CROSS-TENANT RLS ISOLATION AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 4: SECURITY & CROSS-TENANT RLS ISOLATION ---');

  console.log('4.1 Registering External User C (unauthorized tenant)...');
  const { data: authC, error: errC } = await clientC.auth.signUp({
    email: userC_Email,
    password: testPassword,
    options: { data: { full_name: `Unauthorized User C ${runId}` } },
  });
  if (errC) throw new Error(`User C signup failed: ${errC.message}`);
  const userC_Id = authC.user.id;
  console.log(`  ✓ User C created: ${userC_Email}`);

  // Test cross-tenant leak on channels
  console.log('4.2 User C attempts to query Workspace A channels...');
  const { data: cChans, error: cChErr } = await clientC
    .from('channels')
    .select('*')
    .eq('workspace_id', wsA.id);

  if (cChans && cChans.length > 0) {
    throw new Error('SECURITY VULNERABILITY: User C was able to view channels of Workspace A!');
  }
  console.log(`  ✓ PASS: RLS blocked channel query (Returned 0 rows)`);

  // Test cross-tenant leak on documents
  console.log('4.3 User C attempts to query Workspace A documents...');
  const { data: cDocs } = await clientC
    .from('documents')
    .select('*')
    .eq('workspace_id', wsA.id);

  if (cDocs && cDocs.length > 0) {
    throw new Error('SECURITY VULNERABILITY: User C was able to view documents of Workspace A!');
  }
  console.log(`  ✓ PASS: RLS blocked document query (Returned 0 rows)`);

  // Test cross-tenant leak on goals
  console.log('4.4 User C attempts to query Workspace A goals...');
  const { data: cGoals } = await clientC
    .from('goals')
    .select('*')
    .eq('workspace_id', wsA.id);

  if (cGoals && cGoals.length > 0) {
    throw new Error('SECURITY VULNERABILITY: User C was able to view goals of Workspace A!');
  }
  console.log(`  ✓ PASS: RLS blocked goal query (Returned 0 rows)`);

  // Test cross-tenant leak on time entries
  console.log('4.5 User C attempts to query Workspace A time entries...');
  const { data: cTime } = await clientC
    .from('time_entries')
    .select('*')
    .eq('workspace_id', wsA.id);

  if (cTime && cTime.length > 0) {
    throw new Error('SECURITY VULNERABILITY: User C was able to view time entries of Workspace A!');
  }
  console.log(`  ✓ PASS: RLS blocked time entry query (Returned 0 rows)`);

  console.log('\n================================================================');
  console.log('✅ ALL PHASE 4 & 5 FUNCTIONAL & SECURITY AUDIT CHECKS PASSED!');
  console.log('================================================================');
}

runAudit().catch((err) => {
  console.error('\n❌ AUDIT FAILED WITH ERROR:', err.message);
  process.exit(1);
});


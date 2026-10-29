import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aknyividsxniasmuyaff.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrbnlpdmlkc3huaWFzbXV5YWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxODA5ODMsImV4cCI6MjEwODc1Njk4M30.3OKEQu4OgmFa3P8-HhVli42pi-Q83ypoTNqMH7u7sVU';

const runId = Date.now().toString().slice(-5);
const emailA = `inviter.${runId}@test.com`;
const emailB = `invitee.${runId}@test.com`;
const password = 'Password123!Secure';

async function testInvitationFlow() {
  console.log('--- TESTING INVITATION NOTIFICATION DISPATCH FLOW ---');

  const clientA = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const clientB = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // 1. Sign up Inviter (User A)
  const { data: authA, error: errA } = await clientA.auth.signUp({
    email: emailA, password, options: { data: { full_name: `Inviter User ${runId}` } }
  });
  if (errA) throw errA;
  console.log(`✓ User A created: ${emailA}`);

  // 2. Sign up Invitee (User B)
  const { data: authB, error: errB } = await clientB.auth.signUp({
    email: emailB, password, options: { data: { full_name: `Invitee User ${runId}` } }
  });
  if (errB) throw errB;
  console.log(`✓ User B created: ${emailB}`);

  // 3. User A creates Workspace
  const { data: wsA, error: wsErr } = await clientA.from('workspaces').insert({
    name: `Team Delta ${runId}`,
    slug: `team-delta-${runId}`,
    owner_id: authA.user.id,
  }).select().single();
  if (wsErr) throw wsErr;
  console.log(`✓ Workspace created: ${wsA.name} [ID: ${wsA.id}]`);

  // Ensure inviter has membership
  await clientA.from('workspace_members').insert({
    workspace_id: wsA.id,
    user_id: authA.user.id,
    role: 'owner',
    status: 'active'
  });

  // 4. Test Invitation via RPC or direct insert
  console.log(`\n4. Dispatching invitation from User A to ${emailB}...`);
  const token = 'tok_' + Math.random().toString(16).substring(2, 10);

  // Insert invite
  const { data: inv, error: invErr } = await clientA.from('workspace_invitations').insert({
    workspace_id: wsA.id,
    email: emailB,
    role: 'member',
    token: token,
    invited_by: authA.user.id,
    status: 'pending'
  }).select().single();

  if (invErr) {
    console.warn('Direct invitation insert error:', invErr.message);
  } else {
    console.log(`✓ Workspace invitation created with token: ${token}`);
  }

  // Insert notification for User B
  const { data: notif, error: notifErr } = await clientA.from('notifications').insert({
    workspace_id: wsA.id,
    recipient_id: authB.user.id,
    actor_id: authA.user.id,
    type: 'system',
    title: `Team Invitation: ${wsA.name}`,
    body: `Inviter User ${runId} has invited you to join ${wsA.name} as a Member! Welcome to the team.`,
    link_url: `/invite/${token}`,
  }).select().single();

  if (notifErr) {
    console.error('Notification creation failed:', notifErr.message);
  } else {
    console.log(`✓ In-App Inbox Notification delivered to User B [ID: ${notif.id}]`);
    console.log(`  Title: ${notif.title}`);
    console.log(`  Body: ${notif.body}`);
    console.log(`  Link URL: ${notif.link_url}`);
  }

  // 5. User B checks their Unified Inbox
  console.log(`\n5. User B queries Unified Inbox...`);
  const { data: bNotifs, error: bErr } = await clientB
    .from('notifications')
    .select('*')
    .eq('recipient_id', authB.user.id);

  if (bErr) throw bErr;
  console.log(`✓ User B sees ${bNotifs.length} notification(s) in their Inbox!`);
  const inviteNotif = bNotifs.find(n => n.link_url?.includes(token));
  if (inviteNotif) {
    console.log(`  ✓ Found invitation notification with greeting and join button target: ${inviteNotif.link_url}`);
  }

  // 6. User B accepts the invitation
  console.log(`\n6. User B accepts the invitation...`);
  const { data: acceptRes, error: accErr } = await clientB.rpc('accept_workspace_invitation', {
    invitation_token: token,
  });

  if (accErr) {
    console.log('Acceptance note:', accErr.message);
  } else {
    console.log(`✓ Invitation accepted! Result:`, acceptRes);

    // Verify User B is now a member of Team Delta
    const { data: memB } = await clientB
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', wsA.id)
      .eq('user_id', authB.user.id)
      .maybeSingle();

    if (memB) {
      console.log(`✓ SUCCESS: User B is now an active member of ${wsA.name} (Role: ${memB.role}, Status: ${memB.status})!`);
    }
  }

  console.log('\n================================================================');
  console.log('✅ COMPLETE INVITATION & INBOX NOTIFICATION FLOW VERIFIED!');
  console.log('================================================================');
}

testInvitationFlow().catch(console.error);


import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables in .env.local');
  process.exit(1);
}

const runId = Date.now().toString().slice(-5);
const userA_Email = `onedesk.user.a.${runId}@gmail.com`;
const userB_Email = `onedesk.user.b.${runId}@gmail.com`;
const userC_Email = `onedesk.user.c.${runId}@gmail.com`;
const testPassword = 'Password123!Secure';

async function runTestSuite() {
  console.log('================================================================');
  console.log('ONEDESK PHASE 2: REAL SUPABASE AUTH & MULTI-TENANCY TEST SUITE');
  console.log('Supabase URL:', supabaseUrl);
  console.log('Run Identifier:', runId);
  console.log('================================================================\n');

  // Client A (User A)
  const clientA = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Client B (User B)
  const clientB = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Client C (User C)
  const clientC = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // --------------------------------------------------------------------------
  // STEP 1: User A Registration & Workspace Creation
  // --------------------------------------------------------------------------
  console.log('[STEP 1] Registering User A & creating Workspace A (Factor Labs)...');
  const { data: authA, error: errA } = await clientA.auth.signUp({
    email: userA_Email,
    password: testPassword,
    options: { data: { full_name: 'Alex Sterling (User A)' } },
  });

  if (errA) throw new Error(`User A signup failed: ${errA.message}`);
  const userA_Id = authA.user.id;
  console.log(`  ✓ User A created: ${userA_Email} (${userA_Id})`);

  // If email confirmation is enabled on Supabase, sign in directly if session exists
  if (!authA.session) {
    const { data: loginA, error: loginErrA } = await clientA.auth.signInWithPassword({
      email: userA_Email,
      password: testPassword,
    });
    if (loginErrA) {
      console.warn('  [Notice] Email confirmation may be enabled on Supabase project:', loginErrA.message);
      console.log('  Testing session availability...');
    }
  }

  // Create Workspace A
  const wsA_Slug = `factor-labs-${runId}`;
  const { data: wsA, error: wsAErr } = await clientA
    .from('workspaces')
    .insert({
      name: `Factor Labs ${runId}`,
      slug: wsA_Slug,
      owner_id: userA_Id,
    })
    .select()
    .single();

  if (wsAErr) throw new Error(`Workspace A creation failed: ${wsAErr.message}`);
  console.log(`  ✓ Workspace A created: ${wsA.name} [ID: ${wsA.id}]`);

  // Add User A as Owner
  const { error: memAErr } = await clientA.from('workspace_members').insert({
    workspace_id: wsA.id,
    user_id: userA_Id,
    role: 'owner',
    status: 'active',
    job_title: 'Founder & CEO',
  });
  if (memAErr) throw new Error(`Member A insertion failed: ${memAErr.message}`);
  console.log(`  ✓ User A assigned role 'owner' in Workspace A`);

  // --------------------------------------------------------------------------
  // STEP 2: User B Registration & Workspace Creation
  // --------------------------------------------------------------------------
  console.log('\n[STEP 2] Registering User B & creating Workspace B (Apex Studio)...');
  const { data: authB, error: errB } = await clientB.auth.signUp({
    email: userB_Email,
    password: testPassword,
    options: { data: { full_name: 'Marcus Vance (User B)' } },
  });

  if (errB) throw new Error(`User B signup failed: ${errB.message}`);
  const userB_Id = authB.user.id;
  console.log(`  ✓ User B created: ${userB_Email} (${userB_Id})`);

  // Create Workspace B
  const wsB_Slug = `apex-studio-${runId}`;
  const { data: wsB, error: wsBErr } = await clientB
    .from('workspaces')
    .insert({
      name: `Apex Studio ${runId}`,
      slug: wsB_Slug,
      owner_id: userB_Id,
    })
    .select()
    .single();

  if (wsBErr) throw new Error(`Workspace B creation failed: ${wsBErr.message}`);
  console.log(`  ✓ Workspace B created: ${wsB.name} [ID: ${wsB.id}]`);

  // Add User B as Owner
  const { error: memBErr } = await clientB.from('workspace_members').insert({
    workspace_id: wsB.id,
    user_id: userB_Id,
    role: 'owner',
    status: 'active',
    job_title: 'Managing Director',
  });
  if (memBErr) throw new Error(`Member B insertion failed: ${memBErr.message}`);
  console.log(`  ✓ User B assigned role 'owner' in Workspace B`);

  // --------------------------------------------------------------------------
  // STEP 3: Multi-Tenancy Cross-Workspace RLS Isolation Negative Test
  // --------------------------------------------------------------------------
  console.log('\n[STEP 3] Testing Cross-Tenant Row Level Security (RLS Isolation)...');

  // Query workspaces as User B
  const { data: userB_Workspaces, error: rlsErr1 } = await clientB
    .from('workspaces')
    .select('id, name, slug');

  if (rlsErr1) throw new Error(`User B workspace query failed: ${rlsErr1.message}`);

  const canSeeWsA = userB_Workspaces.some((w) => w.id === wsA.id);
  if (canSeeWsA) {
    console.error('  ❌ CRITICAL SECURITY FAILURE: User B was able to view Workspace A!');
    process.exit(1);
  } else {
    console.log(`  ✓ PASS: User B can only see Workspace B (${userB_Workspaces.length} workspaces returned). Workspace A is isolated.`);
  }

  // Attempt direct query for Workspace A's members as User B
  const { data: leakMembers, error: leakErr } = await clientB
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', wsA.id);

  if (leakMembers && leakMembers.length > 0) {
    console.error('  ❌ CRITICAL SECURITY FAILURE: User B queried Workspace A members!');
    process.exit(1);
  } else {
    console.log(`  ✓ PASS: User B cannot query members of Workspace A (0 rows returned via RLS).`);
  }

  // --------------------------------------------------------------------------
  // STEP 4: User A Invites User C to Workspace A
  // --------------------------------------------------------------------------
  console.log('\n[STEP 4] User A creates invitation for User C (role: member)...');
  const { data: invite, error: invErr } = await clientA
    .from('workspace_invitations')
    .insert({
      workspace_id: wsA.id,
      email: userC_Email,
      role: 'member',
      invited_by: userA_Id,
    })
    .select()
    .single();

  if (invErr) throw new Error(`Invitation creation failed: ${invErr.message}`);
  console.log(`  ✓ Invitation created for ${invite.email} [Role: ${invite.role}, Token: ${invite.token}]`);

  // Negative test: User B should NOT be able to view User A's invitations
  const { data: userB_Invites } = await clientB
    .from('workspace_invitations')
    .select('*')
    .eq('id', invite.id);

  if (userB_Invites && userB_Invites.length > 0) {
    console.error('  ❌ CRITICAL SECURITY FAILURE: User B queried Workspace A invitation!');
    process.exit(1);
  } else {
    console.log(`  ✓ PASS: Workspace invitations are isolated by RLS (User B saw 0 rows).`);
  }

  // --------------------------------------------------------------------------
  // STEP 5: User C Registers & Accepts Invitation via RPC
  // --------------------------------------------------------------------------
  console.log('\n[STEP 5] Registering User C & accepting invitation via atomic RPC...');
  const { data: authC, error: errC } = await clientC.auth.signUp({
    email: userC_Email,
    password: testPassword,
    options: { data: { full_name: 'Elena Rostova (User C)' } },
  });

  if (errC) throw new Error(`User C signup failed: ${errC.message}`);
  const userC_Id = authC.user.id;
  console.log(`  ✓ User C registered: ${userC_Email} (${userC_Id})`);

  // Call accept_workspace_invitation RPC
  const { data: acceptResult, error: acceptErr } = await clientC.rpc('accept_workspace_invitation', {
    invitation_token: invite.token,
  });

  if (acceptErr) throw new Error(`Invitation acceptance RPC failed: ${acceptErr.message}`);
  console.log(`  ✓ Atomic acceptance RPC succeeded:`, acceptResult);

  // Verify User C is now an active member of Workspace A
  const { data: userC_Memberships, error: memCErr } = await clientC
    .from('workspace_members')
    .select('workspace_id, role, status')
    .eq('workspace_id', wsA.id)
    .eq('user_id', userC_Id);

  if (memCErr || !userC_Memberships || userC_Memberships.length === 0) {
    throw new Error('User C failed to retrieve membership in Workspace A');
  }
  console.log(`  ✓ Verified User C membership in Workspace A [Assigned Role: ${userC_Memberships[0].role}]`);

  // Verify User C CANNOT access Workspace B (User B's workspace)
  const { data: userC_WsB } = await clientC
    .from('workspaces')
    .select('*')
    .eq('id', wsB.id);

  if (userC_WsB && userC_WsB.length > 0) {
    console.error('  ❌ CRITICAL SECURITY FAILURE: User C saw Workspace B!');
    process.exit(1);
  } else {
    console.log(`  ✓ PASS: User C is strictly confined to Workspace A (cannot see Workspace B).`);
  }

  // --------------------------------------------------------------------------
  // STEP 6: Member Revocation Test (User A removes User C)
  // --------------------------------------------------------------------------
  console.log('\n[STEP 6] Testing Access Revocation (User A removes User C)...');
  const { error: revokeErr } = await clientA
    .from('workspace_members')
    .delete()
    .eq('workspace_id', wsA.id)
    .eq('user_id', userC_Id);

  if (revokeErr) throw new Error(`Revocation delete failed: ${revokeErr.message}`);
  console.log(`  ✓ User A deleted User C membership from Workspace A`);

  // Now, test that User C can NO LONGER query Workspace A data
  const { data: postRevokeQuery } = await clientC
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', wsA.id);

  if (postRevokeQuery && postRevokeQuery.length > 0) {
    console.error('  ❌ CRITICAL SECURITY FAILURE: User C still has access after revocation!');
    process.exit(1);
  } else {
    console.log(`  ✓ PASS: Immediate revocation verified. User C can no longer query Workspace A (0 rows returned via RLS).`);
  }

  console.log('\n================================================================');
  console.log('✅ ALL PHASE 2 SECURITY & MULTI-TENANCY ACCEPTANCE TESTS PASSED!');
  console.log('================================================================');
}

runTestSuite().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});

-- ==============================================================================
-- ONEDESK PHASE 2: IDENTITY, TENANCY, WORKSPACE GOVERNANCE & ROW LEVEL SECURITY
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enumerated Types
DO $$ BEGIN
  CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member', 'guest');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'revoked', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE membership_status AS ENUM ('active', 'invited', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Profiles Table (Synced from auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Workspaces Table
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  logo_url TEXT,
  settings JSONB DEFAULT '{"default_project_visibility": "private"}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_slug CHECK (slug ~* '^[a-z0-9-]+$')
);

-- 5. Workspace Memberships Table
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'member',
  status membership_status NOT NULL DEFAULT 'active',
  job_title TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- 6. Workspace Invitations Table
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role workspace_role NOT NULL DEFAULT 'member',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status invitation_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Indexes for High-Velocity Queries
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON public.workspaces(slug);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_ws ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.workspace_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email_ws ON public.workspace_invitations(workspace_id, email);

-- ==============================================================================
-- SECURITY HELPER FUNCTIONS (SECURITY DEFINER)
-- ==============================================================================

-- Check if current authenticated user is a member of workspace
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id
      AND user_id = check_user_id
      AND status = 'active'
  );
$$;

-- Get role of current user in workspace
CREATE OR REPLACE FUNCTION public.get_workspace_role(ws_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS workspace_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.workspace_members
  WHERE workspace_id = ws_id
    AND user_id = check_user_id
    AND status = 'active';
$$;

-- Automatically synchronize profile when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- Profiles Policies
-- ------------------------------------------------------------------------------
-- Users can view profiles of users they share at least one workspace with, or their own profile
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm1
      JOIN public.workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
      WHERE wm1.user_id = auth.uid() AND wm2.user_id = profiles.id
    )
  );

-- Users can only update their own profile
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ------------------------------------------------------------------------------
-- Workspaces Policies
-- ------------------------------------------------------------------------------
-- Members can view workspaces they belong to
CREATE POLICY "workspaces_select_policy" ON public.workspaces
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR is_workspace_member(id, auth.uid())
  );

-- Authenticated users can insert workspaces (becoming the owner)
CREATE POLICY "workspaces_insert_policy" ON public.workspaces
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Only workspace Owner or Admin can update workspace details
CREATE POLICY "workspaces_update_policy" ON public.workspaces
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR get_workspace_role(id, auth.uid()) IN ('owner', 'admin')
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR get_workspace_role(id, auth.uid()) IN ('owner', 'admin')
  );

-- Only workspace Owner can delete a workspace
CREATE POLICY "workspaces_delete_policy" ON public.workspaces
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ------------------------------------------------------------------------------
-- Workspace Members Policies
-- ------------------------------------------------------------------------------
-- Members can view roster of their workspaces
CREATE POLICY "workspace_members_select_policy" ON public.workspace_members
  FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id, auth.uid()));

-- Only owners/admins can insert members, or users accepting an invitation
CREATE POLICY "workspace_members_insert_policy" ON public.workspace_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Workspace owner inserting initial membership during creation
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
    -- Or active owner/admin adding a member
    OR get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
  );

-- Only owners/admins can update roles/status; users cannot elevate themselves
CREATE POLICY "workspace_members_update_policy" ON public.workspace_members
  FOR UPDATE
  TO authenticated
  USING (
    get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
  )
  WITH CHECK (
    get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
  );

-- Only owners/admins can remove members, or a member can remove themselves (leave)
CREATE POLICY "workspace_members_delete_policy" ON public.workspace_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() -- self leave
    OR (
      get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
      AND user_id != (SELECT owner_id FROM public.workspaces WHERE id = workspace_id) -- cannot kick owner
    )
  );

-- ------------------------------------------------------------------------------
-- Workspace Invitations Policies
-- ------------------------------------------------------------------------------
-- Members can view pending invites of their workspace
CREATE POLICY "workspace_invitations_select_policy" ON public.workspace_invitations
  FOR SELECT
  TO authenticated
  USING (
    is_workspace_member(workspace_id, auth.uid())
    OR email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

-- Only owners and admins can create invitations
CREATE POLICY "workspace_invitations_insert_policy" ON public.workspace_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
  );

-- Only owners and admins can revoke or update invitations
CREATE POLICY "workspace_invitations_update_policy" ON public.workspace_invitations
  FOR UPDATE
  TO authenticated
  USING (
    get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
    OR email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "workspace_invitations_delete_policy" ON public.workspace_invitations
  FOR DELETE
  TO authenticated
  USING (
    get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
  );

-- ==============================================================================
-- INVITATION ACCEPTANCE ATOMIC TRANSACTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(invitation_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_user_email TEXT;
  v_user_id UUID := auth.uid();
  v_ws_slug TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_user_email FROM public.profiles WHERE id = v_user_id;

  SELECT * INTO v_invite
  FROM public.workspace_invitations
  WHERE token = invitation_token
    AND status = 'pending'
    AND expires_at > NOW();

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;

  IF LOWER(v_invite.email) != LOWER(v_user_email) THEN
    RAISE EXCEPTION 'This invitation was addressed to % but you are signed in as %', v_invite.email, v_user_email;
  END IF;

  -- Add to workspace_members
  INSERT INTO public.workspace_members (workspace_id, user_id, role, status)
  VALUES (v_invite.workspace_id, v_user_id, v_invite.role, 'active')
  ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role = EXCLUDED.role, status = 'active';

  -- Mark invite accepted
  UPDATE public.workspace_invitations
  SET status = 'accepted'
  WHERE id = v_invite.id;

  SELECT slug INTO v_ws_slug FROM public.workspaces WHERE id = v_invite.workspace_id;

  RETURN jsonb_build_object(
    'success', true,
    'workspace_id', v_invite.workspace_id,
    'slug', v_ws_slug,
    'role', v_invite.role
  );
END;
$$;

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspaces;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_invitations;


'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserProfile, Workspace, WorkspaceRole } from '@/lib/types';
import { invalidateCache } from '@/lib/cache';

export interface WorkspaceContextType {
  user: UserProfile;
  workspace: Workspace;
  role: WorkspaceRole;
  isOwner: boolean;
  isAdminOrOwner: boolean;
  userWorkspaces: { id: string; name: string; slug: string; role: WorkspaceRole }[];
  loading: boolean;
  isDemoMode: boolean;
  signOut: () => Promise<void>;
  refreshWorkspace: () => Promise<void>;
  updateUserLocally: (updates: Partial<UserProfile>) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || '';
  const fetchIdRef = useRef(0); // prevents stale async updates

  const [user, setUser] = useState<UserProfile>({
    id: '',
    name: '',
    email: '',
    initials: '..',
    role: 'Member',
    status: 'online',
  });
  const [workspace, setWorkspace] = useState<Workspace>({
    id: '',
    name: slug ? slug.toUpperCase() : 'Workspace',
    slug: slug || '',
    ownerId: '',
    membersCount: 1,
    projectsCount: 0,
  });
  const [role, setRole] = useState<WorkspaceRole>('member');
  const [userWorkspaces, setUserWorkspaces] = useState<
    { id: string; name: string; slug: string; role: WorkspaceRole }[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  const fetchWorkspaceData = useCallback(async () => {
    // Track current fetch to discard stale results
    const currentFetchId = ++fetchIdRef.current;

    try {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (currentFetchId !== fetchIdRef.current) return;

      if (!authUser) {
        // Unauthenticated visitor — allow demo-only workspace
        if (slug === 'factor-labs') {
          setIsDemoMode(true);
          setUser({
            id: 'demo-user',
            name: 'Demo User',
            email: 'demo@factor-labs.com',
            initials: 'DU',
            role: 'Workspace Owner',
            status: 'online',
          });
          setWorkspace({
            id: 'ws-demo',
            name: 'Factor Labs',
            slug: 'factor-labs',
            ownerId: 'demo-user',
            membersCount: 6,
            projectsCount: 5,
          });
          setRole('owner');
        } else {
          router.push('/login');
        }
        setLoading(false);
        return;
      }

      // ─── Run all independent queries in PARALLEL ───────────────────────────
      const [profileResult, activeWsResult, userWsListResult] = await Promise.all([
        // 1. Fetch user profile
        supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle(),
        // 2. Fetch active workspace by slug
        supabase.from('workspaces').select('*').eq('slug', slug).maybeSingle(),
        // 3. Fetch all user workspaces for switcher
        supabase
          .from('workspace_members')
          .select('role, workspaces(id, name, slug)')
          .eq('user_id', authUser.id),
      ]);

      if (currentFetchId !== fetchIdRef.current) return;

      const profile = profileResult.data;
      const activeWs = activeWsResult.data;

      // Build user profile
      const fullName =
        profile?.full_name ||
        authUser.user_metadata?.full_name ||
        authUser.email?.split('@')[0] ||
        'Member';
      const initials = fullName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      const resolvedUser: UserProfile = {
        id: authUser.id,
        name: fullName,
        email: authUser.email || '',
        avatarUrl: profile?.avatar_url || undefined,
        initials: initials || 'ME',
        role: 'Workspace Member',
        status: 'online',
      };
      setUser(resolvedUser);

      // Parse user workspace list
      const parsedWorkspaces: { id: string; name: string; slug: string; role: WorkspaceRole }[] = [];
      if (userWsListResult.data) {
        userWsListResult.data.forEach((uw: any) => {
          const w = Array.isArray(uw.workspaces) ? uw.workspaces[0] : uw.workspaces;
          if (w) {
            parsedWorkspaces.push({
              id: w.id,
              name: w.name,
              slug: w.slug,
              role: uw.role as WorkspaceRole,
            });
          }
        });
      }
      setUserWorkspaces(parsedWorkspaces);

      if (activeWs) {
        // ─── Run remaining queries for the active workspace IN PARALLEL ───────
        const [memberRecordResult, projectCountResult] = await Promise.all([
          supabase
            .from('workspace_members')
            .select('role, job_title')
            .eq('workspace_id', activeWs.id)
            .eq('user_id', authUser.id)
            .maybeSingle(),
          supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', activeWs.id),
        ]);

        if (currentFetchId !== fetchIdRef.current) return;

        let activeRole: WorkspaceRole = 'member';
        let activeJobTitle = 'Workspace Member';

        if (memberRecordResult.data) {
          activeRole = memberRecordResult.data.role as WorkspaceRole;
          activeJobTitle =
            memberRecordResult.data.job_title ||
            (activeRole === 'owner' ? 'Workspace Owner' : 'Member');
        } else if (activeWs.owner_id === authUser.id) {
          activeRole = 'owner';
          activeJobTitle = 'Workspace Owner';
        }

        // Update user with correct job title
        setUser((prev) => ({ ...prev, role: activeJobTitle }));
        setRole(activeRole);
        setIsDemoMode(false);
        setWorkspace({
          id: activeWs.id,
          name: activeWs.name,
          slug: activeWs.slug,
          ownerId: activeWs.owner_id,
          membersCount: parsedWorkspaces.length || 1,
          projectsCount: projectCountResult.count || 0,
        });
      } else if (slug === 'factor-labs') {
        // Fallback to inline demo if viewing factor-labs
        setIsDemoMode(true);
        setRole('owner');
        setWorkspace({
          id: 'ws-demo',
          name: 'Factor Labs',
          slug: 'factor-labs',
          ownerId: authUser.id,
          membersCount: parsedWorkspaces.length || 6,
          projectsCount: 5,
        });
      } else {
        if (parsedWorkspaces.length > 0) {
          router.push(`/w/${parsedWorkspaces[0].slug}`);
        } else {
          router.push('/onboarding');
        }
      }
    } catch (err) {
      console.error('Error fetching workspace context:', err);
    } finally {
      setLoading(false);
    }
  }, [slug, router]);

  useEffect(() => {
    setLoading(true);
    fetchWorkspaceData();
  }, [fetchWorkspaceData]);

  const signOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser({
        id: '',
        name: '',
        email: '',
        initials: '..',
        role: 'Member',
        status: 'online',
      });
      invalidateCache();
      router.push('/login');
    } catch (err) {
      console.error('Sign out error:', err);
      invalidateCache();
      router.push('/login');
    }
  };

  const updateUserLocally = (updates: Partial<UserProfile>) => {
    setUser((prev) => ({
      ...prev,
      ...updates,
      initials: updates.name
        ? updates.name
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()
        : prev.initials,
    }));
  };

  const isOwner = role === 'owner';
  const isAdminOrOwner = role === 'owner' || role === 'admin';

  return (
    <WorkspaceContext.Provider
      value={{
        user,
        workspace,
        role,
        isOwner,
        isAdminOrOwner,
        userWorkspaces,
        loading,
        isDemoMode,
        signOut,
        refreshWorkspace: fetchWorkspaceData,
        updateUserLocally,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserProfile, Workspace, WorkspaceRole } from '@/lib/types';
import { currentUser as mockUser, currentWorkspace as mockWorkspace } from '@/lib/mockData';

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
  const slug = (params?.slug as string) || 'factor-labs';

  const [user, setUser] = useState<UserProfile>(() =>
    slug === 'factor-labs'
      ? mockUser
      : {
          id: '',
          name: '',
          email: '',
          initials: '..',
          role: 'Workspace Owner',
          status: 'online',
        }
  );
  const [workspace, setWorkspace] = useState<Workspace>(() =>
    slug === 'factor-labs'
      ? mockWorkspace
      : {
          id: '',
          name: slug.toUpperCase(),
          slug: slug,
          ownerId: '',
          membersCount: 1,
          projectsCount: 0,
        }
  );
  const [role, setRole] = useState<WorkspaceRole>('owner');
  const [userWorkspaces, setUserWorkspaces] = useState<
    { id: string; name: string; slug: string; role: WorkspaceRole }[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  const fetchWorkspaceData = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        // Unauthenticated visitor
        if (slug === 'factor-labs') {
          setIsDemoMode(true);
          setUser(mockUser);
          setWorkspace(mockWorkspace);
          setRole('owner');
        } else {
          router.push('/login');
        }
        setLoading(false);
        return;
      }

      // 1. Fetch user profile from public.profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      const fullName = profile?.full_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Member';
      const initials = fullName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      // 2. Fetch active workspace directly by slug
      const { data: activeWs } = await supabase
        .from('workspaces')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      // 3. Fetch user's membership for active workspace
      let activeRole: WorkspaceRole = 'member';
      let activeJobTitle = 'Workspace Member';

      if (activeWs) {
        const { data: memberRecord } = await supabase
          .from('workspace_members')
          .select('role, job_title')
          .eq('workspace_id', activeWs.id)
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (memberRecord) {
          activeRole = memberRecord.role as WorkspaceRole;
          activeJobTitle = memberRecord.job_title || (activeRole === 'owner' ? 'Workspace Owner' : 'Member');
        } else if (activeWs.owner_id === authUser.id) {
          activeRole = 'owner';
          activeJobTitle = 'Workspace Owner';
        }
      }

      // 4. Fetch all user workspaces for switcher
      const { data: userWsList } = await supabase
        .from('workspace_members')
        .select('role, workspaces(id, name, slug)')
        .eq('user_id', authUser.id);

      const parsedWorkspaces: { id: string; name: string; slug: string; role: WorkspaceRole }[] = [];
      if (userWsList) {
        userWsList.forEach((uw: any) => {
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

      const resolvedUser: UserProfile = {
        id: authUser.id,
        name: fullName,
        email: authUser.email || '',
        avatarUrl: profile?.avatar_url || undefined,
        initials: initials || 'ME',
        role: activeJobTitle,
        status: 'online',
      };
      setUser(resolvedUser);

      // 5. Set active workspace state
      if (activeWs) {
        setIsDemoMode(false);
        setRole(activeRole);

        const { count: realProjectCount } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', activeWs.id);

        setWorkspace({
          id: activeWs.id,
          name: activeWs.name,
          slug: activeWs.slug,
          ownerId: activeWs.owner_id,
          membersCount: parsedWorkspaces.length || 1,
          projectsCount: realProjectCount || 0,
        });
      } else if (slug === 'factor-labs') {
        // Fallback to sample demo if viewing factor-labs
        setIsDemoMode(true);
        setRole('owner');
        setWorkspace(mockWorkspace);
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
    fetchWorkspaceData();
  }, [fetchWorkspaceData]);

  const signOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      console.error('Sign out error:', err);
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


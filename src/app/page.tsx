import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect('/login');
    }

    const { data: memberships } = await supabase
      .from('workspace_members')
      .select('workspaces(slug)')
      .eq('user_id', user.id)
      .limit(1);

    if (memberships && memberships.length > 0 && (memberships[0] as any)?.workspaces?.slug) {
      redirect(`/w/${(memberships[0] as any).workspaces.slug}`);
    }

    redirect('/onboarding');
  } catch (err) {
    // If auth fails or not logged in, take to login
    redirect('/login');
  }
}

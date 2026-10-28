import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: memberships } = await supabase
          .from('workspace_members')
          .select('workspaces(slug)')
          .eq('user_id', user.id)
          .limit(1);

        if (memberships && memberships.length > 0 && (memberships[0] as any)?.workspaces?.slug) {
          return NextResponse.redirect(`${origin}/w/${(memberships[0] as any).workspaces.slug}`);
        }
        return NextResponse.redirect(`${origin}/onboarding`);
      }
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  // Return user to login with error
  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}

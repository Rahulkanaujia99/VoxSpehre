import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (code) {
    try {
      const supabase = createClient();
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        return NextResponse.redirect(
          `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`
        );
      }
      // Sign out session as instructed so user logs in on the sign in page
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?verified=true`);
    } catch {
      return NextResponse.redirect(`${origin}/login?verified=true`);
    }
  }

  return NextResponse.redirect(`${origin}/login?verified=true`);
}

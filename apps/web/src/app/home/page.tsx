import { redirect } from 'next/navigation';
import { homeHref } from '@/lib/routes';
import { getServerSupabase } from '@/lib/supabase/server';

/** After sign-in: send each person to their role's home (or onboarding). */
export default async function Home(props: PageProps<'/home'>) {
  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/sign-in');
  const { data: profile } = await supabase.from('profiles').select('role, onboarded_at').eq('id', auth.user.id).single();
  if (!profile) redirect('/sign-in');
  const { requested } = await props.searchParams;
  const href = homeHref(profile);
  redirect(typeof requested === 'string' && requested !== profile.role ? `${href}?requested=${requested}` : href);
}

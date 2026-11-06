import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PublicHeader from '@/components/PublicHeader';
import SiteFooter from '@/components/SiteFooter';
import { MONTHLY_CENTS, MONTHLY_COUNT, TUITION_CENTS, money } from '@/lib/pricing';

export const metadata = { title: 'Dream Big Academy' };
export const dynamic = 'force-dynamic';

export default async function Landing() {
  // Signed-in students and the instructor go straight to their dashboard.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/home');

  return (
    <>
      <PublicHeader />
      <main className="main--flush">
        <section className="pubhero">
          <div className="wrap">
            <p className="eyebrow" style={{ color: '#ff8fab' }}>Dream Big Studios · Killeen, TX</p>
            <h1>Learn to record, mix and master.</h1>
            <p>
              A six-month, in-person Audio Engineering Academy taught in Pro Tools at Dream Big Studios. One three-hour class a week. Students must be 16 or older.
            </p>
            <div className="pubhero__cta">
              <Link className="btn" href="/apply">Apply to the Academy</Link>
              <Link className="btn btn--ghost" href="/login">Student log in</Link>
            </div>
          </div>
        </section>
        <section className="pubfacts">
          <div className="wrap">
            <div className="grid grid--2">
              <div className="card">
                <p className="eyebrow">Tuition</p>
                <p className="stat">{money(TUITION_CENTS)}</p>
                <p className="muted" style={{ marginTop: 10 }}>
                  Pay in full, or {money(MONTHLY_CENTS)} a month for {MONTHLY_COUNT} months.
                </p>
              </div>
              <div className="card">
                <p className="eyebrow">Already enrolled?</p>
                <p style={{ marginBottom: 14 }}>Log in for your classes, homework, feedback and messages.</p>
                <Link className="btn btn--ghost btn--sm" href="/login">Log in</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

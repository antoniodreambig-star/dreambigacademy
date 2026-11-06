import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PublicHeader from '@/components/PublicHeader';
import SiteFooter from '@/components/SiteFooter';
import { money, termsFor } from '@/lib/pricing';

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
              The Dream Big Studios Audio Engineering Academy, taught in Pro Tools: six months in person in Killeen, TX, or three months online from anywhere. Students must be 16 or older.
            </p>
            <div className="pubhero__cta">
              <Link className="btn" href="/apply?track=in_person">Apply in person</Link>
              <Link className="btn" href="/apply?track=online">Apply online</Link>
              <Link className="btn btn--ghost" href="/login">Student log in</Link>
            </div>
          </div>
        </section>
        <section className="pubfacts">
          <div className="wrap">
            <div className="grid grid--3">
              <div className="card">
                <p className="eyebrow">In person · 6 months</p>
                <p className="stat">{money(termsFor('in_person').total)}</p>
                <p className="muted" style={{ marginTop: 10 }}>
                  One three-hour class a week at the studio. Pay in full, or {money(termsFor('in_person').monthlyCents)} a month for {termsFor('in_person').monthlyCount} months.
                </p>
              </div>
              <div className="card">
                <p className="eyebrow">Online only · 3 months</p>
                <p className="stat">{money(termsFor('online').total)}</p>
                <p className="muted" style={{ marginTop: 10 }}>
                  A live video session each week, recordings of every session, office hours and homework feedback.
                  {termsFor('online').allowMonthly ? ` Pay in full, or ${termsFor('online').monthlyCount} monthly payments.` : ''}
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

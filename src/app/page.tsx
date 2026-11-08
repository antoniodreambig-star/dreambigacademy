import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import PublicHeader from '@/components/PublicHeader';
import SiteFooter from '@/components/SiteFooter';
import JsonLd from '@/components/JsonLd';
import FaqList from '@/components/FaqList';
import { money, termsFor } from '@/lib/pricing';
import { MODULES, MODULE_KEYS } from '@/lib/modules';
import { BIZ, breadcrumbLd, courseLd, faqInPerson, faqLd, graph, organizationLd } from '@/lib/seo';

const TITLE = 'Audio School in Killeen, TX | Audio Engineering Course | Dream Big Academy';
const DESC = 'Audio engineering school in Killeen, TX. Three standalone modules in recording, mixing and mastering with Pro Tools at Dream Big Studios. In person or online. Ages 16+. Apply today.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESC,
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    siteName: 'Dream Big Academy',
    title: 'Audio School in Killeen, TX | Dream Big Academy',
    description: DESC,
    images: [{ url: '/share-app.png', width: 1200, height: 630, alt: 'Dream Big Academy: audio engineering school in Killeen, TX' }],
  },
  twitter: { card: 'summary_large_image', title: 'Audio School in Killeen, TX | Dream Big Academy', description: DESC, images: ['/share-app.png'] },
};
export const dynamic = 'force-dynamic';

export default async function Landing() {
  // Signed-in students and the instructor go straight to their dashboard.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/home');

  const faqs = faqInPerson();
  const inP = termsFor('in_person');
  const onl = termsFor('online');

  return (
    <>
      <JsonLd data={graph(organizationLd(), ...courseLd('in_person'), faqLd(faqs), breadcrumbLd([{ name: 'Dream Big Academy', path: '/' }]))} />
      <PublicHeader />
      <main className="main--flush">
        <section className="pubhero">
          <div className="wrap">
            <p className="eyebrow" style={{ color: '#ff8fab' }}>Dream Big Studios · Killeen, TX</p>
            <h1>Audio engineering school in Killeen, TX.</h1>
            <p>
              Learn to record, mix and master music in Pro Tools inside a working Killeen recording studio. The Dream Big Academy is three standalone modules. Each runs {inP.length} in person, or {onl.length} online from anywhere, and you can take any one on its own. Students must be 16 or older.
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
                <p className="eyebrow">In person · {inP.length} per module</p>
                <p className="stat">{money(inP.total)} <span className="small muted">per module</span></p>
                <p className="muted" style={{ marginTop: 10 }}>
                  One three-hour class a week at the studio. Pay in full, or {money(inP.monthlyCents)} a month for {inP.monthlyCount} months.
                </p>
              </div>
              <div className="card">
                <p className="eyebrow">Online only · {onl.length} per module</p>
                <p className="stat">{money(onl.total)} <span className="small muted">per module</span></p>
                <p className="muted" style={{ marginTop: 10 }}>
                  {onl.classes} live video sessions, recordings of every session, office hours and homework feedback.
                  {onl.allowMonthly ? ` Pay in full, or ${onl.monthlyCount} monthly payments.` : ''} <Link href="/online">See the online modules</Link>.
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

        <section className="pubsection">
          <div className="wrap">
            <h2>Three modules. Take one, or all three over time.</h2>
            <p>Together the modules teach the full path of a song, from the first microphone to the finished master, using Pro Tools, the software used in professional studios. Each module is its own short course: you sign up and pay for one at a time, and you never have to take the others.</p>
            <div className="grid grid--3" style={{ marginTop: 16 }}>
              {MODULE_KEYS.map((k) => (
                <div className="card" key={k}>
                  <p className="eyebrow">Module {MODULES[k].letter} · {inP.length}</p>
                  <h3>{MODULES[k].name}</h3>
                  <p className="muted">{MODULES[k].blurb}</p>
                  <ul className="checklist">{MODULES[k].topics.map((tp) => <li key={tp}>{tp}</li>)}</ul>
                  <p className="small muted">{money(inP.total)} in person · {money(onl.total)} online</p>
                  <Link className="btn btn--sm" href={`/apply?track=in_person&module=${k}`}>Apply for Module {MODULES[k].letter}</Link>
                </div>
              ))}
            </div>
            <p style={{ marginTop: 16 }}>Every week has a class, homework and projects. The instructor reviews your work and gives you feedback, and you can message him inside the student portal.</p>
          </div>
        </section>

        <section className="pubsection">
          <div className="wrap grid grid--2" style={{ alignItems: 'center' }}>
            <div>
              <h2>An audio and media production school inside a working studio</h2>
              <p>Dream Big Studios records, mixes and masters music for artists in Killeen and across Central Texas, and records podcasts and voice work for creators and businesses. Academy students learn in that same room, on the same equipment, from the engineer who runs it.</p>
              <ul className="checklist">
                <li>In-person classes in Killeen, TX, with hands-on time in the control room</li>
                <li>One three-hour class a week for {inP.length} in each module</li>
                <li>Ages 16 and up. Under 18 needs a parent or guardian consent form</li>
                <li>Online option with live weekly video sessions and recordings</li>
              </ul>
            </div>
            <img
              className="pubsection__img"
              src="/hero.jpg"
              width={1440}
              height={960}
              loading="lazy"
              alt="Pro Tools mixing session on two monitors with studio speakers in the Dream Big Studios control room in Killeen, TX"
            />
          </div>
        </section>

        <section className="pubsection">
          <div className="wrap">
            <h2>Audio school near Killeen, Harker Heights, Copperas Cove and Temple</h2>
            <p>
              The studio is on W Stan Schlueter Loop in Killeen, a short drive from Harker Heights, Nolanville, Copperas Cove, Belton, Temple and Fort Hood. Prefer to learn from home? The <Link href="/online">online audio engineering modules</Link> cover the same skills, {onl.length} each.
            </p>
            <p>
              <strong>{BIZ.name}</strong>
              <br />
              {BIZ.street}, {BIZ.city}, {BIZ.region} {BIZ.zip}
              <br />
              <a href={BIZ.mapsUrl} rel="noopener">Get directions on Google Maps</a>
            </p>
          </div>
        </section>

        <section className="pubsection">
          <div className="wrap narrow">
            <h2>Audio school questions, answered</h2>
            <FaqList items={faqs} />
          </div>
        </section>

        <section className="pubsection" style={{ paddingBottom: 40 }}>
          <div className="wrap">
            <div className="card card--dark">
              <h2 style={{ color: '#fff' }}>Ready to learn audio engineering in Killeen?</h2>
              <p style={{ color: 'rgba(255,255,255,.8)' }}>Applications take a few minutes. We email you about next steps.</p>
              <div className="pubhero__cta" style={{ marginTop: 8 }}>
                <Link className="btn" href="/apply?track=in_person">Apply in person</Link>
                <Link className="btn btn--ghost" href="/apply?track=online" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.45)' }}>Apply online</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

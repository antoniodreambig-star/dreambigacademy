import Link from 'next/link';
import type { Metadata } from 'next';
import PublicHeader from '@/components/PublicHeader';
import SiteFooter from '@/components/SiteFooter';
import JsonLd from '@/components/JsonLd';
import FaqList from '@/components/FaqList';
import { money, termsFor } from '@/lib/pricing';
import { MODULES, MODULE_KEYS } from '@/lib/modules';
import { breadcrumbLd, courseLd, faqLd, faqOnline, graph, organizationLd } from '@/lib/seo';

const DESC = 'Online audio engineering modules. Learn recording, mixing and mastering in Pro Tools in live classes from a working Killeen, TX studio engineer. Three standalone modules. Ages 16+.';

export const metadata: Metadata = {
  title: { absolute: 'Online Audio Engineering Modules | Learn Pro Tools | Dream Big Academy' },
  description: DESC,
  alternates: { canonical: '/online' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    siteName: 'Dream Big Academy',
    title: 'Online Audio Engineering Modules | Dream Big Academy',
    description: DESC,
    images: [{ url: '/share-app.png', width: 1200, height: 630, alt: 'Dream Big Academy online audio engineering modules' }],
  },
  twitter: { card: 'summary_large_image', title: 'Online Audio Engineering Modules | Dream Big Academy', description: DESC, images: ['/share-app.png'] },
};

export default function OnlineCourse() {
  const o = termsFor('online');
  const faqs = faqOnline();
  return (
    <>
      <JsonLd
        data={graph(
          organizationLd(),
          ...courseLd('online'),
          faqLd(faqs),
          breadcrumbLd([
            { name: 'Dream Big Academy', path: '/' },
            { name: 'Online audio engineering modules', path: '/online' },
          ]),
        )}
      />
      <PublicHeader />
      <main className="main--flush">
        <section className="pubhero">
          <div className="wrap">
            <p className="crumbs">
              <Link href="/">Dream Big Academy</Link> / Online modules
            </p>
            <h1>Online audio engineering modules.</h1>
            <p>
              Learn recording, mixing and mastering in Pro Tools from a working studio engineer in Killeen, TX. Three standalone modules, each {o.length} with {o.classes} live sessions, from anywhere. Take any one on its own. Students must be 16 or older.
            </p>
            <div className="pubhero__cta">
              <Link className="btn" href="/apply?track=online">Apply for an online module</Link>
              <Link className="btn btn--ghost" href="/">In-person modules in Killeen</Link>
            </div>
          </div>
        </section>

        <section className="pubfacts">
          <div className="wrap">
            <div className="card">
              <p className="eyebrow">Online only · {o.length} per module</p>
              <p className="stat">{money(o.total)} <span className="small muted">per module</span></p>
              <p className="muted" style={{ marginTop: 10 }}>
                Pay in full{o.allowMonthly ? `, or ${o.monthlyCount} monthly payments` : ''}. You pay for one module at a time.
              </p>
            </div>
          </div>
        </section>

        <section className="pubsection">
          <div className="wrap">
            <h2>The three online modules</h2>
            <div className="grid grid--3" style={{ marginBottom: 16 }}>
              {MODULE_KEYS.map((k) => (
                <div className="card" key={k}>
                  <p className="eyebrow">Module {MODULES[k].letter} · {o.length}</p>
                  <h3>{MODULES[k].name}</h3>
                  <p className="muted">{MODULES[k].blurb}</p>
                  <Link className="btn btn--sm" href={`/apply?track=online&module=${k}`}>Apply for Module {MODULES[k].letter}</Link>
                </div>
              ))}
            </div>
            <p>Each module is its own short course. You sign up and pay for one at a time, and you never have to take the others.</p>
            <h2>How the online modules work</h2>
            <ul className="checklist">
              <li>{o.classes} live video sessions with the instructor in each module</li>
              <li>Recordings of every session, so you can watch again</li>
              <li>Office hours for questions</li>
              <li>Homework and projects with personal feedback</li>
              <li>Private messages with the instructor in the student portal</li>
            </ul>
            <p>You learn the same skills as the in-person modules: recording, mixing and mastering in Pro Tools, the software used in professional studios.</p>
          </div>
        </section>

        <section className="pubsection">
          <div className="wrap">
            <h2>Taught by a working Killeen studio engineer</h2>
            <p>
              The course is taught by Antonio Noriega, owner and head engineer of Dream Big Studios in Killeen, TX, where music, podcasts and voice work are recorded, mixed and mastered every week. Prefer to learn in the room? See the <Link href="/">in-person audio school in Killeen</Link>.
            </p>
          </div>
        </section>

        <section className="pubsection">
          <div className="wrap narrow">
            <h2>Online audio module questions, answered</h2>
            <FaqList items={faqs} />
          </div>
        </section>

        <section className="pubsection" style={{ paddingBottom: 40 }}>
          <div className="wrap">
            <div className="card card--dark">
              <h2 style={{ color: '#fff' }}>Start learning audio engineering online</h2>
              <p style={{ color: 'rgba(255,255,255,.8)' }}>Applications take a few minutes. We email you about next steps.</p>
              <div className="pubhero__cta" style={{ marginTop: 8 }}>
                <Link className="btn" href="/apply?track=online">Apply online</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

import { money, termsFor } from './pricing';
import { MODULES, MODULE_KEYS, moduleLabel } from './modules';

/** Public site address (set NEXT_PUBLIC_SITE_URL in Vercel). Used for canonical links, the sitemap and structured data. */
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://app.dreambigctx.com').replace(/\/$/, '');
/** Main marketing site. */
export const MAIN_SITE = 'https://dreambigctx.com';

/**
 * Business details used in search results and structured data.
 * IMPORTANT: keep the name, address and phone EXACTLY the same as your Google Business Profile.
 * Google compares them. Set NEXT_PUBLIC_STUDIO_PHONE in Vercel (example: +12545551234) to add the phone number.
 */
export const BIZ = {
  name: 'Dream Big Studios',
  academy: 'Dream Big Academy',
  street: '1507 W Stan Schlueter Loop, Suite 101',
  city: 'Killeen',
  region: 'TX',
  zip: '76549',
  phone: process.env.NEXT_PUBLIC_STUDIO_PHONE || '',
  sameAs: ['https://www.instagram.com/dreambigctx/', 'https://www.tiktok.com/@dreambigctx'],
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Dream+Big+Studios+1507+W+Stan+Schlueter+Loop+Killeen+TX+76549',
};

export interface Faq {
  q: string;
  a: string;
}

const inP = () => termsFor('in_person');
const onl = () => termsFor('online');

/** Questions people actually ask. The same text is shown on the page and sent to Google as FAQ data. */
export function faqInPerson(): Faq[] {
  const t = inP();
  return [
    {
      q: 'Where is the Dream Big Academy audio school in Killeen, TX?',
      a: `Classes are held in person at Dream Big Studios, ${BIZ.street}, ${BIZ.city}, ${BIZ.region} ${BIZ.zip}. Students also come from Harker Heights, Copperas Cove, Nolanville, Belton, Temple and the Fort Hood area.`,
    },
    {
      q: 'What will I learn in the audio engineering modules?',
      a: 'You learn to record, mix and master music in Pro Tools. Module A covers audio engineering basics and recording, Module B covers intermediate mixing, and Module C covers advanced studio techniques and mastering. Each week has a class, homework and projects, and the instructor gives you feedback on your work.',
    },
    {
      q: 'How long is each module and when are the classes?',
      a: `Each in-person module runs ${t.length}, with one three-hour class a week at the studio, for ${t.classes * 3} classroom hours. Every class and homework due date shows in your student schedule.`,
    },
    {
      q: 'How much does the audio school cost?',
      a: `Each in-person module is ${money(t.total)}, paid in full or as ${money(t.monthlyCents)} a month for ${t.monthlyCount} months. Each online module is ${money(onl().total)}. You pay for one module at a time.`,
    },
    {
      q: 'Do I have to take all three modules?',
      a: 'No. Each module is its own short course. You can take one, skip one, or take them over time. Signing up for a module does not commit you to another one.',
    },
    {
      q: 'Who can apply?',
      a: 'Anyone 16 or older. Applicants under 18 need a parent or guardian, who receives a consent form by email to sign.',
    },
    {
      q: 'Can I take a module online instead?',
      a: `Yes. Each online module runs ${onl().length} with ${onl().classes} live video sessions, recordings of every session, office hours and homework feedback. You can join from anywhere.`,
    },
    {
      q: 'Who teaches the Academy?',
      a: 'Antonio Noriega, the owner and head engineer of Dream Big Studios in Killeen, teaches the modules. The studio records, mixes and masters music for artists and creators every week.',
    },
    {
      q: 'How do I apply?',
      a: 'Choose in person or online on the application page, pick your module, fill in the short form and submit it. We email you about next steps.',
    },
  ];
}

export function faqOnline(): Faq[] {
  const o = onl();
  return [
    {
      q: 'What are the online audio engineering modules?',
      a: `Three standalone ${o.length} modules that teach recording, mixing and mastering in Pro Tools, taught live over video by a working studio engineer in Killeen, TX.`,
    },
    {
      q: 'How do the online classes work?',
      a: `You join the in-person class at the studio, streamed live: one three-hour class a week, ${o.classes} classes per module. Every session is recorded so you can watch it again, and you can use office hours and send homework for feedback.`,
    },
    {
      q: 'How much does an online module cost?',
      a: `${money(o.total)} per module${o.allowMonthly ? `, or ${o.monthlyCount} monthly payments` : ', paid in full'}. You pay for one module at a time.`,
    },
    {
      q: 'Do I have to take all three modules?',
      a: 'No. Each module is its own short course, and signing up for one does not commit you to another.',
    },
    {
      q: 'Who can join the online modules?',
      a: 'Anyone 16 or older, anywhere. Applicants under 18 need a parent or guardian to sign a consent form.',
    },
    {
      q: 'Can I come to the studio in Killeen instead?',
      a: `Yes. Each in-person module runs ${inP().length} with a three-hour class each week at Dream Big Studios in Killeen, TX.`,
    },
    {
      q: 'How do I apply?',
      a: 'Choose the online track on the application page, pick your module, fill in the short form and submit it. We email you about next steps.',
    },
  ];
}

const abs = (path: string) => `${SITE}${path}`;
const orgId = `${MAIN_SITE}/#studio`;

export function organizationLd() {
  return {
    '@type': ['EducationalOrganization', 'LocalBusiness'],
    '@id': orgId,
    name: BIZ.academy,
    alternateName: BIZ.name,
    url: abs('/'),
    image: abs('/share-app.png'),
    logo: abs('/icon-512.png'),
    description: 'Audio engineering school in Killeen, TX teaching recording, mixing and mastering in Pro Tools through three standalone modules, in person and online.',
    address: { '@type': 'PostalAddress', streetAddress: BIZ.street, addressLocality: BIZ.city, addressRegion: BIZ.region, postalCode: BIZ.zip, addressCountry: 'US' },
    ...(BIZ.phone ? { telephone: BIZ.phone } : {}),
    areaServed: ['Killeen', 'Harker Heights', 'Copperas Cove', 'Nolanville', 'Belton', 'Temple', 'Fort Hood', 'Central Texas'].map((n) => ({ '@type': 'City', name: n })),
    parentOrganization: { '@type': 'Organization', name: BIZ.name, url: MAIN_SITE },
    sameAs: BIZ.sameAs,
  };
}

/** One Course per module and track, so each module can show up on its own in search. */
export function courseLd(track: 'in_person' | 'online') {
  const t = termsFor(track);
  const online = track === 'online';
  const hours = online ? 'PT3H per live session' : 'PT3H weekly';
  return MODULE_KEYS.map((k) => ({
    '@type': 'Course',
    '@id': abs(`${online ? '/online' : '/'}#module-${k}`),
    name: `${moduleLabel(k)}${online ? ' (Online)' : ' (Killeen, TX)'}`,
    description: `${MODULES[k].blurb} ${online ? 'Taught live online' : 'Taught in person at Dream Big Studios in Killeen, TX'} over ${t.length}. A standalone short course.`,
    url: abs(online ? '/online' : '/'),
    provider: { '@id': orgId },
    educationalLevel: k === 'a' ? 'Beginner' : k === 'b' ? 'Intermediate' : 'Advanced',
    teaches: MODULES[k].topics,
    offers: { '@type': 'Offer', category: 'Paid', price: (t.total / 100).toFixed(2), priceCurrency: 'USD', url: abs(`/apply?track=${track}&module=${k}`) },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: online ? 'Online' : 'Onsite',
      courseWorkload: hours,
      ...(online ? {} : { location: { '@type': 'Place', name: BIZ.name, address: { '@type': 'PostalAddress', streetAddress: BIZ.street, addressLocality: BIZ.city, addressRegion: BIZ.region, postalCode: BIZ.zip, addressCountry: 'US' } } }),
    },
  }));
}

export function faqLd(items: Faq[]) {
  return { '@type': 'FAQPage', mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
}

export function breadcrumbLd(trail: { name: string; path: string }[]) {
  return { '@type': 'BreadcrumbList', itemListElement: trail.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b.name, item: abs(b.path) })) };
}

/** One JSON-LD block holding several things. */
export const graph = (...nodes: object[]) => ({ '@context': 'https://schema.org', '@graph': nodes });

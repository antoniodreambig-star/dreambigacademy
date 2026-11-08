import type { Faq } from '@/lib/seo';

/** Visible FAQ. The same questions are also sent to Google in the page's structured data. */
export default function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="faq">
      {items.map((f) => (
        <details key={f.q} className="faq__item">
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}
    </div>
  );
}

import type { Faq } from '@/lib/seo';

/** Visible FAQ. The same questions are also sent to Google in the page's structured data. */
export default function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="faq">
      {items.map((f) => (
        <details key={f.q} className="faq__item">
          <summary>
            <span>{f.q}</span>
            <span className="faq__icon" aria-hidden="true" />
          </summary>
          <div className="faq__body">
            <p>{f.a}</p>
          </div>
        </details>
      ))}
    </div>
  );
}

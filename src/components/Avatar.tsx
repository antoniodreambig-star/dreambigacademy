export default function Avatar({ name, url, large }: { name?: string | null; url?: string | null; large?: boolean }) {
  const cls = `avatar${large ? ' avatar--lg' : ''}`;
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={cls} src={url} alt="" />;
  }
  const initials = (name || '?')
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span className={cls} aria-hidden="true">
      {initials}
    </span>
  );
}

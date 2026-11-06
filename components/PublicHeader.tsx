import Link from 'next/link';

/** Top bar for pages anyone can see (not signed in). The signed-in bar lives in the (app) layout. */
export default function PublicHeader() {
  return (
    <header className="top">
      <div className="wrap top__in">
        <Link className="brand" href="/">
          Dream Big <span>Academy</span>
        </Link>
        <nav className="nav" aria-label="Main" style={{ marginLeft: 'auto' }}>
          <a href="https://dreambigctx.com/academy/">About the Academy</a>
          <a href="https://dreambigctx.com">DreamBigCTX.com</a>
          <Link href="/login">Log in</Link>
          <Link className="nav__apply" href="/apply">
            Apply
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="login">
      <div className="login__hero">
        <p className="eyebrow" style={{ color: '#ff8fab' }}>Dream Big Studios · Killeen, TX</p>
        <h2>Learn to record, mix and master.</h2>
        <p className="login__sub">The Audio Engineering Academy student portal: your classes, homework, feedback and messages in one place.</p>
        <a className="login__back" href="https://dreambigctx.com">← Back to dreambigctx.com</a>
      </div>
      <div className="login__panel">{children}</div>
    </div>
  );
}

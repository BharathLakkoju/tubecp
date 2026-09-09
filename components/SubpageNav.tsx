import Link from "next/link";

export default function SubpageNav() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <nav className="nav-tabs" aria-label="Page navigation">
          <Link href="/" className="nav-tab">
            home
          </Link>
          <Link href="/app" className="nav-tab">
            app
          </Link>
        </nav>
      </div>
    </header>
  );
}

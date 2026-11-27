import { Link, useLocation } from "react-router-dom";
import "../../styles/auth-experience.css";

const AUTH_TABS = [
  { path: "/login", label: "Sign In" },
  { path: "/register/participant", label: "Participant" },
  { path: "/register/organizer", label: "Organizer" }
];

export default function AuthLayout({ title, subtitle, children }) {
  const { pathname } = useLocation();
  const activePath = pathname === "/" ? "/login" : pathname;
  const showAuthTabs = AUTH_TABS.some((tab) => tab.path === activePath);

  return (
    <div className="auth-screen">
      <header className="auth-topbar">
        <Link to="/login" className="auth-brand" aria-label="EventSphere sign in">
          <span className="auth-brand-mark">E</span>
          <span>
            <span className="auth-brand-name block">EventSphere</span>
            <span className="auth-brand-caption block">College event &amp; competition management</span>
          </span>
        </Link>
      </header>

      <main className="auth-main">
        <div className="auth-content">
          <section className="auth-card" aria-label="EventSphere account access">
            {showAuthTabs && (
              <nav className="auth-mode-tabs" aria-label="Choose account access">
                {AUTH_TABS.map((tab) => (
                  <Link
                    key={tab.path}
                    to={tab.path}
                    className="auth-mode-tab"
                    aria-current={activePath === tab.path ? "page" : undefined}
                  >
                    {tab.label}
                  </Link>
                ))}
              </nav>
            )}

            {(title || subtitle) && (
              <div className="auth-heading">
                {title && <h1>{title}</h1>}
                {subtitle && <p>{subtitle}</p>}
              </div>
            )}

            {children}
          </section>
        </div>
      </main>

      <footer className="auth-footer">
        &copy; {new Date().getFullYear()} EventSphere Platform. All rights reserved.
      </footer>
    </div>
  );
}

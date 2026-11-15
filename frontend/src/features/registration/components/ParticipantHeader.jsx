import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Award,
  BookmarkCheck,
  CalendarDays,
  GraduationCap,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X
} from "lucide-react";

export default function ParticipantHeader({
  user,
  activeTab,
  setActiveTab,
  activeRegistrationsCount,
  teamsCount,
  certificatesCount = 0,
  volunteerAssignmentsCount = 0,
  onLogout,
  onOpenAffiliationModal
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { id: "EXPLORE", label: "Discover", icon: CalendarDays },
    { id: "MY_REGISTRATIONS", label: "My registrations", icon: BookmarkCheck, badge: activeRegistrationsCount },
    { id: "MY_TEAMS", label: "My teams", icon: Users, badge: teamsCount },
    { id: "MY_CERTIFICATES", label: "Certificates", icon: Award, badge: certificatesCount }
  ];

  if (volunteerAssignmentsCount > 0) {
    navItems.push({ id: "VOLUNTEER", label: "Volunteer tools", icon: ShieldCheck, href: "/volunteer" });
  }

  const initials = (user?.name || "Participant")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  const collegeLabel = user?.collegeCode || user?.collegeName || "Campus";
  const isVerified = user?.collegeVerificationStatus === "VERIFIED";

  const handleNavigation = (item) => {
    setMobileMenuOpen(false);
    if (item.href) {
      navigate(item.href);
    } else {
      setActiveTab(item.id);
    }
  };

  const renderNavItem = (item, mobile = false) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    return (
      <button
        key={item.id}
        type="button"
        aria-current={isActive ? "page" : undefined}
        onClick={() => handleNavigation(item)}
        className={mobile ? "" : "participant-nav-button"}
      >
        <Icon size={mobile ? 17 : 15} aria-hidden="true" />
        <span>{item.label}</span>
        {item.badge > 0 && <span className="participant-nav-count">{item.badge}</span>}
      </button>
    );
  };

  return (
    <header className="participant-site-header">
      <div className="participant-header-inner">
        <Link to="/participant" className="participant-brand" aria-label="EventSphere home">
          <span className="participant-brand-mark">E</span>
          <span>EventSphere</span>
        </Link>

        <nav className="participant-desktop-nav" aria-label="Participant navigation">
          {navItems.map((item) => renderNavItem(item))}
        </nav>

        <div className="participant-header-spacer" />

        <button
          type="button"
          className="participant-header-context"
          onClick={() => !isVerified && onOpenAffiliationModal?.()}
          title={isVerified ? collegeLabel + " · Participant" : "Review college affiliation"}
        >
          <GraduationCap size={14} aria-hidden="true" />
          <span>{collegeLabel} · Participant</span>
          {isVerified && <ShieldCheck size={13} aria-label="Verified affiliation" />}
        </button>

        <div className="participant-header-user">
          <span className="participant-avatar" aria-hidden="true">{initials || "P"}</span>
          <div className="participant-user-copy">
            <div className="participant-user-name">{user?.name || "Participant"}</div>
            <div className="participant-user-email">{user?.email || ""}</div>
          </div>
        </div>

        <button type="button" onClick={onLogout} className="participant-header-logout">
          <LogOut size={15} aria-hidden="true" />
          <span>Sign out</span>
        </button>

        <button
          type="button"
          className="participant-mobile-menu-button"
          aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileMenuOpen && (
        <nav className="participant-mobile-nav" aria-label="Participant mobile navigation">
          {navItems.map((item) => renderNavItem(item, true))}
          {!isVerified && (
            <button type="button" onClick={() => { setMobileMenuOpen(false); onOpenAffiliationModal?.(); }}>
              <ShieldCheck size={17} aria-hidden="true" />
              <span>{user?.collegeVerificationStatus === "PENDING" ? "Affiliation pending" : "Verify college affiliation"}</span>
            </button>
          )}
          <button type="button" className="participant-mobile-logout" onClick={onLogout}>
            <LogOut size={17} aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </nav>
      )}
    </header>
  );
}

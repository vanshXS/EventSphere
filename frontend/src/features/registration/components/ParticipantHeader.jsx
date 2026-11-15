import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Menu, ShieldCheck, X } from "lucide-react";

export default function ParticipantHeader({
  user,
  activeTab,
  setActiveTab,
  activeRegistrationsCount = 0,
  teamsCount = 0,
  volunteerAssignmentsCount = 0,
  onLogout,
  onOpenAffiliationModal
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { id: "EXPLORE", label: "Discover" },
    { id: "MY_REGISTRATIONS", label: "My registrations", count: activeRegistrationsCount },
    { id: "MY_TEAMS", label: "My teams", count: teamsCount }
  ];

  if (volunteerAssignmentsCount > 0) {
    navItems.push({ id: "VOLUNTEER", label: "Volunteer tools", href: "/volunteer" });
  }

  const initials = (user?.name || "Participant")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  const collegeLabel = user?.collegeCode || user?.collegeName || "Campus";
  const isVerified = user?.collegeVerificationStatus === "VERIFIED";

  const navigateTo = (item) => {
    setMobileMenuOpen(false);
    if (item.href) {
      navigate(item.href);
    } else {
      setActiveTab(item.id);
    }
  };

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-6 px-8 max-md:px-4">
        <div className="flex h-full min-w-0 items-center gap-10 max-md:gap-0">
          <Link to="/participant" className="group flex shrink-0 items-center gap-2.5" aria-label="EventSphere home">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-base font-bold text-white">E</span>
            <span className="text-base font-semibold tracking-tight text-slate-900 transition-colors group-hover:text-indigo-600">EventSphere</span>
          </Link>

          <nav className="flex h-full items-center gap-8 text-sm font-medium max-md:hidden" aria-label="Participant navigation">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item)}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex h-full items-center border-b-2 px-0 pt-0.5 transition-colors ${
                    active
                      ? "border-indigo-600 font-semibold text-indigo-600"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                  {item.count > 0 && (
                    <span className="ml-1.5 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-4 max-md:hidden">
          <button
            type="button"
            onClick={() => !isVerified && onOpenAffiliationModal?.()}
            title={isVerified ? `${collegeLabel} · Participant` : "Review college affiliation"}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500"
          >
            <span>{collegeLabel}</span>
            <span>·</span>
            <span>Participant</span>
            {isVerified && <ShieldCheck size={14} className="text-emerald-600" aria-label="Verified" />}
          </button>

          <div className="flex items-center gap-2 pl-1" title={user?.email || ""}>
            <span className="grid h-8 w-8 place-items-center rounded-full border border-indigo-100 bg-indigo-50 text-xs font-semibold text-indigo-600">
              {initials || "P"}
            </span>
            <span className="max-w-32 truncate text-sm font-medium text-slate-800">{user?.name || "Participant"}</span>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-rose-600"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
          className="hidden h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 max-md:inline-flex"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileMenuOpen && (
        <nav className="absolute left-0 right-0 top-16 border-b border-slate-200 bg-white px-4 py-3 shadow-lg md:hidden" aria-label="Participant mobile navigation">
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">{initials || "P"}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{user?.name || "Participant"}</p>
                <p className="truncate text-xs text-slate-500">{collegeLabel} · Participant</p>
              </div>
            </div>
            {isVerified && <ShieldCheck size={17} className="shrink-0 text-emerald-600" />}
          </div>
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={activeTab === item.id ? "page" : undefined}
                onClick={() => navigateTo(item)}
                className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left text-sm font-medium ${
                  activeTab === item.id ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{item.label}</span>
                {item.count > 0 && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">{item.count}</span>}
              </button>
            ))}
            {!isVerified && (
              <button
                type="button"
                onClick={() => { setMobileMenuOpen(false); onOpenAffiliationModal?.(); }}
                className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-indigo-700 hover:bg-indigo-50"
              >
                <ShieldCheck size={16} />
                {user?.collegeVerificationStatus === "PENDING" ? "Affiliation pending" : "Verify college affiliation"}
              </button>
            )}
            <button type="button" onClick={onLogout} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-rose-600 hover:bg-rose-50">
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}

import React, { useState } from "react";
import { Calendar, LogOut, Menu, X } from "lucide-react";
import CollegeNavbarBadge from "./CollegeNavbarBadge";

/**
 * Shared app header used across all roles (Organizer, Participant, Volunteer).
 *
 * Props:
 *  - user:       current authenticated user object
 *  - onLogout:   sign-out callback
 *  - roleBadge:  { label, color } for the role pill (e.g. { label: "Organizer", color: "indigo" })
 *  - navItems:   array of { id, label, icon, badge?, onClick?, href? } for the tab bar
 *  - activeNav:  the currently active nav item id
 *  - onNavChange: callback when a nav item is clicked (receives id)
 *  - actions:    optional ReactNode for header-right action buttons (e.g. Create New)
 */
export default function AppHeader({
  user,
  onLogout,
  roleBadge = { label: "User", color: "slate" },
  navItems = [],
  activeNav,
  onNavChange,
  actions,
  onVerifyAffiliation
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const roleColors = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    slate: "bg-slate-100 text-slate-700 border-slate-200"
  };

  const roleStyle = roleColors[roleBadge.color] || roleColors.slate;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      {/* Primary bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-14">
        {/* Left: Logo + Role + College */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-indigo-600 text-white p-1.5 rounded-lg shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-lg text-slate-900 tracking-tight">
            Event<span className="text-indigo-600">Sphere</span>
          </span>
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${roleStyle}`}
          >
            {roleBadge.label}
          </span>

          <div className="hidden lg:block h-5 w-px bg-slate-200" />

          <CollegeNavbarBadge
            collegeName={user?.collegeName}
            collegeCode={user?.collegeCode}
            collegeId={user?.collegeId}
            verificationStatus={user?.collegeVerificationStatus}
            onVerifyAffiliation={onVerifyAffiliation}
            className="hidden lg:flex"
          />
        </div>

        {/* Right: Desktop actions + user + sign out */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Optional action buttons (desktop only) */}
          <div className="hidden sm:flex items-center gap-2">
            {actions}
          </div>

          {/* User name (desktop) */}
          <div className="hidden md:block text-right">
            <div className="text-sm font-semibold text-slate-800 leading-tight">
              {user?.name || "User"}
            </div>
            <div className="text-xs text-slate-500 leading-tight">{user?.email}</div>
          </div>

          {/* Sign out */}
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>

          {/* Mobile hamburger */}
          {navItems.length > 0 && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Desktop navigation tabs */}
      {navItems.length > 0 && (
        <nav className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100">
          <div className="flex gap-1 overflow-x-auto -mb-px">
            {navItems.map((item) => {
              const isActive = activeNav === item.id;
              const Icon = item.icon;

              const handleClick = () => {
                if (item.href) {
                  window.location.href = item.href;
                } else {
                  onNavChange?.(item.id);
                }
              };

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={handleClick}
                  className={`py-3 px-3 text-sm font-medium border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge !== null && (
                    <span
                      className={`px-1.5 py-0.5 text-[11px] font-bold rounded-full leading-none ${
                        isActive
                          ? "bg-indigo-100 text-indigo-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Mobile navigation drawer */}
      {navItems.length > 0 && mobileMenuOpen && (
        <nav className="md:hidden border-t border-slate-100 bg-white animate-fade-in">
          <div className="px-4 py-2 space-y-1">
            {/* College badge on mobile */}
            <div className="pb-2 mb-1 border-b border-slate-100">
              <CollegeNavbarBadge
                collegeName={user?.collegeName}
                collegeCode={user?.collegeCode}
                collegeId={user?.collegeId}
                compact={true}
              />
            </div>

            {navItems.map((item) => {
              const isActive = activeNav === item.id;
              const Icon = item.icon;

              const handleClick = () => {
                setMobileMenuOpen(false);
                if (item.href) {
                  window.location.href = item.href;
                } else {
                  onNavChange?.(item.id);
                }
              };

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={handleClick}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge !== undefined && item.badge !== null && (
                    <span
                      className={`px-1.5 py-0.5 text-[11px] font-bold rounded-full leading-none ${
                        isActive
                          ? "bg-indigo-100 text-indigo-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Mobile action buttons */}
            {actions && (
              <div className="pt-2 mt-1 border-t border-slate-100 flex flex-col gap-2">
                {actions}
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

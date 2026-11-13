import React from "react";
import { Calendar, BookmarkCheck, Users, ShieldCheck, Trophy, Award } from "lucide-react";
import AppHeader from "../../../components/common/AppHeader";

export default function ParticipantHeader({
  user,
  activeTab,
  setActiveTab,
  activeRegistrationsCount,
  teamsCount,
  volunteerAssignmentsCount = 0,
  onLogout,
  onOpenAffiliationModal
}) {
  const navItems = [
    {
      id: "EXPLORE",
      label: "Discover",
      icon: Calendar
    },
    {
      id: "MY_REGISTRATIONS",
      label: "My Registrations",
      icon: BookmarkCheck,
      badge: activeRegistrationsCount > 0 ? activeRegistrationsCount : null
    },
    {
      id: "MY_TEAMS",
      label: "My Teams",
      icon: Users,
      badge: teamsCount > 0 ? teamsCount : null
    },
    { id: "CERTIFICATES", label: "Certificates", icon: Award },
    {
      id: "RESULTS",
      label: "Results",
      icon: Trophy
    }
  ];

  // Conditionally add volunteer link
  if (volunteerAssignmentsCount > 0) {
    navItems.push({
      id: "VOLUNTEER",
      label: "Volunteer Tools",
      icon: ShieldCheck,
      href: "/volunteer"
    });
  }

  const affiliationAction = onOpenAffiliationModal ? (
    <button
      type="button"
      onClick={onOpenAffiliationModal}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors border shadow-2xs ${
        user?.collegeVerificationStatus === "VERIFIED"
          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
          : user?.collegeVerificationStatus === "PENDING"
          ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
          : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
      }`}
    >
      <ShieldCheck className="w-3.5 h-3.5" />
      <span>
        {user?.collegeVerificationStatus === "VERIFIED"
          ? "Verified Student"
          : user?.collegeVerificationStatus === "PENDING"
          ? "Verification Pending"
          : "Verify College Affiliation"}
      </span>
    </button>
  ) : null;

  return (
    <AppHeader
      user={user}
      onLogout={onLogout}
      roleBadge={{ label: "Participant", color: "emerald" }}
      navItems={navItems}
      activeNav={activeTab}
      onNavChange={setActiveTab}
      actions={affiliationAction}
      onVerifyAffiliation={onOpenAffiliationModal}
    />
  );
}

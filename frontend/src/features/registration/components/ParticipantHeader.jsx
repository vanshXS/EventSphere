import React from "react";
import { Calendar, BookmarkCheck, Users, ShieldCheck } from "lucide-react";
import AppHeader from "../../../components/common/AppHeader";

export default function ParticipantHeader({
  user,
  activeTab,
  setActiveTab,
  activeRegistrationsCount,
  teamsCount,
  volunteerAssignmentsCount = 0,
  onLogout
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

  return (
    <AppHeader
      user={user}
      onLogout={onLogout}
      roleBadge={{ label: "Participant", color: "emerald" }}
      navItems={navItems}
      activeNav={activeTab}
      onNavChange={setActiveTab}
    />
  );
}

import React from "react";
import { Calendar, BookmarkCheck, Users, LogOut } from "lucide-react";

export default function ParticipantHeader({
  user,
  activeTab,
  setActiveTab,
  activeRegistrationsCount,
  teamsCount,
  onLogout
}) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-xs">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">EventSphere</span>
            <span className="ml-2.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
              Participant
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:block text-right">
            <div className="text-xs font-semibold text-slate-800">{user?.name || "Participant"}</div>
            <div className="text-[11px] text-slate-500">{user?.email}</div>
          </div>
          <button
            onClick={onLogout}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-6 border-t border-slate-100">
        <button
          onClick={() => setActiveTab("EXPLORE")}
          className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === "EXPLORE"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Discover Events & Activities</span>
        </button>

        <button
          onClick={() => setActiveTab("MY_REGISTRATIONS")}
          className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === "MY_REGISTRATIONS"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <BookmarkCheck className="w-4 h-4" />
          <span>My Registrations</span>
          {activeRegistrationsCount > 0 && (
            <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {activeRegistrationsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("MY_TEAMS")}
          className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === "MY_TEAMS"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>My Teams</span>
          <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {teamsCount}
          </span>
        </button>
      </div>
    </header>
  );
}

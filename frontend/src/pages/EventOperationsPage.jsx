import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  ClipboardCheck,
  UserCheck,
  UserPlus,
  Copy,
  Check,
  RefreshCw,
  Search,
  Trash2,
  ExternalLink,
  Sliders,
  AlertCircle,
  CheckCircle2,
  Layers,
  ChevronRight,
  Info,
  QrCode,
  Shield,
  Loader2
} from "lucide-react";
import { getEventById } from "../features/events/eventApi";
import { getActivitiesByEvent } from "../features/activities/activityApi";
import {
  getEventStaff,
  inviteEventStaff,
  getActivityStaff,
  inviteActivityStaff,
  revokeStaff,
  getEventAttendance,
  getActivityAttendance
} from "../features/attendance/attendanceApi";
import { formatDateRange } from "../features/events/utils/eventHelpers";
import EventStatusBadge from "../features/events/components/EventStatusBadge";

export default function EventOperationsPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Main Tab: 'attendance' | 'volunteers' | 'overview'
  const activeTab = searchParams.get("tab") || "attendance";
  // Active Sub Tab for Attendance: 'entry' | 'activity'
  const attendanceSubTab = searchParams.get("sub") === "activity" ? "activity" : "entry";
  // Active Sub Tab for Volunteers: 'entry' | 'activity'
  const volunteerSubTab = searchParams.get("vsub") === "activity" ? "activity" : "entry";

  // Data States
  const [event, setEvent] = useState(null);
  const [activities, setActivities] = useState([]);
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [selectedVolActivityId, setSelectedVolActivityId] = useState("");

  // Attendance state
  const [entryAttendance, setEntryAttendance] = useState([]);
  const [activityAttendance, setActivityAttendance] = useState([]);
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Volunteer state
  const [entryStaff, setEntryStaff] = useState([]);
  const [activityStaff, setActivityStaff] = useState([]);
  const [volSearch, setVolSearch] = useState("");
  const [volLoading, setVolLoading] = useState(false);

  // Invite volunteer form state
  const [volunteerName, setVolunteerName] = useState("");
  const [volunteerEmail, setVolunteerEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [copiedLink, setCopiedLink] = useState("");

  // UI state
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Switch tabs while updating URL
  const setTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next);
  };

  const setAttendanceScope = (sub) => {
    const next = new URLSearchParams(searchParams);
    next.set("sub", sub);
    setSearchParams(next);
  };

  const setVolunteerScope = (vsub) => {
    const next = new URLSearchParams(searchParams);
    next.set("vsub", vsub);
    setSearchParams(next);
  };

  // Initial Load: Event info and activities
  const loadInitialData = useCallback(async () => {
    try {
      setError("");
      const [eventData, activitiesData] = await Promise.all([
        getEventById(eventId),
        getActivitiesByEvent(eventId)
      ]);
      setEvent(eventData);
      setActivities(activitiesData);
      if (activitiesData.length > 0) {
        setSelectedActivityId((prev) => prev || activitiesData[0].id);
        setSelectedVolActivityId((prev) => prev || activitiesData[0].id);
      }
    } catch (err) {
      console.error("Failed to load event data:", err);
      setError(err.response?.data?.message || "Failed to load event operations.");
    } finally {
      setInitialLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load Attendance data based on current tab/subtab
  const loadAttendanceData = useCallback(async () => {
    if (!eventId) return;
    setAttendanceLoading(true);
    try {
      if (attendanceSubTab === "entry") {
        const data = await getEventAttendance(eventId);
        setEntryAttendance(Array.isArray(data) ? data : []);
      } else if (selectedActivityId) {
        const data = await getActivityAttendance(selectedActivityId);
        setActivityAttendance(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load attendance:", err);
      setError(err.response?.data?.message || "Could not load attendance records.");
    } finally {
      setAttendanceLoading(false);
    }
  }, [eventId, attendanceSubTab, selectedActivityId]);

  useEffect(() => {
    if (!initialLoading && activeTab === "attendance") {
      loadAttendanceData();
    }
  }, [initialLoading, activeTab, attendanceSubTab, selectedActivityId, loadAttendanceData]);

  // Load Volunteer Staff data
  const loadVolunteerData = useCallback(async () => {
    if (!eventId) return;
    setVolLoading(true);
    try {
      if (volunteerSubTab === "entry") {
        const data = await getEventStaff(eventId);
        setEntryStaff(Array.isArray(data) ? data : []);
      } else if (selectedVolActivityId) {
        const data = await getActivityStaff(selectedVolActivityId);
        setActivityStaff(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load staff:", err);
      setError(err.response?.data?.message || "Could not load volunteers list.");
    } finally {
      setVolLoading(false);
    }
  }, [eventId, volunteerSubTab, selectedVolActivityId]);

  useEffect(() => {
    if (!initialLoading && activeTab === "volunteers") {
      loadVolunteerData();
    }
  }, [initialLoading, activeTab, volunteerSubTab, selectedVolActivityId, loadVolunteerData]);

  // Refresh current view
  const handleRefresh = async () => {
    setRefreshing(true);
    setError("");
    try {
      if (activeTab === "attendance") {
        await loadAttendanceData();
      } else if (activeTab === "volunteers") {
        await loadVolunteerData();
      } else {
        await loadInitialData();
      }
    } finally {
      setRefreshing(false);
    }
  };

  // Invite Volunteer Handler
  const handleInviteVolunteer = async (e) => {
    e.preventDefault();
    if (!volunteerEmail.trim()) return;

    setInviting(true);
    setError("");
    setSuccess("");

    try {
      if (volunteerSubTab === "entry") {
        const newStaff = await inviteEventStaff(eventId, {
          name: volunteerName.trim() || null,
          email: volunteerEmail.trim()
        });
        setEntryStaff((prev) => [newStaff, ...prev]);
        setSuccess(`Invitation generated for ${volunteerEmail}. Share the link below.`);
      } else {
        if (!selectedVolActivityId) return;
        const newStaff = await inviteActivityStaff(selectedVolActivityId, {
          name: volunteerName.trim() || null,
          email: volunteerEmail.trim()
        });
        setActivityStaff((prev) => [newStaff, ...prev]);
        setSuccess(`Activity invitation generated for ${volunteerEmail}.`);
      }
      setVolunteerName("");
      setVolunteerEmail("");
    } catch (err) {
      console.error("Failed to invite volunteer:", err);
      setError(err.response?.data?.message || "Failed to create volunteer invitation.");
    } finally {
      setInviting(false);
    }
  };

  // Revoke Volunteer Handler
  const handleRevokeStaff = async (staffId) => {
    if (!window.confirm("Are you sure you want to revoke this volunteer's scanning access?")) {
      return;
    }
    try {
      setError("");
      await revokeStaff(staffId);
      if (volunteerSubTab === "entry") {
        setEntryStaff((prev) =>
          prev.map((s) => (s.id === staffId ? { ...s, status: "REVOKED" } : s))
        );
      } else {
        setActivityStaff((prev) =>
          prev.map((s) => (s.id === staffId ? { ...s, status: "REVOKED" } : s))
        );
      }
      setSuccess("Volunteer access revoked successfully.");
    } catch (err) {
      console.error("Failed to revoke staff:", err);
      setError(err.response?.data?.message || "Could not revoke volunteer access.");
    }
  };

  // Copy Link Handler
  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(text);
      setTimeout(() => setCopiedLink(""), 2000);
    } catch {
      setError("Failed to copy link to clipboard.");
    }
  };

  // Filtered Attendance List
  const currentAttendanceList = attendanceSubTab === "entry" ? entryAttendance : activityAttendance;
  const filteredAttendance = useMemo(() => {
    if (!attendanceSearch.trim()) return currentAttendanceList;
    const q = attendanceSearch.toLowerCase();
    return currentAttendanceList.filter((rec) => {
      const name = (rec.participantName || rec.participantId || "").toLowerCase();
      const by = (rec.checkedInBy || "").toLowerCase();
      const type = (rec.checkInType || "").toLowerCase();
      return name.includes(q) || by.includes(q) || type.includes(q);
    });
  }, [currentAttendanceList, attendanceSearch]);

  // Filtered Volunteer List
  const currentStaffList = volunteerSubTab === "entry" ? entryStaff : activityStaff;
  const filteredStaff = useMemo(() => {
    if (!volSearch.trim()) return currentStaffList;
    const q = volSearch.toLowerCase();
    return currentStaffList.filter((s) => {
      const name = (s.invitedName || "").toLowerCase();
      const email = (s.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [currentStaffList, volSearch]);

  const selectedActivityObj = activities.find((a) => a.id === selectedActivityId);
  const selectedVolActivityObj = activities.find((a) => a.id === selectedVolActivityId);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-500">Loading operations console...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Event Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            The event you are trying to manage could not be found or you don't have access.
          </p>
          <Link
            to="/organizer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Organizer Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Header / Breadcrumb */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/organizer"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Back to Organizer Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="h-5 w-px bg-slate-200 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  Operations Console
                </span>
                <span className="text-slate-300">/</span>
                <EventStatusBadge status={event.status} />
              </div>
              <h1 className="text-base font-bold text-slate-900 truncate" title={event.title}>
                {event.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-60"
              title="Refresh Current Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              to={`/organizer/events/${eventId}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit Event</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Event Quick Overview Strip */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900">{event.title}</h2>
              <span className="text-xs font-medium text-slate-400">
                ({activities.length} {activities.length === 1 ? "activity" : "activities"})
              </span>
            </div>
            <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                {formatDateRange(event.startDateTime, event.endDateTime)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {event.venue || "No venue set"}
              </span>
            </div>
          </div>

          {/* Quick Stats Pills */}
          <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-5 shrink-0">
            <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 text-center min-w-[90px]">
              <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Gate Entry
              </span>
              <span className="text-base font-bold text-slate-800">
                {entryAttendance.length}
              </span>
            </div>
            <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 text-center min-w-[90px]">
              <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Staff
              </span>
              <span className="text-base font-bold text-slate-800">
                {entryStaff.filter((s) => s.status === "ACTIVE").length}
              </span>
            </div>
          </div>
        </div>

        {/* Global Alerts */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError("")}
              className="text-rose-500 hover:text-rose-700 text-xs cursor-pointer font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
            <button
              onClick={() => setSuccess("")}
              className="text-emerald-500 hover:text-emerald-700 text-xs cursor-pointer font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Master Navigation Tabs */}
        <div className="border-b border-slate-200">
          <nav className="flex space-x-6">
            <button
              type="button"
              onClick={() => setTab("attendance")}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === "attendance"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Live Attendance</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600">
                {entryAttendance.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTab("volunteers")}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === "volunteers"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Volunteers & Staff</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600">
                {entryStaff.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTab("overview")}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === "overview"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Info className="w-4 h-4" />
              <span>Event Scope</span>
            </button>
          </nav>
        </div>

        {/* ══════════════════════════════════════════════════════════
            TAB 1: LIVE ATTENDANCE (No Redirecting! Instant Sub-Tabs)
            ══════════════════════════════════════════════════════════ */}
        {activeTab === "attendance" && (
          <div className="space-y-4">
            {/* Sub-Tabs / Scope Bar */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAttendanceScope("entry")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    attendanceSubTab === "entry"
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Main Event Gate</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    attendanceSubTab === "entry" ? "bg-indigo-700 text-white" : "bg-white text-slate-700"
                  }`}>
                    {entryAttendance.length}
                  </span>
                </button>

                {activities.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAttendanceScope("activity")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      attendanceSubTab === "activity"
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Activity Check-ins</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      attendanceSubTab === "activity" ? "bg-indigo-700 text-white" : "bg-white text-slate-700"
                    }`}>
                      {activities.length}
                    </span>
                  </button>
                )}
              </div>

              {/* Search Filter for Attendance */}
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter attendees..."
                  value={attendanceSearch}
                  onChange={(e) => setAttendanceSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 hover:bg-white focus:bg-white rounded-lg border border-slate-200 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                />
              </div>
            </div>

            {/* If Activity Scope is selected: Activity Selector Pills */}
            {attendanceSubTab === "activity" && activities.length > 0 && (
              <div className="bg-slate-100/80 p-2 rounded-xl flex items-center gap-1.5 overflow-x-auto">
                <span className="text-xs font-semibold text-slate-500 px-2 shrink-0">
                  Select Activity:
                </span>
                {activities.map((act) => {
                  const isSelected = act.id === selectedActivityId;
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => setSelectedActivityId(act.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                        isSelected
                          ? "bg-white text-indigo-700 font-semibold shadow-2xs border border-slate-200/80"
                          : "text-slate-600 hover:bg-white/60"
                      }`}
                    >
                      {act.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Attendance Table Card */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {attendanceSubTab === "entry"
                      ? "Main Event Gate Check-in Records"
                      : `Check-in Records · ${selectedActivityObj?.name || "Activity"}`}
                  </h3>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  {filteredAttendance.length} {filteredAttendance.length === 1 ? "record" : "records"}
                </span>
              </div>

              {attendanceLoading ? (
                <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
                  <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                  <p className="text-xs text-slate-500">Fetching attendance logs...</p>
                </div>
              ) : filteredAttendance.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-2">
                  <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-semibold text-slate-700">No Check-ins Recorded Yet</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {attendanceSubTab === "entry"
                      ? "When volunteers scan participant tickets at the main entrance, live check-in data will appear here immediately."
                      : "Participants who check into this activity via volunteer scanner will be listed here in real time."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3">Participant Name</th>
                        <th className="px-5 py-3">Check-in Time</th>
                        <th className="px-5 py-3">Verified By (Volunteer)</th>
                        <th className="px-5 py-3">Entry Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAttendance.map((rec) => (
                        <tr key={rec.attendanceId || `${rec.participantId}-${rec.checkedInAt}`} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3 font-semibold text-slate-900">
                            {rec.participantName || rec.participantId || "Anonymous Participant"}
                          </td>
                          <td className="px-5 py-3 text-slate-500">
                            {rec.checkedInAt ? new Date(rec.checkedInAt).toLocaleString() : "Just now"}
                          </td>
                          <td className="px-5 py-3 text-slate-600">
                            <span className="inline-flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-emerald-500" />
                              {rec.checkedInBy || "Scanner"}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                              {rec.checkInType || "STANDARD"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 2: VOLUNTEERS & STAFF (Unified Management)
            ══════════════════════════════════════════════════════════ */}
        {activeTab === "volunteers" && (
          <div className="space-y-4">
            {/* Sub-Tabs / Scope Bar */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVolunteerScope("entry")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    volunteerSubTab === "entry"
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Event Entry Staff</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    volunteerSubTab === "entry" ? "bg-indigo-700 text-white" : "bg-white text-slate-700"
                  }`}>
                    {entryStaff.length}
                  </span>
                </button>

                {activities.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setVolunteerScope("activity")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      volunteerSubTab === "activity"
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Activity Staff</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      volunteerSubTab === "activity" ? "bg-indigo-700 text-white" : "bg-white text-slate-700"
                    }`}>
                      {activities.length}
                    </span>
                  </button>
                )}
              </div>

              {/* Volunteer search */}
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search volunteers..."
                  value={volSearch}
                  onChange={(e) => setVolSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 hover:bg-white focus:bg-white rounded-lg border border-slate-200 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                />
              </div>
            </div>

            {/* If Activity Scope: Activity Selector */}
            {volunteerSubTab === "activity" && activities.length > 0 && (
              <div className="bg-slate-100/80 p-2 rounded-xl flex items-center gap-1.5 overflow-x-auto">
                <span className="text-xs font-semibold text-slate-500 px-2 shrink-0">
                  Select Activity:
                </span>
                {activities.map((act) => {
                  const isSelected = act.id === selectedVolActivityId;
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => setSelectedVolActivityId(act.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                        isSelected
                          ? "bg-white text-indigo-700 font-semibold shadow-2xs border border-slate-200/80"
                          : "text-slate-600 hover:bg-white/60"
                      }`}
                    >
                      {act.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Split Grid: Invite Box + Active Staff List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left Column: Invite Form */}
              <div className="lg:col-span-1">
                <form
                  onSubmit={handleInviteVolunteer}
                  className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {volunteerSubTab === "entry" ? "Add Gate Volunteer" : "Add Activity Volunteer"}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {volunteerSubTab === "entry"
                          ? "Can scan gate tickets for this event"
                          : `Can scan tickets for ${selectedVolActivityObj?.name || "activity"}`}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Volunteer Name <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={volunteerName}
                        onChange={(e) => setVolunteerName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full px-3 py-2 bg-slate-50 focus:bg-white rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        type="email"
                        value={volunteerEmail}
                        onChange={(e) => setVolunteerEmail(e.target.value)}
                        placeholder="volunteer@college.edu"
                        className="w-full px-3 py-2 bg-slate-50 focus:bg-white rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={inviting}
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer shadow-2xs"
                    >
                      {inviting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserPlus className="w-3.5 h-3.5" />
                      )}
                      <span>{inviting ? "Generating Link…" : "Generate Invite Link"}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: Volunteers List */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        {volunteerSubTab === "entry"
                          ? "Assigned Event Entry Volunteers"
                          : `Activity Volunteers · ${selectedVolActivityObj?.name || "Activity"}`}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {currentStaffList.filter((s) => s.status === "ACTIVE").length} active ·{" "}
                        {currentStaffList.filter((s) => s.status === "INVITED").length} pending invite
                      </p>
                    </div>
                  </div>

                  {volLoading ? (
                    <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
                      <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                      <p className="text-xs text-slate-500">Loading volunteer roster...</p>
                    </div>
                  ) : filteredStaff.length === 0 ? (
                    <div className="py-12 px-4 text-center space-y-2">
                      <Users className="w-8 h-8 text-slate-300 mx-auto" />
                      <h4 className="text-sm font-semibold text-slate-700">No Volunteers Assigned</h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Use the invite form on the left to add your first volunteer for check-in scanning.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {filteredStaff.map((staff) => {
                        const isRevoked = staff.status === "REVOKED";
                        const isInvited = staff.status === "INVITED";
                        const inviteLink = staff.invitationLink;

                        return (
                          <div key={staff.id} className="p-4 sm:p-5 flex flex-col gap-3 hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-slate-900">
                                    {staff.invitedName || staff.email}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                      staff.status === "ACTIVE"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : isRevoked
                                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                                        : "bg-amber-50 text-amber-700 border border-amber-200"
                                    }`}
                                  >
                                    {staff.status}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500">{staff.email}</p>
                              </div>

                              {!isRevoked && (
                                <button
                                  type="button"
                                  onClick={() => handleRevokeStaff(staff.id)}
                                  className="text-xs text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer flex items-center gap-1 font-medium"
                                  title="Revoke volunteer access"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Revoke</span>
                                </button>
                              )}
                            </div>

                            {/* Invitation Link Box if still invited */}
                            {isInvited && inviteLink && (
                              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 flex items-center justify-between gap-2">
                                <div className="truncate text-[11px] text-slate-500 font-mono flex-1">
                                  {inviteLink}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(inviteLink)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-600 border border-slate-200 rounded text-xs font-semibold transition-colors shrink-0 cursor-pointer"
                                >
                                  {copiedLink === inviteLink ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      <span className="text-emerald-600">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy Link</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 3: EVENT OVERVIEW & SCOPE
            ══════════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Event Details & Configuration</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Summary of event details and sub-activities.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <span className="font-semibold text-slate-500 block uppercase tracking-wider text-[10px]">
                  Schedule
                </span>
                <p className="text-slate-800 font-medium">
                  {formatDateRange(event.startDateTime, event.endDateTime)}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <span className="font-semibold text-slate-500 block uppercase tracking-wider text-[10px]">
                  Venue / Location
                </span>
                <p className="text-slate-800 font-medium">{event.venue || "Not specified"}</p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <span className="font-semibold text-slate-500 block uppercase tracking-wider text-[10px]">
                  Registration Type
                </span>
                <p className="text-slate-800 font-medium">
                  {event.registrationType || "Open Registration"}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <span className="font-semibold text-slate-500 block uppercase tracking-wider text-[10px]">
                  Status
                </span>
                <p className="text-slate-800 font-medium">{event.status || "DRAFT"}</p>
              </div>
            </div>

            {event.description && (
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-slate-700">Description</h4>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                  {event.description}
                </p>
              </div>
            )}

            {/* Activities List */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Associated Activities ({activities.length})
                </h4>
                <Link
                  to={`/organizer/events/${eventId}/edit`}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  Manage Activities in Editor →
                </Link>
              </div>

              {activities.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No activities added to this event.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activities.map((act) => (
                    <div
                      key={act.id}
                      className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-800">{act.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
                          {act.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {act.location || "No venue set"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

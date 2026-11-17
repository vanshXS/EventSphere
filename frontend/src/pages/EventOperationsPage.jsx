import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
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
  Sliders,
  AlertCircle,
  CheckCircle2,
  Layers,
  Info,
  QrCode,
  Shield,
  Loader2,
  Play,
  Activity,
  Clock,
  Trophy
} from "lucide-react";
import { getEventById } from "../features/events/eventApi";
import {
  getActivitiesByEvent,
  getActivitySummariesByEvent,
  startActivity,
  completeActivity
} from "../features/activities/activityApi";
import {
  getEventStaff,
  inviteEventStaff,
  getActivityStaff,
  inviteActivityStaff,
  revokeStaff,
  getEventAttendance,
  getActivityAttendance
} from "../features/attendance/attendanceApi";
import { formatDateRange, formatDateTime } from "../features/events/utils/eventHelpers";
import EventStatusBadge from "../features/events/components/EventStatusBadge";
import {
  getActivityTypeLabel,
  getActivityTypeBadgeStyle,
  isEnded
} from "../features/activities/utils/activityHelpers";
import ActivityRegistrationsModal from "../features/registration/components/ActivityRegistrationsModal";
import OrganizerCertificates from "../features/certificates/OrganizerCertificates";
import JudgeAssignmentManager from "../features/judging/components/JudgeAssignmentManager";
import { useToast } from "../components/common/ToastContext";
import "../styles/organizer-experience.css";

export default function EventOperationsPage() {
  const addToast = useToast();
  const { eventId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Main Tab: 'activities' | 'attendance' | 'volunteers' | 'overview'
  const activeTab = searchParams.get("tab") || "activities";
  // Active Sub Tab for Attendance: 'entry' | 'activity'
  const attendanceSubTab = searchParams.get("sub") === "activity" ? "activity" : "entry";
  // Staff workspace view: all team, activity-scoped volunteers, or competition judges.
  const volunteerSubTab =
    searchParams.get("vsub") === "judges"
      ? "judges"
      : searchParams.get("vsub") === "activity"
      ? "activity"
      : "all";

  // Data States
  const [event, setEvent] = useState(null);
  const [activities, setActivities] = useState([]);
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [selectedVolActivityId, setSelectedVolActivityId] = useState("");

  // Activity summaries state
  const [activitySummaries, setActivitySummaries] = useState([]);
  const [summariesLoading, setSummariesLoading] = useState(false);
  const [actioningIds, setActioningIds] = useState(new Set());
  const [selectedActivityForRegistrations, setSelectedActivityForRegistrations] = useState(null);

  // Attendance state
  const [entryAttendance, setEntryAttendance] = useState([]);
  const [activityAttendance, setActivityAttendance] = useState([]);
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Volunteer state
  const [entryStaff, setEntryStaff] = useState([]);
  const [activityStaff, setActivityStaff] = useState([]);
  const [allActivityStaff, setAllActivityStaff] = useState([]);
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
  const setError = useCallback((message) => {
    if (message) addToast(message, "error");
  }, [addToast]);
  const setSuccess = useCallback((message) => {
    if (message) addToast(message, "success");
  }, [addToast]);

  // Switch tabs while updating URL
  const setTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    if (tab !== "volunteers" || next.get("vsub") === "judges") {
      next.delete("vsub");
    }
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
  }, [eventId, setError]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadInitialData();
    });
    return () => { active = false; };
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
  }, [eventId, attendanceSubTab, selectedActivityId, setError]);

  useEffect(() => {
    let active = true;
    if (!initialLoading && activeTab === "attendance") {
      Promise.resolve().then(() => {
        if (active) loadAttendanceData();
      });
    }
    return () => { active = false; };
  }, [initialLoading, activeTab, attendanceSubTab, selectedActivityId, loadAttendanceData]);

  // Load event-entry and activity-scoped volunteers for the consolidated staff workspace.
  const loadVolunteerData = useCallback(async () => {
    if (!eventId) return;
    setVolLoading(true);
    try {
      if (volunteerSubTab === "all") {
        const [eventPeople, activityPeople] = await Promise.all([
          getEventStaff(eventId),
          Promise.all(
            activities.map(async (activity) => ({
              activity,
              staff: await getActivityStaff(activity.id)
            }))
          )
        ]);
        setEntryStaff(Array.isArray(eventPeople) ? eventPeople : []);
        setAllActivityStaff(
          activityPeople.flatMap(({ activity, staff }) =>
            (Array.isArray(staff) ? staff : []).map((person) => ({
              ...person,
              staffScope: "ACTIVITY",
              activityName: activity.name,
              activityId: activity.id
            }))
          )
        );
      } else if (volunteerSubTab === "activity" && selectedVolActivityId) {
        const data = await getActivityStaff(selectedVolActivityId);
        setActivityStaff(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load staff:", err);
      setError(err.response?.data?.message || "Could not load volunteers list.");
    } finally {
      setVolLoading(false);
    }
  }, [eventId, activities, volunteerSubTab, selectedVolActivityId, setError]);

  useEffect(() => {
    let active = true;
    if (!initialLoading && activeTab === "volunteers") {
      Promise.resolve().then(() => {
        if (active) loadVolunteerData();
      });
    }
    return () => { active = false; };
  }, [initialLoading, activeTab, volunteerSubTab, selectedVolActivityId, loadVolunteerData]);

  // Load Activity Summaries
  const loadActivitySummaries = useCallback(async () => {
    if (!eventId) return;
    setSummariesLoading(true);
    try {
      const data = await getActivitySummariesByEvent(eventId);
      setActivitySummaries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load activity summaries:", err);
      setError(err.response?.data?.message || "Could not load activity summaries.");
    } finally {
      setSummariesLoading(false);
    }
  }, [eventId, setError]);

  useEffect(() => {
    let active = true;
    if (!initialLoading && activeTab === "activities") {
      Promise.resolve().then(() => {
        if (active) loadActivitySummaries();
      });
    }
    return () => { active = false; };
  }, [initialLoading, activeTab, loadActivitySummaries]);

  // Activity Start/Complete handlers
  const handleStartActivity = async (activityId) => {
    setActioningIds((prev) => new Set(prev).add(activityId));
    try {
      await startActivity(eventId, activityId);
      setSuccess("Activity started successfully!");
      await Promise.all([loadActivitySummaries(), loadInitialData()]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start activity.");
    } finally {
      setActioningIds((prev) => {
        const next = new Set(prev);
        next.delete(activityId);
        return next;
      });
    }
  };

  const handleCompleteActivity = async (activityId) => {
    setActioningIds((prev) => new Set(prev).add(activityId));
    try {
      await completeActivity(eventId, activityId);
      setSuccess("Activity marked as completed!");
      await Promise.all([loadActivitySummaries(), loadInitialData()]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to complete activity.");
    } finally {
      setActioningIds((prev) => {
        const next = new Set(prev);
        next.delete(activityId);
        return next;
      });
    }
  };

  // Refresh current view
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === "activities") {
        await loadActivitySummaries();
      } else if (activeTab === "attendance") {
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

  // Invite volunteers at event-entry scope or the selected activity scope.
  const handleInviteVolunteer = async (e) => {
    e.preventDefault();
    if (!volunteerEmail.trim()) return;
    if (volunteerSubTab === "activity" && !selectedVolActivityId) return;

    setInviting(true);
    try {
      if (volunteerSubTab !== "activity") {
        const newStaff = await inviteEventStaff(eventId, {
          name: volunteerName.trim() || null,
          email: volunteerEmail.trim()
        });
        setEntryStaff((prev) => [newStaff, ...prev]);
        setSuccess(`Invitation generated for ${volunteerEmail}. Share the link below.`);
      } else {
        const newStaff = await inviteActivityStaff(selectedVolActivityId, {
          name: volunteerName.trim() || null,
          email: volunteerEmail.trim()
        });
        setActivityStaff((prev) => [newStaff, ...prev]);
        setAllActivityStaff((prev) => [
          { ...newStaff, staffScope: "ACTIVITY", activityName: selectedVolActivityObj?.name, activityId: selectedVolActivityId },
          ...prev
        ]);
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
      await revokeStaff(staffId);
      const isEventEntryStaff = entryStaff.some((person) => person.id === staffId);
      if (isEventEntryStaff) {
        setEntryStaff((prev) =>
          prev.map((person) => (person.id === staffId ? { ...person, status: "REVOKED" } : person))
        );
      } else {
        setActivityStaff((prev) =>
          prev.map((person) => (person.id === staffId ? { ...person, status: "REVOKED" } : person))
        );
        setAllActivityStaff((prev) =>
          prev.map((person) => (person.id === staffId ? { ...person, status: "REVOKED" } : person))
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

  const selectedActivityObj = activities.find((a) => a.id === selectedActivityId);
  const selectedVolActivityObj = activities.find((a) => a.id === selectedVolActivityId);

  // Filtered Volunteer List
  const currentStaffList = volunteerSubTab === "all"
    ? [
        ...entryStaff.map((person) => ({ ...person, staffScope: "EVENT_ENTRY", scopeLabel: "Event entry" })),
        ...allActivityStaff
      ]
    : activityStaff.map((person) => ({
        ...person,
        staffScope: "ACTIVITY",
        scopeLabel: selectedVolActivityObj?.name || "Activity"
      }));

  const filteredStaff = useMemo(() => {
    if (!volSearch.trim()) return currentStaffList;
    const query = volSearch.toLowerCase();
    return currentStaffList.filter((person) => {
      const name = (person.invitedName || "").toLowerCase();
      const email = (person.email || "").toLowerCase();
      const scope = (person.activityName || person.scopeLabel || "").toLowerCase();
      return name.includes(query) || email.includes(query) || scope.includes(query);
    });
  }, [currentStaffList, volSearch]);

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
    <div className="organizer-workspace organizer-operations-page min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Header / Breadcrumb */}
      <header className="organizer-operations-header bg-white border-b border-slate-200 sticky top-0 z-20">
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
      <main className="organizer-page-main organizer-operations-main max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Event Quick Overview Strip */}
        <div className="organizer-operations-summary bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-slate-900">Event overview</h2>
              <p className="text-xs text-slate-500">
                {activities.length} {activities.length === 1 ? "activity" : "activities"} · Current event schedule and venue
              </p>
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

        {/* Master Navigation Tabs */}
        <div className="organizer-operations-tabs border-b border-slate-200">
          <nav className="flex space-x-6 overflow-x-auto">
            <button
              type="button"
              onClick={() => setTab("activities")}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === "activities"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Activities</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600">
                {activities.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTab("attendance")}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer shrink-0 ${
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
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === "volunteers"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Staff Assignment</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600">
                {entryStaff.length}
              </span>
            </button>

            <button type="button" onClick={() => setTab("certificates")} className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 shrink-0 ${activeTab === "certificates" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}><Trophy className="w-4 h-4" />Certificates</button>

            <button
              type="button"
              onClick={() => setTab("overview")}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer shrink-0 ${
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
            TAB 0: ACTIVITIES DASHBOARD
            ══════════════════════════════════════════════════════════ */}
        {activeTab === "certificates" && <OrganizerCertificates eventId={eventId} activities={activities} />}

        {activeTab === "activities" && (
          <div className="space-y-4">
            {selectedActivityForRegistrations ? (
              <ActivityRegistrationsModal
                isOpen={true}
                activity={selectedActivityForRegistrations}
                isInline={true}
                onRegistrationUpdated={loadActivitySummaries}
                onClose={() => setSelectedActivityForRegistrations(null)}
              />
            ) : summariesLoading ? (
              <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                <p className="text-xs text-slate-500">Loading activity summaries...</p>
              </div>
            ) : activitySummaries.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs py-16 px-4 text-center space-y-3">
                <Activity className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">No Activities Yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  This event doesn't have any activities. Add activities in the Event Editor to see them here.
                </p>
                <Link
                  to={`/organizer/events/${eventId}/edit`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors mt-2"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Open Event Editor
                </Link>
              </div>
            ) : (
              <>
                {/* Activity Summary Stats Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs text-center">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Activities</span>
                    <span className="text-2xl font-extrabold text-slate-800">{activitySummaries.length}</span>
                  </div>
                  <div className="bg-white rounded-xl border border-emerald-200/80 p-4 shadow-xs text-center">
                    <span className="block text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">Total Registrations</span>
                    <span className="text-2xl font-extrabold text-emerald-700">
                      {activitySummaries.reduce((sum, a) => sum + (a.totalRegistrations || 0), 0)}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl border border-amber-200/80 p-4 shadow-xs text-center">
                    <span className="block text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">Pending Approvals</span>
                    <span className="text-2xl font-extrabold text-amber-700">
                      {activitySummaries.reduce((sum, a) => sum + (a.pendingApprovalCount || 0), 0)}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl border border-indigo-200/80 p-4 shadow-xs text-center">
                    <span className="block text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1">Total Attendance</span>
                    <span className="text-2xl font-extrabold text-indigo-700">
                      {activitySummaries.reduce((sum, a) => sum + (a.attendanceCount || 0), 0)}
                    </span>
                  </div>
                </div>

                {/* Activity Cards */}
                <div className="space-y-3">
                  {activitySummaries.map((act) => {
                    const isActioning = actioningIds.has(act.id);
                    const isCompleted = act.status === "COMPLETED" || Boolean(act.actualEndDateTime);
                    const isOngoing = (act.status === "ONGOING" || Boolean(act.actualStartDateTime)) && !isCompleted;
                    const isDraft = act.status === "DRAFT" && !act.actualStartDateTime;
                    const canStart = !isOngoing && !isCompleted && !isEnded(act);

                    const statusStyles = isCompleted
                      ? "bg-slate-100 text-slate-600 border-slate-200"
                      : isOngoing
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse"
                      : isDraft
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-indigo-50 text-indigo-700 border-indigo-200";

                    return (
                      <div
                        key={act.id}
                        className={`bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden transition-all duration-200 hover:shadow-md hover:border-slate-300 ${
                          isActioning ? "opacity-70" : ""
                        }`}
                      >
                        <div className="p-4 sm:p-5">
                          {/* Top Row: Name + Status + Type Badge */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="text-sm font-bold text-slate-900 truncate">{act.name}</h3>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusStyles}`}>
                                  {isCompleted ? "COMPLETED" : isOngoing ? "ONGOING" : act.status || "PUBLISHED"}
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getActivityTypeBadgeStyle(act.type)}`}>
                                  {getActivityTypeLabel(act.type)}
                                </span>
                              </div>
                              {act.description && (
                                <p className="text-xs text-slate-500 line-clamp-1">{act.description}</p>
                              )}
                              <div className="flex items-center gap-4 flex-wrap text-xs text-slate-400 mt-1.5">
                                {act.startDateTime && (
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>Scheduled: {formatDateRange(act.startDateTime, act.endDateTime)}</span>
                                  </span>
                                )}
                                {act.actualStartDateTime && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-[11px]">
                                    <Play className="w-3 h-3 fill-emerald-600" />
                                    <span>Started: {formatDateTime(act.actualStartDateTime)}</span>
                                  </span>
                                )}
                                {act.actualEndDateTime && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[11px]">
                                    <CheckCircle2 className="w-3 h-3 text-slate-500" />
                                    <span>Ended: {formatDateTime(act.actualEndDateTime)}</span>
                                  </span>
                                )}
                                {act.location && (
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {act.location}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 shrink-0">
                              {canStart && (
                                <button
                                  type="button"
                                  onClick={() => handleStartActivity(act.id)}
                                  disabled={isActioning}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                                >
                                  {isActioning ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                  )}
                                  <span>{isActioning ? "Starting…" : "Start Activity"}</span>
                                </button>
                              )}
                              {isOngoing && (
                                <button
                                  type="button"
                                  onClick={() => handleCompleteActivity(act.id)}
                                  disabled={isActioning}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                                >
                                  {isActioning ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  )}
                                  <span>{isActioning ? "Completing…" : "Complete Activity"}</span>
                                </button>
                              )}
                              {isCompleted && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 rounded-lg border border-slate-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                                  Finished
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => setSelectedActivityForRegistrations({ ...act, eventId })}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                                title="Review registrations and approvals"
                              >
                                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Registrations</span>
                              </button>
                            </div>
                          </div>

                          {/* Metrics Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3 pt-3 border-t border-slate-100">
                            <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Registered</span>
                              <span className="text-lg font-extrabold text-slate-800">{act.totalRegistrations || 0}</span>
                            </div>
                            <div className="bg-emerald-50/70 rounded-lg p-2.5 text-center">
                              <span className="block text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Approved</span>
                              <span className="text-lg font-extrabold text-emerald-700">{act.approvedRegistrations || 0}</span>
                            </div>
                            <div className="bg-amber-50/70 rounded-lg p-2.5 text-center">
                              <span className="block text-[9px] font-bold text-amber-500 uppercase tracking-wider">Pending</span>
                              <span className="text-lg font-extrabold text-amber-700">{act.pendingApprovalCount || 0}</span>
                            </div>
                            <div className="bg-indigo-50/70 rounded-lg p-2.5 text-center">
                              <span className="block text-[9px] font-bold text-indigo-500 uppercase tracking-wider">Attendance</span>
                              <span className="text-lg font-extrabold text-indigo-700">{act.attendanceCount || 0}</span>
                            </div>
                            <div className="bg-purple-50/70 rounded-lg p-2.5 text-center">
                              <span className="block text-[9px] font-bold text-purple-500 uppercase tracking-wider">Turnout</span>
                              <span className="text-lg font-extrabold text-purple-700">{act.turnoutRate || 0}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

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

            {/* If Activity Scope is selected: Activity Status & Start/Complete Control Card */}
            {attendanceSubTab === "activity" && selectedActivityObj && (() => {
              const isActCompleted = selectedActivityObj.status === "COMPLETED" || Boolean(selectedActivityObj.actualEndDateTime);
              const isActOngoing = (selectedActivityObj.status === "ONGOING" || Boolean(selectedActivityObj.actualStartDateTime)) && !isActCompleted;
              const canActStart =
                !isActOngoing && !isActCompleted && !isEnded(selectedActivityObj);
              const isActioningThis = actioningIds.has(selectedActivityObj.id);

              return (
                <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isActOngoing
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        : isActCompleted
                        ? "bg-slate-100 text-slate-600 border border-slate-200"
                        : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                    }`}>
                      <Activity className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {selectedActivityObj.name}
                        </h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                          isActCompleted
                            ? "bg-slate-100 text-slate-600 border-slate-200"
                            : isActOngoing
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse"
                            : "bg-indigo-50 text-indigo-700 border-indigo-200"
                        }`}>
                          {isActCompleted ? "COMPLETED" : isActOngoing ? "ONGOING" : selectedActivityObj.status || "PUBLISHED"}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getActivityTypeBadgeStyle(selectedActivityObj.type)}`}>
                          {getActivityTypeLabel(selectedActivityObj.type)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3.5 flex-wrap text-xs text-slate-500">
                        {selectedActivityObj.startDateTime && (
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <Clock className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Scheduled: {formatDateRange(selectedActivityObj.startDateTime, selectedActivityObj.endDateTime)}</span>
                          </span>
                        )}
                        {selectedActivityObj.actualStartDateTime && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-[11px]">
                            <Play className="w-3 h-3 fill-emerald-600" />
                            <span>Started: {formatDateTime(selectedActivityObj.actualStartDateTime)}</span>
                          </span>
                        )}
                        {selectedActivityObj.actualEndDateTime && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3 h-3 text-slate-500" />
                            <span>Ended: {formatDateTime(selectedActivityObj.actualEndDateTime)}</span>
                          </span>
                        )}
                        {selectedActivityObj.location && (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <MapPin className="w-3.5 h-3.5" />
                            {selectedActivityObj.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Button for this activity */}
                  <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                    {canActStart && (
                      <button
                        type="button"
                        onClick={() => handleStartActivity(selectedActivityObj.id)}
                        disabled={isActioningThis}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                      >
                        {isActioningThis ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current" />
                        )}
                        <span>{isActioningThis ? "Starting…" : "Start Activity"}</span>
                      </button>
                    )}

                    {isActOngoing && (
                      <button
                        type="button"
                        onClick={() => handleCompleteActivity(selectedActivityObj.id)}
                        disabled={isActioningThis}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                      >
                        {isActioningThis ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>{isActioningThis ? "Completing…" : "Complete Activity"}</span>
                      </button>
                    )}

                    {isActCompleted && (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-500 bg-slate-100 rounded-lg border border-slate-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                        Finished
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

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

        {/* TAB 2: STAFF & EVALUATION TEAM */}
        {activeTab === "volunteers" && (
          <section className="organizer-staff-workspace space-y-5">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-700">
                  Operational roster
                </p>
                <h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                  Event Staff &amp; Evaluation Team
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
                  Manage event-entry volunteers, activity volunteers and competition judges from one workspace.
                </p>
              </div>
              {volunteerSubTab !== "judges" && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Active
                    <strong className="font-semibold text-slate-900">
                      {currentStaffList.filter((person) => person.status === "ACTIVE").length}
                    </strong>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Pending
                    <strong className="font-semibold text-slate-900">
                      {currentStaffList.filter((person) => person.status === "INVITED").length}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
                {[
                  ["all", "All Team", entryStaff.length + allActivityStaff.length, Users],
                  ["judges", "Competition Judges", null, Trophy],
                  ["activity", "Activity Volunteers", allActivityStaff.length, UserCheck]
                ].map(([scope, label, count, Icon]) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => setVolunteerScope(scope)}
                    aria-pressed={volunteerSubTab === scope}
                    className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md px-3 text-xs font-semibold transition-colors ${
                      volunteerSubTab === scope
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                    {count !== null && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                        volunteerSubTab === scope ? "bg-indigo-50 text-indigo-700" : "bg-slate-200 text-slate-600"
                      }`}>{count}</span>
                    )}
                  </button>
                ))}
              </div>

              {volunteerSubTab !== "judges" && (
                <label className="relative block w-full sm:max-w-xs">
                  <span className="sr-only">Search staff by name, email or assignment</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={volSearch}
                    onChange={(event) => setVolSearch(event.target.value)}
                    placeholder="Search name or email..."
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
              )}
            </div>

            {volunteerSubTab === "judges" ? (
              <JudgeAssignmentManager activities={activities} eventId={eventId} />
            ) : (
              <>
                {volunteerSubTab === "activity" && activities.length > 0 && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                      Activity
                      <select
                        value={selectedVolActivityId}
                        onChange={(event) => setSelectedVolActivityId(event.target.value)}
                        className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:w-72 sm:flex-none"
                      >
                        {activities.map((activity) => (
                          <option key={activity.id} value={activity.id}>{activity.name}</option>
                        ))}
                      </select>
                    </label>
                    <p className="text-xs text-slate-500">
                      Volunteers assigned to this activity can scan its participant tickets.
                    </p>
                  </div>
                )}

                {volunteerSubTab === "activity" && activities.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
                    <Users className="mx-auto h-8 w-8 text-slate-300" />
                    <h3 className="mt-3 text-sm font-semibold text-slate-800">No activities available</h3>
                    <p className="mt-1 text-xs text-slate-500">Create an activity before assigning activity volunteers.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(260px,0.85fr)_minmax(0,1.65fr)]">
                    <form
                      onSubmit={handleInviteVolunteer}
                      className="rounded-xl border border-slate-200 bg-white p-5"
                    >
                      <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-700">
                          <UserPlus className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-slate-900">
                            {volunteerSubTab === "activity" ? "Assign activity volunteer" : "Assign event volunteer"}
                          </h3>
                          <p className="mt-1 text-xs leading-relaxed text-slate-500">
                            {volunteerSubTab === "activity"
                              ? `Access is limited to ${selectedVolActivityObj?.name || "the selected activity"}.`
                              : "Event-entry volunteers can scan tickets at the event gate."}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        <label className="block space-y-1.5">
                          <span className="text-xs font-semibold text-slate-700">
                            Full name <span className="font-normal text-slate-400">(optional)</span>
                          </span>
                          <input
                            type="text"
                            value={volunteerName}
                            onChange={(event) => setVolunteerName(event.target.value)}
                            placeholder="Enter staff member name"
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                          />
                        </label>

                        <label className="block space-y-1.5">
                          <span className="text-xs font-semibold text-slate-700">
                            Email address <span className="text-rose-500">*</span>
                          </span>
                          <input
                            required
                            type="email"
                            value={volunteerEmail}
                            onChange={(event) => setVolunteerEmail(event.target.value)}
                            placeholder="name@college.edu"
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                          />
                        </label>

                        <button
                          type="submit"
                          disabled={inviting || (volunteerSubTab === "activity" && !selectedVolActivityId)}
                          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                          {inviting ? "Generating invitation..." : "Generate invite"}
                        </button>
                        <p className="text-[11px] leading-relaxed text-slate-400">
                          The invitation link is generated after the request succeeds. Copy and share it with the invited person.
                        </p>
                      </div>
                    </form>

                    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            {volunteerSubTab === "activity"
                              ? `Activity volunteers · ${selectedVolActivityObj?.name || "Activity"}`
                              : "All event and activity volunteers"}
                          </h3>
                          <p className="mt-1 text-xs text-slate-500">
                            {currentStaffList.filter((person) => person.status === "ACTIVE").length} active
                            {" · "}
                            {currentStaffList.filter((person) => person.status === "INVITED").length} pending invitations
                          </p>
                        </div>
                        <span className="text-xs font-medium text-slate-500">
                          {filteredStaff.length} {filteredStaff.length === 1 ? "person" : "people"}
                        </span>
                      </div>

                      {volLoading ? (
                        <div className="flex min-h-48 flex-col items-center justify-center gap-2 px-4 py-10">
                          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                          <p className="text-xs text-slate-500">Loading staff assignments...</p>
                        </div>
                      ) : filteredStaff.length === 0 ? (
                        <div className="flex min-h-48 flex-col items-center justify-center px-5 py-10 text-center">
                          <Users className="h-8 w-8 text-slate-300" />
                          <h4 className="mt-3 text-sm font-semibold text-slate-800">
                            {volSearch ? "No matching staff" : "No staff assigned yet"}
                          </h4>
                          <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                            {volSearch
                              ? "Try a different name, email or assignment."
                              : "Use the form to generate an invitation for your first staff member."}
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {filteredStaff.map((staff) => {
                            const isRevoked = staff.status === "REVOKED";
                            const isInvited = staff.status === "INVITED";
                            const inviteLink = staff.invitationLink;
                            const scopeLabel = volunteerSubTab === "all"
                              ? (staff.staffScope === "ACTIVITY" ? staff.activityName || "Activity volunteer" : "Event entry")
                              : selectedVolActivityObj?.name || "Activity volunteer";

                            return (
                              <article key={`${staff.staffScope || volunteerSubTab}-${staff.id}`} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="break-all text-xs font-semibold text-slate-900">
                                      {staff.invitedName || staff.email}
                                    </h4>
                                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                      staff.status === "ACTIVE"
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                        : isRevoked
                                          ? "border-rose-200 bg-rose-50 text-rose-700"
                                          : "border-amber-200 bg-amber-50 text-amber-700"
                                    }`}>
                                      {staff.status}
                                    </span>
                                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                      {scopeLabel}
                                    </span>
                                  </div>
                                  <p className="mt-1 break-all text-xs text-slate-500">{staff.email}</p>
                                  {isInvited && inviteLink && (
                                    <div className="mt-2 flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 p-2">
                                      <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-slate-500">{inviteLink}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopy(inviteLink)}
                                        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-50"
                                      >
                                        {copiedLink === inviteLink
                                          ? <><Check className="h-3 w-3" /> Copied</>
                                          : <><Copy className="h-3 w-3" /> Copy link</>}
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {!isRevoked && (
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeStaff(staff.id)}
                                    className="inline-flex min-h-8 shrink-0 items-center justify-center gap-1.5 self-start rounded-lg px-2.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-800 sm:self-center"
                                    title="Revoke staff access"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Revoke
                                  </button>
                                )}
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  </div>
                )}
              </>
            )}
          </section>
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

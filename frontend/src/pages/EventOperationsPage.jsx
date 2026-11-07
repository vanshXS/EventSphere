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
  Loader2,
  Play,
  CheckCircle,
  Activity,
  TrendingUp,
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
import { useToast } from "../components/common/ToastContext";

export default function EventOperationsPage() {
  const addToast = useToast();
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Main Tab: 'activities' | 'attendance' | 'volunteers' | 'overview'
  const activeTab = searchParams.get("tab") || "activities";
  // Active Sub Tab for Attendance: 'entry' | 'activity'
  const attendanceSubTab = searchParams.get("sub") === "activity" ? "activity" : "entry";
  // Active Sub Tab for Volunteers: 'entry' | 'activity' | 'judges'
  const volunteerSubTab =
    searchParams.get("vsub") === "judges"
      ? "judges"
      : searchParams.get("vsub") === "activity"
      ? "activity"
      : "entry";

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
  }, [eventId, attendanceSubTab, selectedActivityId, setError]);

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
  }, [eventId, volunteerSubTab, selectedVolActivityId, setError]);

  useEffect(() => {
    if (!initialLoading && activeTab === "volunteers") {
      loadVolunteerData();
    }
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
    if (!initialLoading && activeTab === "activities") {
      loadActivitySummaries();
    }
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

  // Invite Volunteer Handler
  const handleInviteVolunteer = async (e) => {
    e.preventDefault();
    if (!volunteerEmail.trim()) return;

    setInviting(true);

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

      {/* Breadcrumb Trail */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-1.5 text-xs text-slate-400 overflow-x-auto">
          <Link to="/organizer" className="hover:text-slate-700 transition-colors shrink-0 font-medium">
            Organizer Dashboard
          </Link>
          <ChevronRight className="w-3 h-3 shrink-0" />
          <span className="text-slate-600 font-semibold truncate max-w-[200px]" title={event.title}>
            {event.title}
          </span>
          <ChevronRight className="w-3 h-3 shrink-0" />
          <span className="text-indigo-600 font-semibold shrink-0">Operations</span>
        </div>
      </div>

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

        {/* Master Navigation Tabs */}
        <div className="border-b border-slate-200">
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
                          <div className="border-t border-slate-100 px-4 pb-4 pt-3 sm:px-5">
                            <Link
                              to={`/organizer/activities/${act.id}/judging?eventId=${eventId}`}
                              className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                              <ClipboardCheck className="h-4 w-4" />
                              Configure judging
                            </Link>
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

        {/* ══════════════════════════════════════════════════════════
            TAB 2: VOLUNTEERS & STAFF (Unified Management)
            ══════════════════════════════════════════════════════════ */}
        {activeTab === "volunteers" && (
          <div className="space-y-4">
            {/* Sub-Tabs / Scope Bar */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
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
                  <span>Event Entry Volunteers</span>
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
                    <span>Activity Volunteers</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      volunteerSubTab === "activity" ? "bg-indigo-700 text-white" : "bg-white text-slate-700"
                    }`}>
                      {activities.length}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setVolunteerScope("judges")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    volunteerSubTab === "judges"
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Competition Judges</span>
                </button>
              </div>

              {volunteerSubTab !== "judges" && (
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
              )}
            </div>

            {volunteerSubTab === "judges" ? (
              <div className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                <p className="text-sm text-slate-700">
                  Configure judging rounds, rubrics, and judge assignments separately for each activity.
                </p>
                {activities.length ? (
                  <div className="flex flex-wrap gap-2">
                    {activities.map((activity) => (
                      <Link
                        key={activity.id}
                        to={`/organizer/activities/${activity.id}/judging?eventId=${eventId}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                        Configure {activity.name}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Add an activity before configuring judging.</p>
                )}
              </div>
            ) : (
              <>
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
              </>
            )}
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

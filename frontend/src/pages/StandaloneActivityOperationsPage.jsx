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
  AlertCircle,
  CheckCircle2,
  Play,
  Trophy,
  Loader2,
  Info,
  QrCode,
  ChevronRight
} from "lucide-react";
import {
  getStandaloneActivity,
  startStandaloneActivity,
  completeStandaloneActivity
} from "../features/activities/activityApi";
import {
  getActivityStaff,
  inviteActivityStaff,
  revokeStaff,
  getActivityAttendance
} from "../features/attendance/attendanceApi";
import { formatDateRange } from "../features/events/utils/eventHelpers";
import {
  getActivityTypeLabel,
  getActivityTypeBadgeStyle
} from "../features/activities/utils/activityHelpers";
import ActivityRegistrationsModal from "../features/registration/components/ActivityRegistrationsModal";
import OrganizerCertificates from "../features/certificates/OrganizerCertificates";
import { useToast } from "../components/common/ToastContext";

export default function StandaloneActivityOperationsPage() {
  const addToast = useToast();
  const { activityId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab: 'attendance' | 'registrations' | 'volunteers' | 'details'
  const activeTab = searchParams.get("tab") || "attendance";
  // Active Sub Tab for Staff: 'volunteers' | 'judges'
  const staffSubTab = searchParams.get("vsub") === "judges" ? "judges" : "volunteers";

  // Data States
  const [activity, setActivity] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [staff, setStaff] = useState([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");

  // Invite volunteer form state
  const [volunteerName, setVolunteerName] = useState("");
  const [volunteerEmail, setVolunteerEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [copiedLink, setCopiedLink] = useState("");

  // Lifecycle operation state
  const [lifecycleLoading, setLifecycleLoading] = useState(false);

  // General UI state
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const setError = useCallback((message) => {
    if (message) addToast(message, "error");
  }, [addToast]);
  const setSuccess = useCallback((message) => {
    if (message) addToast(message, "success");
  }, [addToast]);

  const setTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next);
  };

  const setStaffScope = (vsub) => {
    const next = new URLSearchParams(searchParams);
    next.set("vsub", vsub);
    setSearchParams(next);
  };

  const loadData = useCallback(async () => {
    try {
      const [actData, staffData, attendanceData] = await Promise.all([
        getStandaloneActivity(activityId),
        getActivityStaff(activityId),
        getActivityAttendance(activityId)
      ]);
      setActivity(actData);
      setStaff(Array.isArray(staffData) ? staffData : []);
      setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
    } catch (err) {
      console.error("Failed to load activity operations data:", err);
      setError(err.response?.data?.message || "Failed to load competition operations.");
    } finally {
      setInitialLoading(false);
    }
  }, [activityId, setError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  // Lifecycle Handlers
  const handleStartActivity = async () => {
    try {
      setLifecycleLoading(true);
      const updated = await startStandaloneActivity(activityId);
      setActivity(updated);
      setSuccess("Activity started successfully! Live check-in scanner is now unlocked.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not start activity.");
    } finally {
      setLifecycleLoading(false);
    }
  };

  const handleCompleteActivity = async () => {
    try {
      setLifecycleLoading(true);
      const updated = await completeStandaloneActivity(activityId);
      setActivity(updated);
      setSuccess("Activity marked as completed.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not complete activity.");
    } finally {
      setLifecycleLoading(false);
    }
  };

  // Invite Volunteer
  const handleInviteVolunteer = async (e) => {
    e.preventDefault();
    if (!volunteerEmail.trim()) return;

    setInviting(true);

    try {
      const newStaff = await inviteActivityStaff(activityId, {
        name: volunteerName.trim() || null,
        email: volunteerEmail.trim()
      });
      setStaff((prev) => [newStaff, ...prev]);
      setSuccess(`Invitation created for ${volunteerEmail}. Share the link below.`);
      setVolunteerName("");
      setVolunteerEmail("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create volunteer invitation.");
    } finally {
      setInviting(false);
    }
  };

  // Revoke Volunteer
  const handleRevoke = async (staffId) => {
    if (!window.confirm("Are you sure you want to revoke this volunteer's check-in access?")) {
      return;
    }
    try {
      await revokeStaff(staffId);
      setStaff((prev) =>
        prev.map((s) => (s.id === staffId ? { ...s, status: "REVOKED" } : s))
      );
      setSuccess("Volunteer access revoked.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not revoke volunteer access.");
    }
  };

  // Copy Link
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
  const filteredAttendance = useMemo(() => {
    if (!searchQuery.trim()) return attendance;
    const q = searchQuery.toLowerCase();
    return attendance.filter((rec) => {
      const name = (rec.participantName || rec.participantId || "").toLowerCase();
      const by = (rec.checkedInBy || "").toLowerCase();
      const type = (rec.checkInType || "").toLowerCase();
      return name.includes(q) || by.includes(q) || type.includes(q);
    });
  }, [attendance, searchQuery]);

  // Filtered Staff
  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return staff;
    const q = searchQuery.toLowerCase();
    return staff.filter((s) => {
      const name = (s.invitedName || "").toLowerCase();
      const email = (s.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [staff, searchQuery]);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-500">Loading competition console...</p>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Competition Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            The competition or activity could not be found or you don't have access.
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

  const isPastEnd =
    Boolean(activity.endDateTime) &&
    new Date(activity.endDateTime).getTime() <= Date.now();
  const isNotStarted = activity.status === "PUBLISHED" && isPastEnd;
  const canStart = activity.status === "PUBLISHED" && !isPastEnd;
  const isOngoing = activity.status === "ONGOING";
  const typeBadgeStyle = getActivityTypeBadgeStyle(activity.type);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Header */}
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
                  Competition Hub
                </span>
                <span className="text-slate-300">/</span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border uppercase tracking-wider ${typeBadgeStyle}`}>
                  {getActivityTypeLabel(activity.type)}
                </span>
              </div>
              <h1 className="text-base font-bold text-slate-900 truncate" title={activity.name}>
                {activity.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canStart && (
              <button
                type="button"
                onClick={handleStartActivity}
                disabled={lifecycleLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
              >
                {lifecycleLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>Start Competition</span>
              </button>
            )}

            {isOngoing && (
              <button
                type="button"
                onClick={handleCompleteActivity}
                disabled={lifecycleLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
              >
                {lifecycleLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Complete Competition</span>
              </button>
            )}

            <Link
              to={`/organizer/activities/${activityId}/judging`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Configure judging</span>
            </Link>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-60"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
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
          <span className="text-slate-600 font-semibold truncate max-w-[200px]" title={activity?.name}>
            {activity?.name || "Activity"}
          </span>
          <ChevronRight className="w-3 h-3 shrink-0" />
          <span className="text-indigo-600 font-semibold shrink-0">Operations</span>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Activity Quick Info Bar */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900">{activity.name}</h2>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${isNotStarted
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : activity.status === "ONGOING"
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : activity.status === "COMPLETED"
                        ? "bg-slate-100 text-slate-700 border-slate-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
              >
                {isNotStarted ? "Not started" : activity.status || "DRAFT"}
              </span>
            </div>

            <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                {formatDateRange(activity.startDateTime, activity.endDateTime)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {activity.location || "No venue set"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-5 shrink-0">
            <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 text-center min-w-[90px]">
              <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Checked In
              </span>
              <span className="text-base font-bold text-slate-800">{attendance.length}</span>
            </div>
            <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 text-center min-w-[90px]">
              <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Staff
              </span>
              <span className="text-base font-bold text-slate-800">
                {staff.filter((s) => s.status === "ACTIVE").length}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <nav className="flex space-x-6 overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setTab("attendance");
                setSearchQuery("");
              }}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${activeTab === "attendance"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Live Attendance</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600">
                {attendance.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab("registrations");
                setSearchQuery("");
              }}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${activeTab === "registrations"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Registrations & Approvals</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab("volunteers");
                setSearchQuery("");
              }}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${activeTab === "volunteers"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
            >
              <Users className="w-4 h-4" />
              <span>Staff Assignment</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600">
                {staff.length}
              </span>
            </button>

            <button type="button" onClick={() => setTab("certificates")} className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 shrink-0 ${activeTab === "certificates" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}><Trophy className="h-4 w-4" />Certificates</button>

            <button
              type="button"
              onClick={() => setTab("details")}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${activeTab === "details"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
            >
              <Info className="w-4 h-4" />
              <span>Competition Details</span>
            </button>
          </nav>
        </div>

        {/* ══════════════════════════════════════════════════════════
            TAB: REGISTRATIONS & APPROVALS
            ══════════════════════════════════════════════════════════ */}
        {activeTab === "certificates" && <OrganizerCertificates activityId={activityId} />}

        {activeTab === "registrations" && activity && (
          <ActivityRegistrationsModal
            isOpen={true}
            activity={activity}
            isInline={true}
          />
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 1: LIVE ATTENDANCE
            ══════════════════════════════════════════════════════════ */}
        {activeTab === "attendance" && (
          <div className="space-y-4">
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Check-in Log
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                  {filteredAttendance.length} attendee{filteredAttendance.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter attendees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 hover:bg-white focus:bg-white rounded-lg border border-slate-200 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              {filteredAttendance.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-2">
                  <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-semibold text-slate-700">No Check-ins Yet</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    When assigned volunteers scan participant QR codes for this competition, attendee records will appear here live.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3">Participant Name</th>
                        <th className="px-5 py-3">Check-in Time</th>
                        <th className="px-5 py-3">Volunteer</th>
                        <th className="px-5 py-3">Check-in Type</th>
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
            TAB 2: STAFF ASSIGNMENT (Volunteers & Competition Judges)
            ══════════════════════════════════════════════════════════ */}
        {activeTab === "volunteers" && (
          <div className="space-y-4">
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setStaffScope("volunteers")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${staffSubTab === "volunteers"
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Activity Volunteers</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${staffSubTab === "volunteers" ? "bg-indigo-700 text-white" : "bg-white text-slate-700"
                    }`}>
                    {staff.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStaffScope("judges")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${staffSubTab === "judges"
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Competition Judges</span>
                </button>
              </div>

              {staffSubTab === "volunteers" && (
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search volunteers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 hover:bg-white focus:bg-white rounded-lg border border-slate-200 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                  />
                </div>
              )}
            </div>

            {staffSubTab === "judges" ? (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-5">
                <h3 className="text-sm font-bold text-slate-900">Configure competition judging</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Set up rounds and scoring criteria, manage judge assignments, and publish results.
                </p>
                <Link
                  to={`/organizer/activities/${activityId}/judging`}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Open judging setup
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Left: Invite Form */}
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
                        <h3 className="text-sm font-bold text-slate-900">Invite Volunteer</h3>
                        <p className="text-[11px] text-slate-500">
                          Grant check-in scanning privileges
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
                          placeholder="e.g. Sarah Smith"
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

                {/* Right: Volunteer Roster */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Assigned Volunteers
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {staff.filter((s) => s.status === "ACTIVE").length} active ·{" "}
                          {staff.filter((s) => s.status === "INVITED").length} pending invite
                        </p>
                      </div>
                    </div>

                    {filteredStaff.length === 0 ? (
                      <div className="py-12 px-4 text-center space-y-2">
                        <Users className="w-8 h-8 text-slate-300 mx-auto" />
                        <h4 className="text-sm font-semibold text-slate-700">No Volunteers Yet</h4>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          Use the form on the left to invite volunteers who can scan tickets for this competition.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {filteredStaff.map((s) => {
                          const isRevoked = s.status === "REVOKED";
                          const isInvited = s.status === "INVITED";
                          const inviteLink = s.invitationLink;

                          return (
                            <div key={s.id} className="p-4 sm:p-5 flex flex-col gap-3 hover:bg-slate-50/50 transition-colors">
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-slate-900">
                                      {s.invitedName || s.email}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${s.status === "ACTIVE"
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                          : isRevoked
                                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                                            : "bg-amber-50 text-amber-700 border border-amber-200"
                                        }`}
                                    >
                                      {s.status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500">{s.email}</p>
                                </div>

                                {!isRevoked && (
                                  <button
                                    type="button"
                                    onClick={() => handleRevoke(s.id)}
                                    className="text-xs text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer flex items-center gap-1 font-medium"
                                    title="Revoke volunteer access"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Revoke</span>
                                  </button>
                                )}
                              </div>

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
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 3: DETAILS
            ══════════════════════════════════════════════════════════ */}
        {activeTab === "details" && (
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Competition Details</h3>
              <p className="text-xs text-slate-500 mt-0.5">Rules, timings, and configuration.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <span className="font-semibold text-slate-500 block uppercase tracking-wider text-[10px]">
                  Schedule
                </span>
                <p className="text-slate-800 font-medium">
                  {formatDateRange(activity.startDateTime, activity.endDateTime)}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <span className="font-semibold text-slate-500 block uppercase tracking-wider text-[10px]">
                  Venue / Location
                </span>
                <p className="text-slate-800 font-medium">{activity.location || "Not specified"}</p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <span className="font-semibold text-slate-500 block uppercase tracking-wider text-[10px]">
                  Registration Type
                </span>
                <p className="text-slate-800 font-medium">
                  {activity.registrationType || "Individual"}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <span className="font-semibold text-slate-500 block uppercase tracking-wider text-[10px]">
                  Status
                </span>
                <p className="text-slate-800 font-medium">{activity.status || "DRAFT"}</p>
              </div>
            </div>

            {activity.rules && (
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-slate-700">Rules & Regulations</h4>
                <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-100 whitespace-pre-wrap">
                  {activity.rules}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

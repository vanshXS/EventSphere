import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  Building2,
  Globe,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  UserCheck,
  FileText,
  KeyRound,
  ExternalLink,
  ChevronRight,
  Filter
} from "lucide-react";
import { useAuth } from "../features/auth/AuthContext";
import AppHeader from "../components/common/AppHeader";
import {
  getPendingCollegeApplications,
  getCollegeApplicationDetails,
  approveCollegeApplication,
  rejectCollegeApplication,
  assignCollegeAdmin
} from "../features/auth/authApi";
import { useToast } from "../components/common/ToastContext";

export default function SuperAdminCollegesPage() {
  const { user, logoutUser } = useAuth();
  const addToast = useToast();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & action states
  const [selectedApp, setSelectedApp] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Reject dialog state
  const [rejectingApp, setRejectingApp] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Assign Admin modal state
  const [assigningApp, setAssigningApp] = useState(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");

  const fetchApplications = useCallback(async (pageIndex = 0) => {
    try {
      setLoading(true);
      const data = await getPendingCollegeApplications(pageIndex, 20);
      if (data && data.content) {
        setApplications(data.content);
        setTotalPages(data.totalPages || 1);
      } else if (Array.isArray(data)) {
        setApplications(data);
        setTotalPages(1);
      } else {
        setApplications([]);
      }
    } catch (err) {
      console.error("Failed to fetch applications:", err);
      addToast(err.response?.data?.message || "Failed to load pending applications.", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchApplications(page);
  }, [page, fetchApplications]);

  const handleViewDetails = async (app) => {
    setSelectedApp(app);
    try {
      setLoadingDetails(true);
      const details = await getCollegeApplicationDetails(app.id);
      setSelectedApp(details);
    } catch (err) {
      console.error("Failed to load details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleApprove = async (appId) => {
    try {
      setActionLoading(true);
      await approveCollegeApplication(appId);
      addToast("College application successfully approved!", "success");
      setSelectedApp(null);
      fetchApplications(page);
    } catch (err) {
      console.error("Approve error:", err);
      addToast(err.response?.data?.message || "Failed to approve application.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      addToast("Rejection reason is required.", "error");
      return;
    }

    try {
      setActionLoading(true);
      await rejectCollegeApplication(rejectingApp.id, rejectionReason.trim());
      addToast("College application rejected.", "info");
      setRejectingApp(null);
      setRejectionReason("");
      setSelectedApp(null);
      fetchApplications(page);
    } catch (err) {
      console.error("Reject error:", err);
      addToast(err.response?.data?.message || "Failed to reject application.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignAdmin = async (e) => {
    e.preventDefault();
    if (!adminEmail.trim()) {
      addToast("Admin email is required.", "error");
      return;
    }

    try {
      setActionLoading(true);
      await assignCollegeAdmin(assigningApp.collegeId || assigningApp.id, {
        email: adminEmail.trim(),
        name: adminName.trim() || undefined,
        permissions: ["REVIEW_STUDENT_AFFILIATION", "MANAGE_COLLEGE_EVENTS"]
      });
      addToast(`College Admin successfully assigned to ${adminEmail}`, "success");
      setAssigningApp(null);
      setAdminEmail("");
      setAdminName("");
      fetchApplications(page);
    } catch (err) {
      console.error("Assign admin error:", err);
      addToast(err.response?.data?.message || "Failed to assign college admin.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredApps = applications.filter((app) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      app.name?.toLowerCase().includes(q) ||
      app.code?.toLowerCase().includes(q) ||
      app.proposedDomain?.toLowerCase().includes(q) ||
      app.domainContactEmail?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans">
      <AppHeader
        user={user}
        onLogout={logoutUser}
        roleBadge={{ label: "Super Admin", color: "indigo" }}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Title & Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-indigo-600" />
              <span>Institutional Verification Hub</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Review institutional applications, verify domain ownership, and authorize College Administrators.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchApplications(page)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by college name, code, domain, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
            />
          </div>

          <div className="text-xs font-medium text-slate-500 flex items-center gap-2">
            <span>Pending Applications:</span>
            <span className="font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
              {filteredApps.length}
            </span>
          </div>
        </div>

        {/* Applications List */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
            <p className="text-xs font-medium">Loading pending college applications...</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">All Caught Up!</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are currently no college applications awaiting Super Admin verification.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredApps.map((app) => {
              const isDomainMode = app.verificationMode === "OFFICIAL_DOMAIN";
              const isDomainVerified = Boolean(app.domainOwnershipVerifiedAt);

              return (
                <div
                  key={app.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col overflow-hidden"
                >
                  <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/50">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate" title={app.name}>
                          {app.name}
                        </h3>
                        <span className="font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                          {app.code}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
                        isDomainMode
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {isDomainMode ? "Domain OTP" : "Manual Docs"}
                    </span>
                  </div>

                  <div className="p-4 flex-1 space-y-2.5 text-xs text-slate-600">
                    {app.officialWebsite && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <a
                          href={app.officialWebsite.startsWith("http") ? app.officialWebsite : `https://${app.officialWebsite}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline truncate"
                        >
                          {app.officialWebsite}
                        </a>
                      </div>
                    )}

                    {isDomainMode && (
                      <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Claimed Domain:</span>
                          <span className="font-mono font-semibold text-slate-800">{app.proposedDomain}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Ownership OTP:</span>
                          <span
                            className={`inline-flex items-center gap-1 font-bold ${
                              isDomainVerified ? "text-emerald-600" : "text-amber-600"
                            }`}
                          >
                            {isDomainVerified ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                Verified
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" />
                                Pending OTP
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-1 text-[11px] text-slate-400 border-t border-slate-100">
                      <span>Submitted:</span>
                      <span>
                        {app.submittedAt
                          ? new Date(app.submittedAt).toLocaleDateString()
                          : "Recently"}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleViewDetails(app)}
                      className="text-xs font-semibold text-slate-700 hover:text-indigo-600 px-2.5 py-1.5 rounded-md hover:bg-white border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                    >
                      Inspect Details
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingApp(app);
                          setRejectionReason("");
                        }}
                        className="text-xs font-semibold text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-md border border-rose-200 transition-colors cursor-pointer"
                      >
                        Reject
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApprove(app.id)}
                        disabled={isDomainMode && !isDomainVerified}
                        title={
                          isDomainMode && !isDomainVerified
                            ? "Domain OTP challenge has not been verified yet"
                            : "Approve Institution"
                        }
                        className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-md transition-colors cursor-pointer shadow-2xs"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center items-center gap-2 text-xs">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              Previous
            </button>
            <span className="text-slate-500">
              Page {page + 1} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              Next
            </button>
          </div>
        )}
      </main>

      {/* Application Details Modal */}
      {selectedApp && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
          onClick={() => setSelectedApp(null)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-left flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedApp.name}</h3>
                  <span className="font-mono text-xs font-semibold text-slate-500">
                    Code: {selectedApp.code}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {loadingDetails ? (
                <div className="py-8 text-center text-slate-500 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                  <p>Loading application details...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Verification Mode</span>
                      <span className="font-bold text-slate-800">{selectedApp.verificationMode}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Current Status</span>
                      <span className="font-bold text-amber-600">{selectedApp.verificationStatus}</span>
                    </div>
                    {selectedApp.proposedDomain && (
                      <div>
                        <span className="text-slate-400 block mb-0.5">Proposed Domain</span>
                        <span className="font-mono font-bold text-indigo-700">{selectedApp.proposedDomain}</span>
                      </div>
                    )}
                    {selectedApp.domainContactEmail && (
                      <div>
                        <span className="text-slate-400 block mb-0.5">Domain Contact Email</span>
                        <span className="font-mono font-medium text-slate-800">{selectedApp.domainContactEmail}</span>
                      </div>
                    )}
                  </div>

                  {selectedApp.verificationMode === "OFFICIAL_DOMAIN" && (
                    <div className="p-3.5 rounded-xl border flex items-center justify-between gap-3 bg-white">
                      <div className="flex items-center gap-2.5">
                        <KeyRound className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="font-bold text-slate-800">Domain Ownership Challenge</p>
                          <p className="text-[11px] text-slate-500">
                            {selectedApp.domainOwnershipVerifiedAt
                              ? `Verified via OTP on ${new Date(selectedApp.domainOwnershipVerifiedAt).toLocaleString()}`
                              : "Domain OTP has not been verified yet by applicant"}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`font-bold px-2.5 py-1 rounded-full text-[10px] ${
                          selectedApp.domainOwnershipVerifiedAt
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {selectedApp.domainOwnershipVerifiedAt ? "CHALLENGE PASSED" : "PENDING OTP"}
                      </span>
                    </div>
                  )}

                  {selectedApp.initialAdminEmail && (
                    <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-indigo-900 font-semibold block">Proposed Initial Admin</span>
                        <span className="font-mono text-indigo-700">{selectedApp.initialAdminEmail}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAssigningApp(selectedApp);
                          setAdminEmail(selectedApp.initialAdminEmail);
                          setAdminName("");
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-2xs"
                      >
                        Assign as Admin
                      </button>
                    </div>
                  )}

                  {selectedApp.address && (
                    <div>
                      <span className="text-slate-400 block mb-0.5 font-medium">Campus Address</span>
                      <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {selectedApp.address}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectingApp(selectedApp);
                  setRejectionReason("");
                }}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer"
              >
                Reject Institution
              </button>

              <button
                type="button"
                onClick={() => handleApprove(selectedApp.id)}
                disabled={
                  actionLoading ||
                  (selectedApp.verificationMode === "OFFICIAL_DOMAIN" && !selectedApp.domainOwnershipVerifiedAt)
                }
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Approve Institution</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingApp && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
          onClick={() => setRejectingApp(null)}
        >
          <form
            onSubmit={handleReject}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 bg-rose-50/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Reject Institution</h3>
                <p className="text-xs text-slate-500">{rejectingApp.name}</p>
              </div>
            </div>

            <div className="p-6 space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Mandatory Rejection Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Specify reason for institutional rejection (e.g. invalid official domain, unverified documentation)..."
                className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900"
              />
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingApp(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading || !rejectionReason.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Assign Admin Modal */}
      {assigningApp && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
          onClick={() => setAssigningApp(null)}
        >
          <form
            onSubmit={handleAssignAdmin}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 bg-indigo-50/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Authorize College Admin</h3>
                <p className="text-xs text-slate-500">{assigningApp.name}</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Administrator Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@college.ac.in"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Administrator Name (Optional)
                </label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Dr. John Doe"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">Granted Permissions:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                  <li>Review & approve student affiliations</li>
                  <li>Manage campus-exclusive events and visibility</li>
                </ul>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssigningApp(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading || !adminEmail.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? "Authorizing..." : "Authorize Admin"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}


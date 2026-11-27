import React, { useState, useEffect, useCallback } from "react";
import OrganizerAffiliationReview from "../features/auth/components/OrganizerAffiliationReview";
import {
  ShieldCheck,
  UserCheck,
  UserX,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  FileText,
  GraduationCap,
  Building2,
  Eye,
  Download
} from "lucide-react";
import { useAuth } from "../features/auth/AuthContext";
import AppHeader from "../components/common/AppHeader";
import {
  getAffiliationRequests,
  approveAffiliationRequest,
  rejectAffiliationRequest,
  downloadAffiliationDocument
} from "../features/auth/authApi";
import { useToast } from "../components/common/ToastContext";

const STATUS_CONFIG = {
  PENDING: { label: "Pending Review", color: "amber", icon: Clock },
  APPROVED: { label: "Approved", color: "emerald", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", color: "rose", icon: XCircle }
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const Icon = cfg.icon;
  const colorMap = {
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200"
  };
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${colorMap[cfg.color] || colorMap.amber}`}
    >
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

export default function CollegeAdminAffiliationsPage() {
  const { user, logoutUser } = useAuth();
  const addToast = useToast();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("PENDING");
  const [searchQuery, setSearchQuery] = useState("");

  // Action states
  const [actionLoading, setActionLoading] = useState(null); // stores request ID being actioned

  // Reject dialog
  const [rejectingReq, setRejectingReq] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Detail view
  const [viewingReq, setViewingReq] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const collegeId = user?.collegeId;

  const fetchRequests = useCallback(async () => {
    if (!collegeId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getAffiliationRequests(collegeId);
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch affiliation requests:", err);
      addToast(err.response?.data?.message || "Failed to load affiliation requests.", "error");
    } finally {
      setLoading(false);
    }
  }, [collegeId, addToast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (reqId) => {
    try {
      setActionLoading(reqId);
      await approveAffiliationRequest(reqId);
      addToast("Student affiliation approved successfully!", "success");
      setViewingReq(null);
      fetchRequests();
    } catch (err) {
      console.error("Approve affiliation error:", err);
      addToast(err.response?.data?.message || "Failed to approve affiliation.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      addToast("Rejection reason is required.", "error");
      return;
    }

    try {
      setActionLoading(rejectingReq.id);
      await rejectAffiliationRequest(rejectingReq.id, rejectionReason.trim());
      addToast("Student affiliation rejected.", "info");
      setRejectingReq(null);
      setRejectionReason("");
      setViewingReq(null);
      fetchRequests();
    } catch (err) {
      console.error("Reject affiliation error:", err);
      addToast(err.response?.data?.message || "Failed to reject affiliation.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadDocument = async (req) => {
    try {
      setDownloadingId(req.id);
      const response = await downloadAffiliationDocument(req.id);
      const blob = new Blob([response.data], {
        type: req.supportingDocumentContentType || "application/octet-stream"
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = req.supportingDocumentOriginalFilename || `affiliation-doc-${req.studentIdentifier || req.id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Document download error:", err);
      addToast(err.response?.data?.message || "Failed to download document.", "error");
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = filterStatus === "ALL" || r.status === filterStatus;
    if (!matchesStatus) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.studentIdentifier?.toLowerCase().includes(q) ||
      r.course?.toLowerCase().includes(q) ||
      r.department?.toLowerCase().includes(q) ||
      r.participantId?.toLowerCase().includes(q)
    );
  });

  const counts = {
    PENDING: requests.filter((r) => r.status === "PENDING").length,
    APPROVED: requests.filter((r) => r.status === "APPROVED").length,
    REJECTED: requests.filter((r) => r.status === "REJECTED").length
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans">
      <AppHeader
        user={user}
        onLogout={logoutUser}
        roleBadge={{ label: "College Admin", color: "indigo" }}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <OrganizerAffiliationReview collegeId={collegeId} />
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <GraduationCap className="w-7 h-7 text-indigo-600" />
              <span>Student Affiliation Requests</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Review and verify student identity claims for{" "}
              <span className="font-semibold text-slate-700">{user?.collegeName || "your institution"}</span>.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchRequests}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {Object.entries(counts).map(([status, count]) => {
            const cfg = STATUS_CONFIG[status];
            const Icon = cfg.icon;
            const colorMap = {
              amber: "bg-amber-50 border-amber-200 text-amber-700",
              emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
              rose: "bg-rose-50 border-rose-200 text-rose-700"
            };
            return (
              <button
                key={status}
                type="button"
                onClick={() => setFilterStatus(status)}
                className={`rounded-xl border p-3.5 text-left transition-all cursor-pointer hover:shadow-xs ${
                  filterStatus === status
                    ? `${colorMap[cfg.color]} ring-1 ring-${cfg.color}-300`
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${filterStatus === status ? "" : "text-slate-400"}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${filterStatus === status ? "" : "text-slate-400"}`}>
                    {cfg.label}
                  </span>
                </div>
                <div className={`text-2xl font-black ${filterStatus === status ? "" : "text-slate-800"}`}>
                  {count}
                </div>
              </button>
            );
          })}
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs mb-5 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by student ID, course, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
            />
          </div>

          <div className="flex items-center gap-2 text-xs ml-auto">
            <span className="text-slate-500">Showing:</span>
            <span className="font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
              {filteredRequests.length} requests
            </span>
          </div>
        </div>

        {/* Requests Table */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500 bg-white rounded-xl border border-slate-200">
            <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
            <p className="text-xs font-medium">Loading affiliation requests...</p>
          </div>
        ) : !collegeId ? (
          <div className="py-16 text-center bg-white rounded-xl border border-slate-200 space-y-3">
            <Building2 className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No College Linked</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Your account is not linked to a college. Please contact a Super Admin to be assigned as a College Admin.
            </p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-xl border border-slate-200 space-y-3">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Requests Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {filterStatus === "PENDING"
                ? "No pending student affiliation requests at the moment."
                : `No ${filterStatus.toLowerCase()} affiliation requests found.`}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 font-semibold text-slate-600">Student ID</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 hidden sm:table-cell">Course</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Department</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Submitted</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                          <GraduationCap className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-mono font-bold text-slate-800">
                            {req.studentIdentifier || "—"}
                          </span>
                          {req.supportingDocumentStorageName && (
                            <button
                              type="button"
                              onClick={() => handleDownloadDocument(req)}
                              disabled={downloadingId === req.id}
                              title="Download supporting document"
                              className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-100 transition-colors cursor-pointer"
                            >
                              {downloadingId === req.id ? (
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <FileText className="w-2.5 h-2.5" />
                              )}
                              Doc
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">
                      {req.course || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                      {req.department || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                      {req.submittedAt
                        ? new Date(req.submittedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingReq(req)}
                          title="View full details"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {req.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingReq(req);
                                setRejectionReason("");
                              }}
                              disabled={actionLoading === req.id}
                              className="px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Reject
                            </button>

                            <button
                              type="button"
                              onClick={() => handleApprove(req.id)}
                              disabled={actionLoading === req.id}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors cursor-pointer shadow-2xs disabled:opacity-50 flex items-center gap-1"
                            >
                              {actionLoading === req.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <UserCheck className="w-3 h-3" />
                              )}
                              Approve
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Detail View Modal */}
      {viewingReq && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
          onClick={() => setViewingReq(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Affiliation Request</h3>
                  <p className="text-xs text-slate-500 font-mono">ID: {viewingReq.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingReq(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Student ID / Roll No.</span>
                  <span className="font-mono font-bold text-slate-900">{viewingReq.studentIdentifier || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Course</span>
                  <span className="text-slate-700">{viewingReq.course || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Department</span>
                  <span className="text-slate-700">{viewingReq.department || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status</span>
                  <StatusBadge status={viewingReq.status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Submitted</span>
                  <span className="text-slate-600">
                    {viewingReq.submittedAt ? new Date(viewingReq.submittedAt).toLocaleString() : "—"}
                  </span>
                </div>
                {viewingReq.supportingDocumentStorageName && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Document</span>
                    <button
                      type="button"
                      onClick={() => handleDownloadDocument(viewingReq)}
                      disabled={downloadingId === viewingReq.id}
                      className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md border border-indigo-100 transition-colors cursor-pointer text-xs"
                    >
                      {downloadingId === viewingReq.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      Download Document
                    </button>
                  </div>
                )}
                {viewingReq.rejectionReason && (
                  <div>
                    <span className="text-slate-400 block mb-1">Rejection Reason</span>
                    <p className="text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-2.5">
                      {viewingReq.rejectionReason}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {viewingReq.status === "PENDING" && (
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingReq(viewingReq);
                    setRejectionReason("");
                  }}
                  disabled={actionLoading === viewingReq.id}
                  className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => handleApprove(viewingReq.id)}
                  disabled={actionLoading === viewingReq.id}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {actionLoading === viewingReq.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserCheck className="w-3.5 h-3.5" />
                  )}
                  <span>Approve Affiliation</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingReq && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
          onClick={() => setRejectingReq(null)}
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
                <h3 className="text-base font-bold text-slate-900">Reject Affiliation</h3>
                <p className="text-xs text-slate-500 font-mono">Student: {rejectingReq.studentIdentifier}</p>
              </div>
            </div>

            <div className="p-6 space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Rejection Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Invalid student ID, unable to verify, ID card not matching roll number..."
                className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900"
                autoFocus
              />
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingReq(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading !== null || !rejectionReason.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading !== null ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UserX className="w-3.5 h-3.5" />
                )}
                Confirm Rejection
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}


import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  Building2,
  Globe,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  KeyRound,
  Download,
  ChevronDown
} from "lucide-react";
import { useAuth } from "../features/auth/AuthContext";
import AppHeader from "../components/common/AppHeader";
import {
  getPendingCollegeApplications, getApprovedCollegeApplications, resendCollegeAdminInvitation,
  getCollegeApplicationDetails,
  approveCollegeApplication,
  rejectCollegeApplication,
  submitInitialAdminNomination, downloadInstitutionDocument, downloadNomineeDocument
} from "../features/auth/authApi";
import { useToast } from "../components/common/ToastContext";

export default function SuperAdminCollegesPage() {
  const { user, logoutUser } = useAuth();
  const addToast = useToast();

  const [applications, setApplications] = useState([]);
  const [approvedApps, setApprovedApps] = useState([]);
  const [approvedPage, setApprovedPage] = useState(0);
  const [approvedPages, setApprovedPages] = useState(1);
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

  const [editNominee, setEditNominee] = useState(false);
  const [nominee, setNominee] = useState({ name: "", email: "", contactNumber: "", designation: "", authorizationDocument: null });

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

  const fetchApproved = useCallback(async () => {
    try { const data = await getApprovedCollegeApplications(approvedPage, 20); setApprovedApps(data.content || []); setApprovedPages(data.totalPages || 1); }
    catch (err) { addToast(err.response?.data?.message || "Could not load approved applications.", "error"); }
  }, [approvedPage, addToast]);
  useEffect(() => {
    let active = true;
    getApprovedCollegeApplications(approvedPage, 20)
      .then(data => { if (active) { setApprovedApps(data.content || []); setApprovedPages(data.totalPages || 1); } })
      .catch(err => { if (active) addToast(err.response?.data?.message || "Could not load approved applications.", "error"); });
    return () => { active = false; };
  }, [approvedPage, addToast]);
  const resendInvitation = async (app) => {
    try { setActionLoading(true); await resendCollegeAdminInvitation(app.id); addToast("Invitation sent.", "success"); }
    catch (err) { addToast(err.response?.data?.message || "Could not send invitation.", "error"); }
    finally { setActionLoading(false); }
  };

  const handleViewDetails = async (app) => {
    setSelectedApp(app);
    setEditNominee(false);
    setNominee({ name: "", email: "", contactNumber: "", designation: "", authorizationDocument: null });
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
      fetchApproved();
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

  const downloadDocument = async (request, name) => {
    try {
      const response = await request();
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a"); link.href = url; link.download = name || "document"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { addToast(err.response?.data?.message || "Could not download document.", "error"); }
  };

  const handleNomination = async (event) => {
    event.preventDefault();
    try {
      setActionLoading(true);
      const result = await submitInitialAdminNomination(selectedApp.id, nominee);
      setSelectedApp(result);
      setEditNominee(false);
      await fetchApplications(page);
      addToast("Administrator nomination saved for review.", "success");
    } catch (err) { addToast(err.response?.data?.message || "Could not save nomination.", "error"); }
    finally { setActionLoading(false); }
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

        <details className="group mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">
            <span className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><KeyRound className="h-5 w-5" aria-hidden="true" /></span><span><span className="block text-sm font-bold text-slate-900">Approved institutions & invitations</span><span className="mt-1 block text-xs text-slate-500">Manage invitations for approved college admins</span></span></span>
            <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-slate-100 px-5 py-4">
            {approvedApps.length === 0 && <p className="py-2 text-sm text-slate-500">No approved applications yet.</p>}
            <div className="divide-y divide-slate-100">{approvedApps.map(app => <div key={app.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="break-words text-sm font-semibold text-slate-900">{app.name}</p><p className="mt-0.5 break-all text-xs text-slate-500">{app.initialAdminEmail || "No administrator nominated"}</p></div>{app.nomineeStatus === "APPROVED" && <button disabled={actionLoading} type="button" className="min-h-10 shrink-0 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50" onClick={() => resendInvitation(app)}>Resend invitation</button>}</div>)}</div>
            <div className="mt-3 flex items-center justify-end gap-3 text-xs text-slate-600"><button type="button" className="rounded-md px-2 py-1.5 hover:bg-slate-100 disabled:opacity-40" disabled={approvedPage === 0} onClick={() => setApprovedPage(p => p - 1)}>Previous</button><span>Page {approvedPage + 1} of {approvedPages}</span><button type="button" className="rounded-md px-2 py-1.5 hover:bg-slate-100 disabled:opacity-40" disabled={approvedPage + 1 >= approvedPages} onClick={() => setApprovedPage(p => p + 1)}>Next</button></div>
          </div>
        </details>
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
                        disabled={!isDomainMode || !isDomainVerified}
                        title={
                          isDomainMode && !isDomainVerified
                            ? "Domain OTP challenge has not been verified yet"
                            : (!isDomainMode ? "Inspect documents before approval" : "Approve Institution")
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
                      <span className="font-bold text-slate-800">{selectedApp.verificationMode === "MANUAL_DOCUMENTS" ? "Manual documents" : selectedApp.verificationMode === "OFFICIAL_DOMAIN" ? "Official domain" : selectedApp.verificationMode}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Current Status</span>
                      <span className="font-bold text-amber-600">{selectedApp.verificationStatus === "PENDING_VERIFICATION" ? "Pending review" : selectedApp.verificationStatus === "VERIFIED" ? "Verified" : selectedApp.verificationStatus === "REJECTED" ? "Rejected" : selectedApp.verificationStatus}</span>
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

                  {selectedApp.verificationMode === "MANUAL_DOCUMENTS" && (
                    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-bold text-slate-800">Institutional documents</p>
                      <p className="text-xs text-slate-500">Review the supporting documents before approving this institution.</p>
                      {(selectedApp.supportingDocuments || []).map(doc => <button key={doc.storagePath} type="button" className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-xs font-semibold text-indigo-700 hover:bg-indigo-50" onClick={() => downloadDocument(() => downloadInstitutionDocument(selectedApp.id, doc.storagePath), doc.originalFilename)}><Download className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="break-all">{doc.originalFilename}</span></button>)}
                      {!selectedApp.supportingDocuments?.length && <p className="text-xs font-medium text-rose-700">No supporting documents available. This application cannot be approved.</p>}
                    </div>
                  )}
                  {selectedApp.nomineeStatus === "PENDING" && !editNominee ? (
                    <div className="space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                      <p className="text-sm font-bold text-slate-800">Administrator nominee</p>
                      <p className="text-sm font-semibold text-slate-900">{selectedApp.nomineeName}</p>
                      <p className="break-words text-xs leading-5 text-slate-600">{selectedApp.initialAdminEmail} · {selectedApp.nomineeDesignation} · {selectedApp.nomineeContactNumber}</p>
                      <div className="flex flex-wrap gap-2"><button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-50" onClick={() => downloadDocument(() => downloadNomineeDocument(selectedApp.id), selectedApp.nomineeAuthorizationDocument?.originalFilename)}><Download className="h-4 w-4" aria-hidden="true" />Authorization document</button>{selectedApp.verificationMode === "MANUAL_DOCUMENTS" && <button type="button" className="min-h-10 rounded-lg px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-100" onClick={() => setEditNominee(true)}>Replace nomination</button>}</div>
                      <p className="text-xs text-slate-600">Approving the institution sends an invitation to the nominee.</p>
                      {!selectedApp.nomineeAuthorizationDocument && <p className="text-xs font-medium text-rose-700">Authorization document missing. Replace this nomination before approval.</p>}
                    </div>
                  ) : selectedApp.verificationMode === "MANUAL_DOCUMENTS" && (
                    <form onSubmit={handleNomination} className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                      <div><p className="text-sm font-bold text-slate-800">Administrator nomination</p><p className="mt-1 text-xs text-slate-600">Provide the nominee's details and authorization document.</p></div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-xs font-semibold text-slate-700">Name<input required aria-label="Nominee name" placeholder="Full name" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" value={nominee.name} onChange={e => setNominee({...nominee, name: e.target.value})} /></label>
                        <label className="text-xs font-semibold text-slate-700">Email<input required type="email" aria-label="Nominee email" placeholder="name@example.com" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" value={nominee.email} onChange={e => setNominee({...nominee, email: e.target.value})} /></label>
                        <label className="text-xs font-semibold text-slate-700">Contact number<input required type="tel" aria-label="Nominee contact" placeholder="Phone number" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" value={nominee.contactNumber} onChange={e => setNominee({...nominee, contactNumber: e.target.value})} /></label>
                        <label className="text-xs font-semibold text-slate-700">Designation<input required aria-label="Nominee designation" placeholder="Designation" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" value={nominee.designation} onChange={e => setNominee({...nominee, designation: e.target.value})} /></label>
                      </div>
                      <label className="block text-xs font-semibold text-slate-700">Authorization document <span className="font-normal text-slate-500">(PDF, JPG, PNG)</span><input required type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setNominee({...nominee, authorizationDocument: e.target.files?.[0]})} className="mt-2 block w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-100 file:px-3 file:py-2 file:font-semibold file:text-indigo-700" /></label>
                      <div className="flex flex-wrap gap-2"><button disabled={actionLoading} className="min-h-10 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">Save nomination</button>{editNominee && <button type="button" onClick={() => setEditNominee(false)} className="min-h-10 rounded-lg px-3 text-xs font-semibold text-slate-600 hover:bg-white">Cancel</button>}</div>
                    </form>
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
                  (selectedApp.verificationMode === "OFFICIAL_DOMAIN" && !selectedApp.domainOwnershipVerifiedAt) ||
                  (selectedApp.verificationMode === "MANUAL_DOCUMENTS" && (!selectedApp.supportingDocuments?.length || selectedApp.nomineeStatus !== "PENDING" || !selectedApp.nomineeAuthorizationDocument))
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

    </div>
  );
}


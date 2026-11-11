import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ShieldCheck,
  Building2,
  Mail,
  KeyRound,
  FileText,
  UploadCloud,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import {
  getMyAffiliationStatus,
  sendStudentAffiliationOTP,
  verifyStudentAffiliationOTP,
  submitManualAffiliationRequest
} from "../authApi";
import { useAuth } from "../AuthContext";

export default function StudentAffiliationModal({ isOpen, onClose }) {
  const { user, updateUser, refreshUser } = useAuth();

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [affiliationData, setAffiliationData] = useState(null);

  // Form states for manual submission
  const [studentId, setStudentId] = useState("");
  const [course, setCourse] = useState("");
  const [department, setDepartment] = useState("");
  const [documentFile, setDocumentFile] = useState(null);

  // OTP states for domain verification
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Action states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Determine college mode: default to user's college mode or OFFICIAL_DOMAIN
  const collegeMode = user?.collegeVerificationMode || affiliationData?.verificationMode || "OFFICIAL_DOMAIN";
  const currentStatus = user?.collegeVerificationStatus || "UNVERIFIED";

  // Fetch status on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoadingInitial(true);
    setGeneralError("");
    setSuccessMessage("");
    setOtp("");
    setOtpSent(false);

    getMyAffiliationStatus()
      .then((data) => {
        if (!isMounted) return;
        setAffiliationData(data);
      })
      .catch((err) => {
        // Not found or no request yet is normal for unverified users
        console.debug("Affiliation request check:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingInitial(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isSubmitting, onClose]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendOTP = async () => {
    try {
      setIsSubmitting(true);
      setGeneralError("");
      await sendStudentAffiliationOTP();
      setOtpSent(true);
      setCooldown(60);
      setSuccessMessage("A 6-digit verification code has been sent to your college email address.");
    } catch (err) {
      setGeneralError(err.response?.data?.message || "Failed to send verification code. Please verify your college email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      setGeneralError("Please enter a valid 6-digit verification code.");
      return;
    }

    try {
      setIsSubmitting(true);
      setGeneralError("");
      await verifyStudentAffiliationOTP(otp.trim());
      updateUser({ collegeVerificationStatus: "VERIFIED" });
      await refreshUser();
      setSuccessMessage("Your student affiliation has been verified successfully!");
    } catch (err) {
      setGeneralError(err.response?.data?.message || "Invalid or expired verification code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!studentId.trim()) {
      setGeneralError("Student ID / Roll Number is required.");
      return;
    }

    if (!documentFile) {
      setGeneralError("Supporting document (Student ID Card) is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      setGeneralError("");
      const request = await submitManualAffiliationRequest({
        studentIdentifier: studentId.trim(),
        course: course.trim(),
        department: department.trim(),
        document: documentFile
      });
      setAffiliationData(request);
      updateUser({ collegeVerificationStatus: "PENDING" });
      await refreshUser();
      setSuccessMessage("Your affiliation request has been submitted for review by your College Admin.");
    } catch (err) {
      setGeneralError(err.response?.data?.message || "Failed to submit affiliation request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-left flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Student Affiliation Verification
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify your student status with {user?.collegeName || "your institution"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {loadingInitial ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
              <p className="text-xs">Loading affiliation status...</p>
            </div>
          ) : currentStatus === "VERIFIED" ? (
            /* VERIFIED STATE */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">
                  Affiliation Verified!
                </h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  You are a recognized, verified student of{" "}
                  <span className="font-semibold text-slate-800">
                    {user?.collegeName || "your institution"}
                  </span>
                  . You can now register for all campus-exclusive competitions and events.
                </p>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 max-w-sm mx-auto text-xs space-y-2 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-800">Campus Code:</span>
                  <span className="font-mono font-bold text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-200">
                    {user?.collegeCode || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-emerald-800">Status:</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Student
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer transition-colors shadow-sm"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          ) : currentStatus === "PENDING" ? (
            /* PENDING STATE */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center text-amber-600 mx-auto">
                <Clock className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">
                  Verification in Progress
                </h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Your affiliation submission has been received and is currently under review by the College Admin of{" "}
                  <span className="font-semibold text-slate-800">
                    {user?.collegeName || "your institution"}
                  </span>
                  .
                </p>
              </div>

              {affiliationData && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-sm mx-auto text-xs space-y-1.5 text-left font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Student ID:</span>
                    <span className="font-bold text-slate-800">{affiliationData.studentIdentifier}</span>
                  </div>
                  {affiliationData.course && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Course:</span>
                      <span className="text-slate-700">{affiliationData.course}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="font-semibold text-amber-600">Pending Admin Approval</span>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            /* UNVERIFIED / REJECTED SUBMISSION FORM */
            <div className="space-y-4">
              {currentStatus === "REJECTED" && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1 text-rose-800">
                    <p className="font-bold text-rose-900">Previous Request Rejected</p>
                    <p>{affiliationData?.rejectionReason || "Your affiliation request was rejected. Please review your details and reapply."}</p>
                  </div>
                </div>
              )}

              {/* General feedback alerts */}
              {generalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{generalError}</span>
                </div>
              )}
              {successMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Institution Info Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-600">Selected Institution:</span>
                  <span className="font-bold text-slate-800">{user?.collegeName || "Registered College"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Your Account Email:</span>
                  <span className="font-mono text-slate-700">{user?.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Verification Mode:</span>
                  <span className="font-semibold text-indigo-700">
                    {collegeMode === "OFFICIAL_DOMAIN" ? "Instant College Email OTP" : "Student ID Document Review"}
                  </span>
                </div>
              </div>

              {/* MODE A: OFFICIAL DOMAIN OTP */}
              {collegeMode === "OFFICIAL_DOMAIN" ? (
                <div className="space-y-4 pt-1">
                  {!otpSent ? (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Your institution uses official college email domain verification. Click below to receive a secure 6-digit verification code at <span className="font-semibold text-slate-800">{user?.email}</span>.
                      </p>
                      <button
                        type="button"
                        onClick={handleSendOTP}
                        disabled={isSubmitting}
                        className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Sending Verification Code...</span>
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4" />
                            <span>Send Verification Code to My Email</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleVerifyOTP} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          6-Digit Verification Code
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            maxLength={6}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                            placeholder="123456"
                            className="w-full text-center tracking-widest text-lg font-mono font-bold py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                            autoFocus
                          />
                        </div>
                        <div className="flex justify-between items-center mt-2 text-[11px] text-slate-500">
                          <span>Expires in 10 minutes</span>
                          {cooldown > 0 ? (
                            <span>Resend in {cooldown}s</span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSendOTP}
                              disabled={isSubmitting}
                              className="text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                            >
                              Resend Code
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setOtpSent(false)}
                          disabled={isSubmitting}
                          className="flex-1 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting || otp.length !== 6}
                          className="flex-1 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <ShieldCheck className="w-4 h-4" />
                              <span>Verify Affiliation</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                /* MODE B: MANUAL DOCUMENT SUBMISSION */
                <form onSubmit={handleManualSubmit} className="space-y-3.5 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Student ID / Roll Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="e.g. 21BCSE1024"
                      className="w-full text-xs py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Course / Degree
                      </label>
                      <input
                        type="text"
                        value={course}
                        onChange={(e) => setCourse(e.target.value)}
                        placeholder="e.g. B.Tech CSE"
                        className="w-full text-xs py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Department
                      </label>
                      <input
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="e.g. Engineering"
                        className="w-full text-xs py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Student ID Card Document (PDF, JPG, PNG) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50">
                      <input
                        type="file"
                        required
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className="flex flex-col items-center gap-1 text-xs text-slate-500">
                        <UploadCloud className="w-6 h-6 text-indigo-500" />
                        <span className="font-medium text-slate-700">
                          {documentFile ? documentFile.name : "Click to upload Student ID or Document"}
                        </span>
                        <span className="text-[10px] text-slate-400">Max size: 10MB</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || !studentId.trim() || !documentFile}
                      className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Submitting Request...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4" />
                          <span>Submit for College Admin Review</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}


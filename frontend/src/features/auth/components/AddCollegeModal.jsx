import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Building2,
  Globe,
  Mail,
  ShieldCheck,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowRight,
  Clock,
  UploadCloud
} from "lucide-react";
import {
  submitCollegeApplication,
  submitManualCollegeApplication,
  sendCollegeDomainOTP,
  verifyCollegeDomainOTP
} from "../authApi";

export default function AddCollegeModal({
  isOpen,
  onClose,
  onCollegeCreated,
  initialName = ""
}) {
  // Step state: "FORM" | "OTP" | "SUCCESS"
  const [step, setStep] = useState("FORM");

  // Form Fields
  const [name, setName] = useState(initialName);
  const [code, setCode] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [verificationMode, setVerificationMode] = useState("OFFICIAL_DOMAIN"); // "OFFICIAL_DOMAIN" | "MANUAL_DOCUMENTS"
  const [proposedDomain, setProposedDomain] = useState("");
  const [domainContactEmail, setDomainContactEmail] = useState("");
  const [initialAdminEmail, setInitialAdminEmail] = useState("");
  const [supportingDocuments, setSupportingDocuments] = useState([]);
  const [nomineeName, setNomineeName] = useState("");
  const [nomineePhone, setNomineePhone] = useState("");
  const [nomineeDesignation, setNomineeDesignation] = useState("");
  const [nomineeDocument, setNomineeDocument] = useState(null);

  // OTP Verification state
  const [createdApplication, setCreatedApplication] = useState(null);
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Status & Error states
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // Sync initialName when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("FORM");
      setName(initialName || "");
      setCode("");
      setWebsite("");
      setAddress("");
      setVerificationMode("OFFICIAL_DOMAIN");
      setProposedDomain("");
      setDomainContactEmail("");
      setInitialAdminEmail("");
      setSupportingDocuments([]);
      setNomineeName(""); setNomineePhone(""); setNomineeDesignation(""); setNomineeDocument(null);
      setCreatedApplication(null);
      setOtp("");
      setCooldown(0);
      setFieldErrors({});
      setGeneralError("");
      setIsSubmitting(false);
    }
  }, [isOpen, initialName]);

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

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  if (!isOpen) return null;

  const validateForm = () => {
    const errors = {};
    if (!name.trim()) errors.name = "College / Institution name is required";
    if (!code.trim()) {
      errors.code = "College code is required";
    } else if (code.trim().length < 2) {
      errors.code = "College code must be at least 2 characters";
    }

    if (verificationMode === "OFFICIAL_DOMAIN") {
      const cleanDomain = proposedDomain.trim().toLowerCase();
      if (!cleanDomain) {
        errors.proposedDomain = "Official email domain is required (e.g. university.edu)";
      } else if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cleanDomain)) {
        errors.proposedDomain = "Please enter a valid domain (e.g. college.edu or college.ac.in)";
      }

      const cleanEmail = domainContactEmail.trim().toLowerCase();
      if (!cleanEmail) {
        errors.domainContactEmail = "Official contact email is required";
      } else if (!cleanEmail.endsWith(`@${cleanDomain}`)) {
        errors.domainContactEmail = `Email must belong to @${cleanDomain || "the proposed domain"}`;
      }
    }
    if (verificationMode === "MANUAL_DOCUMENTS" && supportingDocuments.length === 0) {
      errors.supportingDocuments = "Upload at least one institutional document.";
    }

    if (verificationMode === "MANUAL_DOCUMENTS") {
      if (!nomineeName.trim() || !nomineeDesignation.trim() || !nomineePhone.trim() || !nomineeDocument || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(initialAdminEmail.trim())) {
        errors.nominee = "Provide the administrator's name, valid email, phone, designation and authorization document.";
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit initial application
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setGeneralError("");

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        officialWebsite: website.trim() || null,
        address: address.trim() || null,
        verificationMode,
        proposedDomain: verificationMode === "OFFICIAL_DOMAIN" ? proposedDomain.trim().toLowerCase() : null,
        domainContactEmail: verificationMode === "OFFICIAL_DOMAIN" ? domainContactEmail.trim().toLowerCase() : null,
        initialAdminEmail: initialAdminEmail.trim().toLowerCase() || null
      };

      const application = verificationMode === "MANUAL_DOCUMENTS"
        ? await submitManualCollegeApplication({ ...payload, documents: supportingDocuments, nomineeName: nomineeName.trim(), nomineeEmail: initialAdminEmail.trim().toLowerCase(), nomineeContactNumber: nomineePhone.trim(), nomineeDesignation: nomineeDesignation.trim(), nomineeAuthorizationDocument: nomineeDocument })
        : await submitCollegeApplication(payload);
      setCreatedApplication(application);

      if (verificationMode === "OFFICIAL_DOMAIN") {
        // Automatically request domain OTP
        try {
          setIsSendingOtp(true);
          await sendCollegeDomainOTP(application.id, {
            email: domainContactEmail.trim().toLowerCase(),
            domain: proposedDomain.trim().toLowerCase()
          });
          setCooldown(60);
          setStep("OTP");
        } catch (otpErr) {
          console.warn("Domain OTP request issue:", otpErr);
          // Even if OTP send has a temporary glitch, user is on OTP screen to retry
          setStep("OTP");
        } finally {
          setIsSendingOtp(false);
        }
      } else {
        // Manual documents path
        setStep("SUCCESS");
        if (onCollegeCreated) {
          onCollegeCreated(application);
        }
      }
    } catch (err) {
      console.error("Failed to submit college application:", err);
      setGeneralError(
        err.response?.data?.message ||
          "Failed to submit college application. Please verify details and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend Domain OTP
  const handleResendOtp = async () => {
    if (cooldown > 0 || !createdApplication) return;
    setGeneralError("");
    setIsSendingOtp(true);
    try {
      await sendCollegeDomainOTP(createdApplication.id, {
        email: domainContactEmail.trim().toLowerCase(),
        domain: proposedDomain.trim().toLowerCase()
      });
      setCooldown(60);
    } catch (err) {
      console.error("Failed to resend OTP:", err);
      setGeneralError(err.response?.data?.message || "Failed to resend verification code.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify Domain OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      setGeneralError("Please enter the 6-digit verification code.");
      return;
    }

    setIsSubmitting(true);
    setGeneralError("");
    try {
      await verifyCollegeDomainOTP(createdApplication.id, otp.trim(), domainContactEmail.trim().toLowerCase());
      setStep("SUCCESS");
      if (onCollegeCreated) {
        onCollegeCreated(createdApplication);
      }
    } catch (err) {
      console.error("Failed to verify OTP:", err);
      setGeneralError(err.response?.data?.message || "Invalid or expired verification code.");
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
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-left flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Register New Institution
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Every institution undergoes verification before being available for selection.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content based on Step */}
        <div className="p-6 overflow-y-auto space-y-5">
          {generalError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{generalError}</span>
            </div>
          )}

          {step === "FORM" && (
            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Institution Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Institution Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Stanford University"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  {fieldErrors.name && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Short Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. STAN"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                  {fieldErrors.code && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.code}</p>
                  )}
                </div>
              </div>

              {/* Website & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Official Website
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      placeholder="https://stanford.edu"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Location / Address
                  </label>
                  <input
                    type="text"
                    placeholder="City, State / Country"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Verification Mode Choice */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Verification Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setVerificationMode("OFFICIAL_DOMAIN")}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      verificationMode === "OFFICIAL_DOMAIN"
                        ? "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      <span>Official Domain (Fast)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                      Verify ownership via OTP sent to your official college email domain.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVerificationMode("MANUAL_DOCUMENTS")}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      verificationMode === "MANUAL_DOCUMENTS"
                        ? "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>Manual Documents</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                      For institutions without a domain. Supporting documents reviewed by Super Admin.
                    </p>
                  </button>
                </div>
              </div>

              {/* Conditional Fields for Domain Mode */}
              {verificationMode === "OFFICIAL_DOMAIN" ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Domain Ownership Challenge</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Official Domain <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. stanford.edu"
                        value={proposedDomain}
                        onChange={(e) => setProposedDomain(e.target.value.toLowerCase())}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                      />
                      {fieldErrors.proposedDomain && (
                        <p className="text-[11px] text-red-600 mt-1">{fieldErrors.proposedDomain}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Domain Contact Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        placeholder="admin@stanford.edu"
                        value={domainContactEmail}
                        onChange={(e) => setDomainContactEmail(e.target.value.toLowerCase())}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                      {fieldErrors.domainContactEmail && (
                        <p className="text-[11px] text-red-600 mt-1">{fieldErrors.domainContactEmail}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-600">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <UploadCloud className="w-4 h-4 text-indigo-600" />
                    <span>Supporting Documentation</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Your application will be submitted for manual administrative review. You can provide authorization letters or government accreditation documents.
                  </p>
                  <label className="block text-[11px] font-semibold text-slate-700 pt-1">
                    Institutional documents (PDF, JPG, PNG) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setSupportingDocuments(Array.from(e.target.files || []))}
                    className="block w-full text-xs text-slate-600 file:mr-3 file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-indigo-700 file:font-semibold file:rounded-md"
                  />
                  {supportingDocuments.length > 0 && <p className="text-[11px] text-emerald-700">{supportingDocuments.length} document(s) ready to upload.</p>}
                  {fieldErrors.supportingDocuments && <p className="text-[11px] text-red-600">{fieldErrors.supportingDocuments}</p>}
                </div>
              )}

              {/* Proposed College Admin */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Proposed Initial College Admin Email {verificationMode === "MANUAL_DOCUMENTS" ? "*" : "(Optional)"}
                </label>
                <input
                  type="email"
                  placeholder="admin-contact@college.edu"
                  value={initialAdminEmail}
                  onChange={(e) => setInitialAdminEmail(e.target.value.toLowerCase())}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Manual applications require an administrator nomination. The nominee receives an invitation after approval.
                </p>
              </div>

              {verificationMode === "MANUAL_DOCUMENTS" && (
                <div className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                  <div><p className="text-sm font-bold text-slate-800">Initial administrator</p><p className="mt-1 text-xs leading-5 text-slate-600">The super admin will review this nomination and its authorization document before sending an invitation.</p></div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-semibold text-slate-700">Full name <span className="text-rose-600">*</span><input aria-label="Nominee name" value={nomineeName} onChange={e => setNomineeName(e.target.value)} placeholder="Administrator name" className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" /></label>
                    <label className="block text-xs font-semibold text-slate-700">Contact number <span className="text-rose-600">*</span><input aria-label="Nominee contact number" type="tel" value={nomineePhone} onChange={e => setNomineePhone(e.target.value)} placeholder="Phone number" className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" /></label>
                    <label className="block text-xs font-semibold text-slate-700 sm:col-span-2">Designation <span className="text-rose-600">*</span><input aria-label="Nominee designation" value={nomineeDesignation} onChange={e => setNomineeDesignation(e.target.value)} placeholder="e.g. Dean or administrator" className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" /></label>
                  </div>
                  <label className="block text-xs font-semibold text-slate-700">Authorization document <span className="text-rose-600">*</span><span className="mt-1 block font-normal text-slate-500">PDF, JPG or PNG</span><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setNomineeDocument(e.target.files?.[0] || null)} className="mt-2 block w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-100 file:px-3 file:py-2 file:font-semibold file:text-indigo-700 hover:file:bg-indigo-200" /></label>
                  {fieldErrors.nominee && <p role="alert" className="text-xs text-rose-600">{fieldErrors.nominee}</p>}
                </div>
              )}
              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isSendingOtp}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg cursor-pointer transition-colors shadow-sm"
                >
                  {isSubmitting || isSendingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {step === "OTP" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-2 text-left">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  <span>Verify Domain Ownership</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  We sent a 6-digit verification code to{" "}
                  <strong className="text-indigo-900 font-mono">{domainContactEmail}</strong>.
                  Enter it below to prove ownership of the <strong className="text-slate-900">{proposedDomain}</strong> domain.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full text-center tracking-[0.5em] text-2xl font-mono font-bold py-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Code expires in 10 minutes
                </span>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={cooldown > 0 || isSendingOtp}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed"
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStep("FORM")}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || otp.length !== 6}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg cursor-pointer transition-colors shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify Domain</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {step === "SUCCESS" && (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">
                  Institution Application Submitted!
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  {verificationMode === "OFFICIAL_DOMAIN"
                    ? "Domain ownership has been successfully verified via OTP. Your institution application is now PENDING_VERIFICATION for Super Admin review."
                    : "Your application and supporting documents are pending Super Admin review. Registration is available only after approval; search for your college again then."}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-sm mx-auto text-left text-xs space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Institution:</span>
                  <span className="font-bold text-slate-800">{name} ({code})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="font-semibold text-amber-600">Pending Review</span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer transition-colors shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { verifyRegistrationEmail, resendRegistrationOTP } from "../authApi";
import { parseAuthError } from "../utils/errorMapper";
import {
  Mail,
  KeyRound,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  X
} from "lucide-react";

export default function RegistrationOtpModal({
  isOpen,
  onClose,
  email,
  onVerified,
  userRole = "User"
}) {
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setOtp("");
      setError("");
      setSuccess(false);
      setCooldown(60);
    }
  }, [isOpen]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  if (!isOpen) return null;

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    setError("");

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setError("Please enter the complete 6-digit verification code");
      return;
    }

    setIsSubmitting(true);
    try {
      await verifyRegistrationEmail({
        email: email.trim().toLowerCase(),
        otp: cleanOtp
      });

      setSuccess(true);
      setTimeout(() => {
        if (onVerified) {
          onVerified();
        }
      }, 1500);
    } catch (err) {
      const { generalError } = parseAuthError(err);
      setError(generalError || "Invalid or expired verification code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setError("");
    setIsResending(true);

    try {
      await resendRegistrationOTP({
        email: email.trim().toLowerCase()
      });
      setCooldown(60);
      setOtp("");
    } catch (err) {
      const { generalError } = parseAuthError(err);
      setError(generalError || "Failed to resend verification code. Please try again later.");
    } finally {
      setIsResending(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting && !success) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-left flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Verify Your Email
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete {userRole} registration
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || success}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {success ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Email Verified Successfully!
              </h3>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">
                Your account is now activated. Redirecting you to login...
              </p>
            </div>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-100 space-y-1 text-left">
                <div className="flex items-center gap-1.5 text-indigo-900 font-semibold text-xs">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Enter Verification Code</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  We sent a 6-digit OTP to{" "}
                  <strong className="text-indigo-950 font-medium break-all">{email}</strong>.
                  Please enter it below to activate your account.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="reg-otp-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  6-Digit OTP Code
                </label>
                <input
                  id="reg-otp-input"
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full text-center tracking-[0.4em] text-2xl font-mono font-bold py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  autoFocus
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1 text-[11px]">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Valid for 10 minutes
                </span>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || isResending || isSubmitting}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed transition-colors"
                >
                  {isResending ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Sending...
                    </span>
                  ) : cooldown > 0 ? (
                    `Resend code in ${cooldown}s`
                  ) : (
                    "Resend Code"
                  )}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer transition-colors"
                >
                  Verify Later
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || otp.length !== 6}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg cursor-pointer transition-colors shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify & Continue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}


import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { createCollege } from "../authApi";
import { X, Building2, Loader2, AlertCircle } from "lucide-react";

export default function AddCollegeModal({
  isOpen,
  onClose,
  onCollegeCreated,
  initialName = ""
}) {
  const [name, setName] = useState(initialName);
  const [code, setCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameInputRef = useRef(null);
  const codeInputRef = useRef(null);

  // Sync initialName when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(initialName || "");
      setCode("");
      setFieldErrors({});
      setGeneralError("");
      setIsSubmitting(false);

      // Focus appropriate input on open
      const timer = setTimeout(() => {
        if (initialName && initialName.trim().length > 0) {
          codeInputRef.current?.focus();
        } else {
          nameInputRef.current?.focus();
        }
      }, 50);

      return () => clearTimeout(timer);
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

  if (!isOpen) return null;

  const validate = () => {
    const errors = {};
    if (!name.trim()) {
      errors.name = "College name is required";
    }
    if (!code.trim()) {
      errors.code = "College code is required";
    } else if (code.trim().length < 2) {
      errors.code = "College code must be at least 2 characters";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setGeneralError("");

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const trimmedName = name.trim();
      const trimmedCode = code.trim().toUpperCase();

      const created = await createCollege({
        name: trimmedName,
        code: trimmedCode
      });

      const collegeObj = created?.data || created || {
        id: created?.id || String(Date.now()),
        name: trimmedName,
        code: trimmedCode
      };

      onCollegeCreated(collegeObj);
      onClose();
    } catch (err) {
      console.error("Failed to create college:", err);
      const serverMsg = err.response?.data?.message || err.message;
      if (serverMsg && typeof serverMsg === "string" && serverMsg.includes("already exists")) {
        setFieldErrors({ code: "A college with this code already exists." });
      } else {
        setGeneralError(
          serverMsg && typeof serverMsg === "string"
            ? serverMsg
            : "Failed to add college. Please try again."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-college-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-xs transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden transform transition-all text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Building2 className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2 id="add-college-title" className="text-base font-semibold text-slate-900">
                Add New College
              </h2>
              <p className="text-xs text-slate-500">
                Register an unlisted institution
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="p-6 space-y-4"
        >
          {generalError && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" aria-hidden="true" />
              <div className="flex-1 font-medium">{generalError}</div>
            </div>
          )}

          {/* College Name Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="modal-college-name"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
            >
              College Name <span className="text-rose-500">*</span>
            </label>
            <input
              ref={nameInputRef}
              id="modal-college-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: "" }));
              }}
              placeholder="e.g. Panipat Institute of Engineering and Technology"
              disabled={isSubmitting}
              className={`
                block w-full px-3.5 py-2 rounded-lg border text-sm transition-colors
                placeholder:text-slate-400 focus:outline-none focus:ring-2
                ${isSubmitting ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white text-slate-900"}
                ${
                  fieldErrors.name
                    ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                    : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20"
                }
              `}
            />
            {fieldErrors.name && (
              <p className="text-xs text-rose-600 font-medium mt-1">{fieldErrors.name}</p>
            )}
          </div>

          {/* College Code Field */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label
                htmlFor="modal-college-code"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                College Code <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs text-slate-400">Unique identifier</span>
            </div>
            <input
              ref={codeInputRef}
              id="modal-college-code"
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                if (fieldErrors.code) setFieldErrors((prev) => ({ ...prev, code: "" }));
              }}
              placeholder="e.g. PIET001"
              disabled={isSubmitting}
              className={`
                block w-full px-3.5 py-2 rounded-lg border text-sm font-mono transition-colors
                placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:ring-2
                ${isSubmitting ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white text-slate-900"}
                ${
                  fieldErrors.code
                    ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                    : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20"
                }
              `}
            />
            {fieldErrors.code && (
              <p className="text-xs text-rose-600 font-medium mt-1">{fieldErrors.code}</p>
            )}
          </div>

          {/* Modal Footer / Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  <span>Adding College...</span>
                </>
              ) : (
                <span>Add College</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
}

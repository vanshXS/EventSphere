import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerParticipant } from "../authApi";
import { parseAuthError } from "../utils/errorMapper";
import AuthLayout from "../../../components/common/AuthLayout";
import FormField from "../../../components/common/FormField";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import CollegeSelector from "../components/CollegeSelector";

export default function ParticipantRegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    collegeCode: ""
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: ""
      }));
    }
    if (generalError) setGeneralError("");
  };

  const validateClientSide = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = "Full name is required";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters long";
    }

    if (!formData.collegeCode.trim()) {
      errors.collegeCode = "College code is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError("");
    setSuccessMessage("");

    if (!validateClientSide()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await registerParticipant({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        collegeCode: formData.collegeCode.trim()
      });

      setSuccessMessage("Participant account registered successfully! Redirecting to login...");

      setTimeout(() => {
        navigate("/login");
      }, 1800);
    } catch (err) {
      const { fieldErrors: apiFieldErrors, generalError: apiGeneralError } = parseAuthError(err);
      setFieldErrors(apiFieldErrors);
      setGeneralError(apiGeneralError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Participant Registration"
      subtitle="Join EventSphere to participate in college events"
    >
      {generalError && (
        <div
          role="alert"
          className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" aria-hidden="true" />
          <div className="flex-1 font-medium">{generalError}</div>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="mb-5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-2.5"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
          <div className="flex-1 font-medium">{successMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="participant-name"
          name="name"
          label="Full Name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          placeholder="John Smith"
          error={fieldErrors.name}
          required
          disabled={isSubmitting}
          autoComplete="name"
        />

        <FormField
          id="participant-email"
          name="email"
          label="Email Address"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="student@college.edu"
          error={fieldErrors.email}
          required
          disabled={isSubmitting}
          autoComplete="email"
        />

        <FormField
          id="participant-password"
          name="password"
          label="Password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Min. 8 characters"
          error={fieldErrors.password}
          required
          disabled={isSubmitting}
          autoComplete="new-password"
          hint="Minimum 8 characters"
        />

        <CollegeSelector
          id="participant-college"
          onSelect={(college) => {
            setFormData((prev) => ({
              ...prev,
              collegeCode: college?.code?.trim() || ""
            }));

            if (fieldErrors.collegeCode || fieldErrors.collegeId || fieldErrors.college) {
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.collegeCode;
                delete next.collegeId;
                delete next.college;
                return next;
              });
            }
          }}
          allowAdd={false}
          error={fieldErrors.collegeCode || fieldErrors.collegeId || fieldErrors.college}
          disabled={isSubmitting}
          required
        />

        <button
          type="submit"
          disabled={isSubmitting || !!successMessage}
          className="w-full mt-3 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 focus:bg-indigo-700 text-white font-medium rounded-lg text-sm transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Registering Participant...</span>
            </>
          ) : (
            <span>Register as Participant</span>
          )}
        </button>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-5 text-center text-xs text-slate-600 space-y-2">
        <div>
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors hover:underline focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1"
          >
            Sign in here
          </Link>
        </div>
        <div>
          Registering an event organizing team?{" "}
          <Link
            to="/register/organizer"
            className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors hover:underline focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1"
          >
            Organizer Registration
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

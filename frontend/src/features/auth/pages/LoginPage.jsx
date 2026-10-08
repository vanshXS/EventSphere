import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../authApi";
import { useAuth } from "../AuthContext";
import { parseAuthError } from "../utils/errorMapper";
import AuthLayout from "../../../components/common/AuthLayout";
import FormField from "../../../components/common/FormField";
import { Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { user, loginUser } = useAuth();

  useEffect(() => {
    if (user) {
      if (user.role === "ORGANIZER") {
        navigate("/organizer", { replace: true });
      } else if (user.role === "PARTICIPANT") {
        navigate("/participant", { replace: true });
      } else if (user.role === "VOLUNTEER") {
        navigate("/volunteer", { replace: true });
      }
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    // Clear field-level error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: ""
      }));
    }
    if (generalError) {
      setGeneralError("");
    }
  };

  const validateClientSide = () => {
    const errors = {};
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      errors.password = "Password is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError("");

    if (!validateClientSide()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await login(formData);
      loginUser(user);

      if (user?.role === "ORGANIZER") {
        navigate("/organizer");
      } else if (user?.role === "PARTICIPANT") {
        navigate("/participant");
      } else if (user?.role === "VOLUNTEER") {
        navigate("/volunteer");
      } else {
        navigate("/");
      }
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
      title="Welcome back"
      subtitle="Sign in to your EventSphere account"
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

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="login-email"
          name="email"
          label="Email Address"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="name@college.edu"
          error={fieldErrors.email}
          required
          disabled={isSubmitting}
          autoComplete="email"
        />

        <FormField
          id="login-password"
          name="password"
          label="Password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="••••••••"
          error={fieldErrors.password}
          required
          disabled={isSubmitting}
          autoComplete="current-password"
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 focus:bg-indigo-700 text-white font-medium rounded-lg text-sm transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Signing in...</span>
            </>
          ) : (
            <span>Sign In</span>
          )}
        </button>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-5 text-xs text-slate-600 space-y-3">
        <div className="text-center font-medium text-slate-500">
          Don't have an account?
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Link
            to="/register/organizer"
            className="group block rounded-lg border border-slate-200 hover:border-indigo-200 bg-slate-50 hover:bg-indigo-50/50 p-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <span className="block text-sm font-semibold text-indigo-600 group-hover:text-indigo-700">
              Register as Organizer
            </span>
            <span className="block mt-0.5 text-[11px] text-slate-500 leading-snug">
              For clubs &amp; committees managing campus events.
            </span>
          </Link>
          <Link
            to="/register/participant"
            className="group block rounded-lg border border-slate-200 hover:border-emerald-200 bg-slate-50 hover:bg-emerald-50/50 p-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <span className="block text-sm font-semibold text-emerald-600 group-hover:text-emerald-700">
              Join as Participant
            </span>
            <span className="block mt-0.5 text-[11px] text-slate-500 leading-snug">
              For students exploring &amp; joining events.
            </span>
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
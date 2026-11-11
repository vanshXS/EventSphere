import React, { useState } from "react";
import { Form, Link, useNavigate } from "react-router-dom";
import { registerOrganization } from "../authApi";
import { parseAuthError } from "../utils/errorMapper";
import AuthLayout from "../../../components/common/AuthLayout";
import FormField from "../../../components/common/FormField";
import { Loader2, ShieldCheck } from "lucide-react";
import CollegeSelector from "../components/CollegeSelector";
import RegistrationOtpModal from "../components/RegistrationOtpModal";
import { useToast } from "../../../components/common/ToastContext";

export default function OrganizerRegisterPage() {
  const addToast = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    collegeId: "",
    collegeName: "",
    collegeCode: ""
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const setGeneralError = (message) => {
    if (message) addToast(message, "error");
  };
  const setSuccessMessage = (message) => {
    if (message) {
      setRegistrationComplete(true);
      addToast(message, "success");
    } else {
      setRegistrationComplete(false);
    }
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCollege, setSelectedCollege] = useState(null);

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
    } else if (
      selectedCollege?.verificationMode === "OFFICIAL_DOMAIN" &&
      selectedCollege?.verifiedDomains &&
      selectedCollege.verifiedDomains.length > 0
    ) {
      const emailDomain = formData.email.trim().toLowerCase().split("@")[1];
      const allowedDomains = selectedCollege.verifiedDomains.map((d) => d.toLowerCase());
      if (!emailDomain || !allowedDomains.includes(emailDomain)) {
        errors.email = `Must use an official college email (@${allowedDomains.join(", @")})`;
      }
    }

    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters long";
    }

    if (!formData.collegeId) {
      errors.collegeId = "College is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage("");

    if (!validateClientSide()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await registerOrganization({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        collegeId: formData.collegeId
      });

      const email = formData.email.trim();
      setRegisteredEmail(email);
      setRegistrationComplete(true);
      setIsOtpModalOpen(true);
      addToast("Account registered! Please verify your email OTP.", "info");
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
      title="Organizer Registration"
      subtitle="Register your institution or organizing committee"
    >
      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="organizer-name"
          name="name"
          label="Full Name / Representative"
          type="text"
          value={formData.name}
          onChange={handleChange}
          placeholder="Jane Doe"
          error={fieldErrors.name}
          required
          disabled={isSubmitting}
          autoComplete="name"
        />

        <FormField
          id="organizer-email"
          name="email"
          label="Email Address"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="organizer@college.edu"
          error={fieldErrors.email}
          required
          disabled={isSubmitting}
          autoComplete="email"
        />

        <FormField
          id="organizer-password"
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
          onSelect={(college) => {
            setFormData((prev) => ({
              ...prev,
              collegeId: college?.id || "",
              collegeName: college?.name || "",
              collegeCode: college?.code || ""
            }));

            setSelectedCollege(college);

            if (fieldErrors.collegeId || fieldErrors.collegeName || fieldErrors.collegeCode) {
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.collegeId;
                delete next.collegeName;
                delete next.collegeCode;
                return next;
              });
            }
          }}
          error={fieldErrors.collegeId || fieldErrors.collegeName || fieldErrors.collegeCode}
          disabled={isSubmitting}
          required
        />

        {selectedCollege?.verificationMode === "OFFICIAL_DOMAIN" && selectedCollege?.verifiedDomains?.length > 0 && (
          <div className="mt-2.5 mb-2 px-3 py-2 bg-indigo-50/80 border border-indigo-200/80 rounded-lg flex items-start gap-2 text-xs text-indigo-900 animate-in fade-in">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="leading-snug">
              <span className="font-semibold">Official Domain Required:</span> Your email must end with{" "}
              <span className="font-mono font-bold text-indigo-950">@{selectedCollege.verifiedDomains.join(", @")}</span>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || registrationComplete}
          className="w-full mt-3 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 focus:bg-indigo-700 text-white font-medium rounded-lg text-sm transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Registering Organizer...</span>
            </>
          ) : (
            <span>Register as Organizer</span>
          )}
        </button>
      </form>

      <RegistrationOtpModal
        isOpen={isOtpModalOpen}
        email={registeredEmail}
        userRole="Organizer"
        onClose={() => {
          setIsOtpModalOpen(false);
          addToast("Please verify your email before logging in.", "info");
          navigate("/login");
        }}
        onVerified={() => {
          setIsOtpModalOpen(false);
          addToast("Email verified successfully! You can now log in.", "success");
          navigate("/login");
        }}
      />

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
          Registering as a student?{" "}
          <Link
            to="/register/participant"
            className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors hover:underline focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1"
          >
            Participant Registration
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

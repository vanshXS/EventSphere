import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function FormField({
  id,
  name,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  autoComplete,
  hint
}) {
  const [showPassword, setShowPassword] = useState(false);

  const isPasswordType = type === "password";
  const actualInputType = isPasswordType ? (showPassword ? "text" : "password") : type;

  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className="space-y-1.5 text-left mb-4">
      <div className="flex justify-between items-center">
        <label
          htmlFor={id}
          className="block text-sm font-medium text-slate-700"
        >
          {label}
          {required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
        </label>
        {hint && !error && (
          <span id={hintId} className="text-xs text-slate-400">
            {hint}
          </span>
        )}
      </div>

      <div className="relative rounded-md shadow-xs">
        <input
          id={id}
          name={name}
          type={actualInputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
          className={`
            block w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors duration-150
            placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0
            ${disabled ? "bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200" : "bg-white text-slate-900"}
            ${
              error
                ? "border-rose-400 text-rose-900 focus:border-rose-500 focus:ring-rose-500/20"
                : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20"
            }
            ${isPasswordType ? "pr-10" : ""}
          `}
        />

        {isPasswordType && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none disabled:opacity-50"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Eye className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {error && (
        <p id={errorId} className="text-xs text-rose-600 font-medium flex items-center mt-1">
          {error}
        </p>
      )}
    </div>
  );
}

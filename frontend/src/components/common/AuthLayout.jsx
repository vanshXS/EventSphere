import React from "react";
import { Calendar, Sparkles } from "lucide-react";

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* EventSphere Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center space-x-2 bg-indigo-600 text-white p-2.5 rounded-xl shadow-xs mb-3">
          <Calendar className="w-6 h-6" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Event<span className="text-indigo-600">Sphere</span>
        </h1>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">
          College Event & Competition Management
        </p>
      </div>

      {/* Card Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/80 rounded-xl sm:px-10">
          {(title || subtitle) && (
            <div className="mb-6 border-b border-slate-100 pb-4">
              {title && (
                <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-sm text-slate-500 mt-1">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {children}
        </div>

        {/* Footer info */}
        <p className="mt-8 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} EventSphere Platform. All rights reserved.
        </p>
      </div>
    </div>
  );
}

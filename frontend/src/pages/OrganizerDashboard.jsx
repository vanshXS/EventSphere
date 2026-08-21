import React from "react";
import { useAuth } from "../features/auth/AuthContext";
import { LogOut, User, Building, Calendar } from "lucide-react";

export default function OrganizerDashboard() {
    const { user, logoutUser } = useAuth();

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-200 py-4 px-6 sm:px-8 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <div className="bg-indigo-600 text-white p-2 rounded-lg">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-lg text-slate-900">EventSphere</span>
                    <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-indigo-100">
                        Organizer
                    </span>
                </div>
                <button
                    onClick={logoutUser}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                    <LogOut className="w-4 h-4 text-slate-500" />
                    <span>Sign Out</span>
                </button>
            </header>

            <main className="max-w-4xl mx-auto py-10 px-4 sm:px-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 sm:p-8">
                    <h1 className="text-2xl font-bold text-slate-900 mb-1">
                        Welcome, {user?.name || "Organizer"}
                    </h1>
                    <p className="text-sm text-slate-500 mb-6">
                        Organizer Control Panel
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/60">
                            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                Account Details
                            </div>
                            <div className="text-sm font-semibold text-slate-800">{user?.email}</div>
                            <div className="text-xs text-slate-500 mt-1">Role: {user?.role}</div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/60">
                            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                <Building className="w-3.5 h-3.5 text-slate-400" />
                                College Affiliation
                            </div>
                            <div className="text-sm font-semibold text-slate-800">
                                {user?.collegeId ? `College ID: ${user.collegeId}` : "Not Specified"}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
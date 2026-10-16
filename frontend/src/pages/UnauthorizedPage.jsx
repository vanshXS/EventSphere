import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm max-w-md w-full text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-rose-100 text-rose-600 rounded-full mb-4">
                    <ShieldAlert className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 mb-2">403 Forbidden</h1>
                <p className="text-slate-600 text-sm mb-6">
                    You do not have permission to access this page. Please sign in with an authorized account.
                </p>
                <Link
                    to="/login"
                    className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition duration-150"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Return to Login</span>
                </Link>
            </div>
        </div>
    );
}
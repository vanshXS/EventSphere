import { Link, useLocation } from "react-router-dom";
import { ClipboardCheck, LogOut, ChevronRight } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";

export default function JudgeWorkspaceLayout({ children, title = "Judge workspace" }) {
  const { user, logoutUser } = useAuth();
  const location = useLocation();
  const onDashboard = location.pathname === "/judge";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/judge" className="flex min-w-0 items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white"><ClipboardCheck className="h-5 w-5" /></span>
            <span className="min-w-0">
              <span className="block text-sm font-bold tracking-tight text-slate-900">EventSphere</span>
              <span className="block text-xs text-slate-500">Judge workspace</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-48 truncate text-sm font-semibold text-slate-800">{user?.name || "Judge"}</p>
              <p className="max-w-48 truncate text-xs text-slate-500">{user?.email || "Signed in"}</p>
            </div>
            <span className="hidden h-8 w-px bg-slate-200 sm:block" />
            <button type="button" onClick={logoutUser} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>
      <div className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-xs text-slate-500 sm:px-6">
          <Link to="/judge" className="font-medium hover:text-indigo-600">My rounds</Link>
          {!onDashboard && <><ChevronRight className="h-3.5 w-3.5" /><span className="truncate font-semibold text-indigo-700">{title}</span></>}
        </div>
      </div>
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-5 pb-24 sm:px-6 sm:py-6">
        {children}
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 text-xs text-slate-400 sm:px-6">EventSphere · Judge workspace</div>
      </footer>
    </div>
  );
}

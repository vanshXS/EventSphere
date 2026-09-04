import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Users, Loader2, AlertCircle } from "lucide-react";
import { createTeam } from "../teamApi";

export default function CreateTeamModal({ isOpen, onClose, onTeamCreated }) {
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTeamName("");
      setError("");
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setError("Please enter a valid team name.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const newTeam = await createTeam(teamName.trim());
      if (onTeamCreated) {
        onTeamCreated(newTeam);
      }
      onClose();
    } catch (err) {
      console.error("Failed to create team:", err);
      setError(err.response?.data?.message || "Failed to create team. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Create New Team</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Team Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Code Warriors, Cyber Knights"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
            <p className="text-xs text-slate-500 mt-1">
              You will automatically become the creator, leader, and first member of this team.
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !teamName.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Create Team</span>
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

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  X, 
  Calendar, 
  Clock, 
  Users, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  PlusCircle, 
  ShieldCheck 
} from "lucide-react";
import { registerForActivity } from "../registrationApi";
import { getMyTeams } from "../../teams/teamApi";
import CreateTeamModal from "../../teams/components/CreateTeamModal";
import { formatDateTime } from "../../events/utils/eventHelpers";
import { isRegistrationOpen, isEnded } from "../../activities/utils/activityHelpers";

export default function ActivityRegistrationModal({
  isOpen,
  activity,
  onClose,
  onRegistered
}) {
  const [selectedType, setSelectedType] = useState("INDIVIDUAL"); // 'INDIVIDUAL' | 'TEAM'
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);

  useEffect(() => {
    if (isOpen && activity) {
      setError("");
      setSuccess(false);
      
      // Default selection based on activity registrationType
      if (activity.registrationType === "TEAM") {
        setSelectedType("TEAM");
      } else {
        setSelectedType("INDIVIDUAL");
      }

      // Fetch teams if activity allows TEAM or BOTH
      if (activity.registrationType === "TEAM" || activity.registrationType === "BOTH") {
        fetchTeams();
      }

      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, activity]);

  const fetchTeams = async () => {
    try {
      setLoadingTeams(true);
      const userTeams = await getMyTeams();
      setTeams(userTeams);
      if (userTeams.length > 0) {
        setSelectedTeamId(userTeams[0].id);
      }
    } catch (err) {
      console.error("Failed to load user teams:", err);
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleTeamCreated = (newTeam) => {
    setTeams((prev) => [newTeam, ...prev]);
    setSelectedTeamId(newTeam.id);
  };

  if (!isOpen || !activity) return null;

  const isTeamRequired = activity.registrationType === "TEAM";
  const isBothSupported = activity.registrationType === "BOTH";

  const getTeamMemberCount = (t) => {
    if (!t) return 0;
    if (typeof t.memberCounts === "number") return t.memberCounts;
    if (typeof t.memberCount === "number") return t.memberCount;
    if (Array.isArray(t.members)) return t.members.length;
    if (Array.isArray(t.memberIds)) return t.memberIds.length;
    if (Array.isArray(t.membersId)) return t.membersId.length;
    return 1;
  };

  const activeSelectedTeam = teams.find((t) => t.id === selectedTeamId);
  const activeTeamMemberCount = getTeamMemberCount(activeSelectedTeam);
  const minRequired = activity.minTeamSize != null ? Number(activity.minTeamSize) : null;
  const maxRequired = activity.maxTeamSize != null ? Number(activity.maxTeamSize) : null;

  const isTeamSizeTooSmall = Boolean(
    activeSelectedTeam && minRequired != null && activeTeamMemberCount < minRequired
  );
  const isTeamSizeTooLarge = Boolean(
    activeSelectedTeam && maxRequired != null && activeTeamMemberCount > maxRequired
  );
  const isTeamSizeInvalid = isTeamSizeTooSmall || isTeamSizeTooLarge;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isRegistrationOpen(activity)) {
      setError("Registration for this activity has closed.");
      return;
    }

    if (selectedType === "TEAM") {
      if (!selectedTeamId) {
        setError("Please select or create a team to register.");
        return;
      }
      if (isTeamSizeTooSmall) {
        setError(
          `Team "${activeSelectedTeam?.name}" has ${activeTeamMemberCount} member${activeTeamMemberCount === 1 ? "" : "s"}. This activity requires at least ${minRequired} members. Please add members to your team before registering.`
        );
        return;
      }
      if (isTeamSizeTooLarge) {
        setError(
          `Team "${activeSelectedTeam?.name}" has ${activeTeamMemberCount} members. This activity allows a maximum of ${maxRequired} members.`
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await registerForActivity(activity.id, {
        registrationType: selectedType,
        teamId: selectedType === "TEAM" ? selectedTeamId : null,
      });

      setSuccess(true);
      if (onRegistered) {
        onRegistered();
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Registration failed:", err);
      setError(
        err.response?.data?.message || "Registration failed. Please check the requirements and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSubmitting) onClose();
        }}
      >
        <div
          className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden text-left"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  Registration
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  {activity.registrationType}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                {activity.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
            {/* Quick Details */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">
                  Deadline: {formatDateTime(activity.registrationDeadline || activity.registrationDeadLine)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  Capacity: {activity.capacity ? `${activity.capacity} slots` : "Unlimited"}
                </span>
              </div>
            </div>

            {/* Success State */}
            {success ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-semibold text-sm">Successfully Registered!</div>
                  <div className="text-xs text-emerald-700 mt-0.5">
                    Your registration has been confirmed and added to My Registrations.
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Error Banner */}
                {error && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 leading-relaxed">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Mode Selector for BOTH */}
                {isBothSupported && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Select Registration Mode
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label
                        className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedType === "INDIVIDUAL"
                            ? "bg-indigo-50/60 border-indigo-300 ring-2 ring-indigo-500/20 text-indigo-900"
                            : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                        }`}
                      >
                        <input
                          type="radio"
                          name="registrationType"
                          value="INDIVIDUAL"
                          checked={selectedType === "INDIVIDUAL"}
                          onChange={() => setSelectedType("INDIVIDUAL")}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          <span>Individual</span>
                        </div>
                      </label>

                      <label
                        className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedType === "TEAM"
                            ? "bg-indigo-50/60 border-indigo-300 ring-2 ring-indigo-500/20 text-indigo-900"
                            : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                        }`}
                      >
                        <input
                          type="radio"
                          name="registrationType"
                          value="TEAM"
                          checked={selectedType === "TEAM"}
                          onChange={() => setSelectedType("TEAM")}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <span>Team</span>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Team Selection Section */}
                {(selectedType === "TEAM" || isTeamRequired) && (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Select Your Team <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCreateTeamModal(true)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Create New Team</span>
                      </button>
                    </div>

                    {loadingTeams ? (
                      <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                        <span>Loading your teams...</span>
                      </div>
                    ) : teams.length > 0 ? (
                      <>
                        <select
                          value={selectedTeamId}
                          onChange={(e) => setSelectedTeamId(e.target.value)}
                          required
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          {teams.map((t) => {
                            const count = getTeamMemberCount(t);
                            return (
                              <option key={t.id} value={t.id}>
                                {t.name} ({count} {count === 1 ? "member" : "members"})
                              </option>
                            );
                          })}
                        </select>

                        {isTeamSizeInvalid && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                            <div className="font-semibold flex items-center gap-1.5 text-amber-900">
                              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Team size does not meet activity requirement</span>
                            </div>
                            <p>
                              Team &ldquo;{activeSelectedTeam?.name}&rdquo; has {activeTeamMemberCount} {activeTeamMemberCount === 1 ? "member" : "members"}.
                              {minRequired != null && maxRequired != null && (
                                <> Required: <strong>{minRequired} to {maxRequired}</strong> members.</>
                              )}
                              {minRequired != null && maxRequired == null && (
                                <> Minimum required: <strong>{minRequired}</strong> members.</>
                              )}
                              {" "}Please add more members in <em>My Teams</em> before registering.
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-2">
                        <p>You are not currently in any team. Create a team first to register for this activity.</p>
                        <button
                          type="button"
                          onClick={() => setShowCreateTeamModal(true)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-xs cursor-pointer transition-colors"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Create Team Now</span>
                        </button>
                      </div>
                    )}

                    {activity.minTeamSize && (
                      <p className="text-[11px] text-slate-500">
                        Required team size: {activity.minTeamSize} – {activity.maxTeamSize} members.
                      </p>
                    )}
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !isRegistrationOpen(activity) ||
                      (selectedType === "TEAM" && (teams.length === 0 || isTeamSizeInvalid))
                    }
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Registering...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>
                          {selectedType === "TEAM" ? "Confirm Team Registration" : "Confirm Registration"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>

      {/* Embedded Create Team Modal */}
      <CreateTeamModal
        isOpen={showCreateTeamModal}
        onClose={() => setShowCreateTeamModal(false)}
        onTeamCreated={handleTeamCreated}
      />
    </>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
}

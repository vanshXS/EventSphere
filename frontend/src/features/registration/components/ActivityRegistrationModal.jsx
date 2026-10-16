import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";
import {
  X,
  Loader2,
  PlusCircle,
  AlertCircle
} from "lucide-react";

import { registerForActivity } from "../registrationApi";
import { getMyTeams } from "../../teams/teamApi";
import { useAuth } from "../../auth/AuthContext";
import CreateTeamModal from "../../teams/components/CreateTeamModal";

import { formatDateTime } from "../../events/utils/eventHelpers";
import { isRegistrationOpen } from "../../activities/utils/activityHelpers";

import { getRegistrationMessage } from "../utils/registrationHelpers";
import RegistrationStatusBadge from "./RegistrationStatusBadge";

function getTeamMemberCount(team) {
  if (!team) return null;

  if (typeof team.memberCounts === "number") return team.memberCounts;
  if (typeof team.memberCount === "number") return team.memberCount;

  for (const property of ["members", "memberIds", "membersId"]) {
    if (Array.isArray(team[property])) {
      return team[property].length;
    }
  }

  return null;
}

export default function ActivityRegistrationModal({
  isOpen,
  activity,
  onClose,
  onRegistered
}) {
  if (!isOpen || !activity) return null;

  return createPortal(
    <RegistrationForm
      key={activity.id}
      activity={activity}
      onClose={onClose}
      onRegistered={onRegistered}
    />,
    document.body
  );
}

function RegistrationForm({
  activity,
  onClose,
  onRegistered
}) {
  const allowsTeams =
    activity.registrationType === "TEAM" ||
    activity.registrationType === "BOTH";

  const [selectedType, setSelectedType] = useState(
    activity.registrationType === "TEAM" ? "TEAM" : "INDIVIDUAL"
  );

  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(allowsTeams);
  const [teamError, setTeamError] = useState("");
  const [teamReloadKey, setTeamReloadKey] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);

  const submitting = useRef(false);

  useEffect(() => {
    if (!allowsTeams) return;

    let ignore = false;

    getMyTeams()
      .then((data) => {
        if (ignore) return;

        setTeams(data);
        setSelectedTeamId((previous) =>
          data.some((team) => team.id === previous)
            ? previous
            : data[0]?.id || ""
        );
        setTeamError("");
      })
      .catch((err) => {
        if (!ignore) {
          setTeamError(
            err.response?.data?.message ||
              "Could not load your teams."
          );
        }
      })
      .finally(() => {
        if (!ignore) setLoadingTeams(false);
      });

    return () => {
      ignore = true;
    };
  }, [allowsTeams, teamReloadKey]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.key === "Escape" &&
        !isSubmitting &&
        !showCreateTeamModal
      ) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSubmitting, showCreateTeamModal, onClose]);

  const closeTeamModal = useCallback(() => {
    setShowCreateTeamModal(false);
  }, []);

  const handleTeamCreated = (team) => {
    setTeams((previous) => [
      team,
      ...previous.filter((item) => item.id !== team.id)
    ]);
    setSelectedTeamId(team.id);
    setTeamError("");
  };

  const refreshTeams = () => {
    setLoadingTeams(true);
    setTeamError("");
    setTeamReloadKey((previous) => previous + 1);
  };

  const { user } = useAuth();
  const currentUserId = user?.userId || user?.id;

  const isLeaderOfTeam = (team) => {
    if (!team) return false;
    return Boolean(
      team.leaderId === currentUserId ||
      team.leaderId === user?.email ||
      (team.members && team.members.some(m => (m.userId === currentUserId || m.email === user?.email) && m.leader))
    );
  };

  const selectedTeam = teams.find(
    (team) => team.id === selectedTeamId
  );

  const isLeader = selectedTeam ? isLeaderOfTeam(selectedTeam) : true;

  const memberCount = getTeamMemberCount(selectedTeam);

  const tooSmall =
    memberCount != null &&
    activity.minTeamSize != null &&
    memberCount < Number(activity.minTeamSize);

  const tooLarge =
    memberCount != null &&
    activity.maxTeamSize != null &&
    memberCount > Number(activity.maxTeamSize);

  const invalidTeamSize = tooSmall || tooLarge;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting.current || success) return;

    setError("");

    if (!isRegistrationOpen(activity)) {
      setError("Registration for this activity has closed.");
      return;
    }

    if (selectedType === "TEAM") {
      if (!selectedTeamId || !selectedTeam) {
        setError("Select a team before registering.");
        return;
      }

      if (!isLeader) {
        setError("Only the team leader can register this team for an activity.");
        return;
      }

      if (invalidTeamSize) {
        setError(
          tooSmall
            ? `Your team needs at least ${activity.minTeamSize} members.`
            : `Your team cannot have more than ${activity.maxTeamSize} members.`
        );
        return;
      }
    }

    submitting.current = true;
    setIsSubmitting(true);

    let registration;

    try {
      registration = await registerForActivity(activity.id, {
        registrationType: selectedType,
        teamId: selectedType === "TEAM" ? selectedTeamId : null
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not confirm registration. Check My Registrations before trying again."
      );
      return;
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }

    setSuccess(registration);
    onRegistered?.(registration);
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="registration-title"
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs"
        onClick={(event) => {
          if (
            event.target === event.currentTarget &&
            !isSubmitting &&
            !showCreateTeamModal
          ) {
            onClose();
          }
        }}
      >
        <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <header className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/50 p-5">
            <div>
              <p className="text-xs font-semibold text-indigo-600">
                Activity registration
              </p>
              <h2
                id="registration-title"
                className="mt-1 text-xl font-bold text-slate-900"
              >
                {activity.name}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Close registration form"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <form
            onSubmit={handleSubmit}
            className="space-y-5 overflow-y-auto p-5"
          >
            <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs text-slate-600">
              <p>
                Deadline:{" "}
                {formatDateTime(
                  activity.registrationDeadline ||
                    activity.registrationDeadLine
                )}
              </p>

              <p>
                Entry limit:{" "}
                {activity.capacity == null
                  ? "Unlimited"
                  : activity.capacity}
              </p>
            </div>

            {success ? (
              <div className="space-y-4">
                <div
                  role="status"
                  className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <RegistrationStatusBadge status={success.status} />

                  <p className="text-sm text-slate-700">
                    {getRegistrationMessage(success)}
                  </p>

                  <p className="text-xs text-slate-500">
                    You can track this entry in My Registrations.
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
                {activity.requiresApproval === true ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    Your request needs organizer approval before your
                    participation is confirmed.
                  </p>
                ) : activity.requiresApproval == null ? (
                  <p className="text-xs text-slate-500">
                    Some activities require organizer approval. Your
                    status will be shown after submission.
                  </p>
                ) : null}

                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {activity.registrationType === "BOTH" && (
                  <fieldset className="space-y-2">
                    <legend className="mb-2 text-xs font-semibold text-slate-700">
                      How would you like to participate?
                    </legend>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ["INDIVIDUAL", "Individual"],
                        ["TEAM", "Team"]
                      ].map(([value, label]) => (
                        <label
                          key={value}
                          className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm ${
                            selectedType === value
                              ? "border-indigo-300 bg-indigo-50 text-indigo-900"
                              : "border-slate-200 text-slate-700"
                          }`}
                        >
                          <input
                            type="radio"
                            name="registrationType"
                            value={value}
                            checked={selectedType === value}
                            disabled={isSubmitting}
                            onChange={() => {
                              setSelectedType(value);
                              setError("");
                            }}
                            className="accent-indigo-600"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}

                {selectedType === "TEAM" && (
                  <section className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label
                        htmlFor="registration-team"
                        className="text-xs font-semibold text-slate-700"
                      >
                        Your team
                      </label>

                      <button
                        type="button"
                        disabled={isSubmitting || loadingTeams}
                        onClick={() => setShowCreateTeamModal(true)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 disabled:opacity-50"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        Create team
                      </button>
                    </div>

                    {loadingTeams ? (
                      <p className="flex items-center gap-2 text-xs text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading your teams...
                      </p>
                    ) : teamError ? (
                      <div
                        role="alert"
                        className="rounded-lg bg-rose-50 p-3 text-xs text-rose-800"
                      >
                        <p>{teamError}</p>
                        <button
                          type="button"
                          onClick={refreshTeams}
                          className="mt-2 font-semibold underline"
                        >
                          Retry
                        </button>
                      </div>
                    ) : teams.length === 0 ? (
                      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        You are not in a team yet. Create a team and add
                        the required members before registering.
                      </p>
                    ) : (
                      <>
                        <select
                          id="registration-team"
                          value={selectedTeamId}
                          disabled={isSubmitting}
                          onChange={(event) => {
                            setSelectedTeamId(event.target.value);
                            setError("");
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Select a team</option>
                          {teams.map((team) => {
                            const count = getTeamMemberCount(team);
                            const userIsLeader = isLeaderOfTeam(team);

                            return (
                              <option key={team.id} value={team.id}>
                                {team.name}
                                {count != null
                                  ? ` (${count} members)`
                                  : ""}
                                {userIsLeader ? " • (Leader)" : " • [Leader only]"}
                              </option>
                            );
                          })}
                        </select>

                        <button
                          type="button"
                          onClick={refreshTeams}
                          disabled={isSubmitting}
                          className="text-xs font-medium text-indigo-600"
                        >
                          Refresh teams
                        </button>
                      </>
                    )}

                    {(activity.minTeamSize != null ||
                      activity.maxTeamSize != null) && (
                      <p className="text-xs text-slate-500">
                        Team size: minimum{" "}
                        {activity.minTeamSize ?? "not specified"},
                        maximum {activity.maxTeamSize ?? "not specified"}.
                      </p>
                    )}

                    {selectedTeam && !isLeader && (
                      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        You are a member of "{selectedTeam.name}", but only the team leader can register this team for an activity.
                      </p>
                    )}

                    {invalidTeamSize && (
                      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        Your selected team has {memberCount} members.
                        Update its membership in My Teams to meet this
                        activity’s limits.
                      </p>
                    )}
                  </section>
                )}

                <footer className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !isRegistrationOpen(activity) ||
                      (selectedType === "TEAM" &&
                        (loadingTeams ||
                          !selectedTeam ||
                          !isLeader ||
                          invalidTeamSize))
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}

                    {isSubmitting
                      ? "Submitting..."
                      : selectedType === "TEAM"
                      ? "Submit Team Registration"
                      : "Submit Registration"}
                  </button>
                </footer>
              </>
            )}
          </form>
        </div>
      </div>

      <CreateTeamModal
        isOpen={showCreateTeamModal}
        onClose={closeTeamModal}
        onTeamCreated={handleTeamCreated}
      />
    </>
  );
}
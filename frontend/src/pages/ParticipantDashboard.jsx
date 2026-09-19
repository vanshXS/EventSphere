import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Plus,
  RefreshCw,
  X
} from "lucide-react";

import { useAuth } from "../features/auth/AuthContext";

import {
  getVisibleEvents,
  getVisibleStandaloneActivities,
  getMyRegistrations,
  cancelRegistration,
  registerForEvent
} from "../features/registration/registrationApi";
import { getMyVolunteerAssignments } from "../features/attendance/attendanceApi";

import {
  isActiveRegistration,
  getActivityRegistration,
  getRegistrationMessage
} from "../features/registration/utils/registrationHelpers";

import { getMyTeams } from "../features/teams/teamApi";

import ParticipantHeader from "../features/registration/components/ParticipantHeader";
import ParticipantEventTable from "../features/registration/components/ParticipantEventTable";
import MyRegistrationsTable from "../features/registration/components/MyRegistrationsTable";
import ActivityRegistrationModal from "../features/registration/components/ActivityRegistrationModal";

import EventDetailsModal from "../features/events/components/EventDetailsModal";
import ActivityDetailsModal from "../features/activities/components/ActivityDetailsModal";

import MyTeamsList from "../features/teams/components/MyTeamsList";
import CreateTeamModal from "../features/teams/components/CreateTeamModal";

export default function ParticipantDashboard() {
  const { user, logoutUser } = useAuth();

  const [activeTab, setActiveTab] = useState("EXPLORE");

  const [events, setEvents] = useState([]);
  const [standaloneActivities, setStandaloneActivities] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [myTeams, setMyTeams] = useState([]);
  const [volunteerAssignments, setVolunteerAssignments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadVersion, setLoadVersion] = useState(0);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [refreshingRegistrations, setRefreshingRegistrations] =
    useState(false);

  const [cancellingId, setCancellingId] = useState(null);

  const [selectedEventForDetails, setSelectedEventForDetails] =
    useState(null);

  const [selectedActivityForDetails, setSelectedActivityForDetails] =
    useState(null);

  const [selectedActivityForReg, setSelectedActivityForReg] =
    useState(null);

  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);

  const cancellationLock = useRef(false);
  const refreshLock = useRef(false);

  useEffect(() => {
    let ignore = false;

    Promise.all([
      getVisibleEvents(),
      getVisibleStandaloneActivities(),
      getMyRegistrations(),
      getMyTeams(),
      getMyVolunteerAssignments()
    ])
      .then(([eventsData, activitiesData, registrationsData, teamsData, assignmentsData]) => {
        if (ignore) return;

        setEvents(eventsData);
        setStandaloneActivities(activitiesData);
        setMyRegistrations(registrationsData);
        setMyTeams(teamsData);
        setVolunteerAssignments(assignmentsData);
        setError("");
      })
      .catch((err) => {
        if (!ignore) {
          setError(
            err.response?.data?.message ||
              "Could not load your dashboard. Please try again."
          );
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [loadVersion]);

  const closeEventDetails = useCallback(() => {
    setSelectedEventForDetails(null);
  }, []);

  const closeActivityDetails = useCallback(() => {
    setSelectedActivityForDetails(null);
  }, []);

  const closeRegistration = useCallback(() => {
    setSelectedActivityForReg(null);
  }, []);

  const closeCreateTeam = useCallback(() => {
    setShowCreateTeamModal(false);
  }, []);

  const retryLoad = () => {
    setLoading(true);
    setError("");
    setLoadVersion((previous) => previous + 1);
  };

  const handleRegistrationSuccess = (registration) => {
    setError("");

    setMyRegistrations((previous) => [
      registration,
      ...previous.filter((item) => item.id !== registration.id)
    ]);

    setSuccessMessage(getRegistrationMessage(registration));
  };

  const handleEventRegistrationSuccess = (registration) => {
    setError("");

    setMyRegistrations((previous) => [
      registration,
      ...previous.filter((item) => item.id !== registration.id)
    ]);

    setSuccessMessage("Event registration created. Your event QR ticket is ready.");
  };

  const handleRegisterForEvent = async (event) => {
    try {
      const registration = await registerForEvent(event.id);
      handleEventRegistrationSuccess(registration);
      setSelectedEventForDetails(null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not register for this event."
      );
    }
  };

  const refreshRegistrations = async () => {
    if (refreshLock.current || cancellationLock.current) return;

    refreshLock.current = true;
    setRefreshingRegistrations(true);
    setError("");

    try {
      const registrations = await getMyRegistrations();
      setMyRegistrations(registrations);
      setSuccessMessage("Registration statuses updated.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not refresh registrations. Please try again."
      );
    } finally {
      refreshLock.current = false;
      setRefreshingRegistrations(false);
    }
  };

  const handleCancelRegistration = async (registration) => {
    if (cancellationLock.current || refreshLock.current) {
      return { success: false, message: "Action in progress. Please wait." };
    }

    cancellationLock.current = true;
    setCancellingId(registration.id);
    setError("");

    try {
      const updated = await cancelRegistration(registration);

      setMyRegistrations((previous) =>
        previous.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                ...updated,
                registrationKind:
                  updated.registrationKind || item.registrationKind
              }
            : item
        )
      );

      setSuccessMessage("Registration cancelled.");
      return { success: true };
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Could not cancel registration. Refresh the list before trying again.";
      setError(msg);

      return { success: false, message: msg };
    } finally {
      cancellationLock.current = false;
      setCancellingId(null);
    }
  };

  const handleTeamCreated = (team) => {
    setMyTeams((previous) => [
      team,
      ...previous.filter((item) => item.id !== team.id)
    ]);

    setSuccessMessage(`Team "${team.name}" created.`);
  };

  const handleTeamUpdated = (team) => {
    setMyTeams((previous) =>
      previous.map((item) => (item.id === team.id ? team : item))
    );

    setSuccessMessage(`Team "${team.name}" updated.`);
  };

  const showMyRegistrations = () => {
    setActiveTab("MY_REGISTRATIONS");
  };

  const activeRegistrationsCount = myRegistrations.filter(
    isActiveRegistration
  ).length;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans">
      <ParticipantHeader
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeRegistrationsCount={activeRegistrationsCount}
        teamsCount={myTeams.length}
        volunteerAssignmentsCount={volunteerAssignments.length}
        onLogout={logoutUser}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {successMessage && (
          <div
            role="status"
            className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span className="flex-1">{successMessage}</span>

            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              aria-label="Dismiss message"
              className="rounded p-0.5 hover:bg-emerald-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />

            <div className="flex-1 space-y-2">
              <p>{error}</p>

              {!loading && (
                <button
                  type="button"
                  onClick={retryLoad}
                  disabled={
                    Boolean(cancellingId) || refreshingRegistrations
                  }
                  className="font-semibold underline disabled:opacity-50"
                >
                  Reload dashboard
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
              className="rounded p-0.5 hover:bg-rose-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm">Loading EventSphere...</p>
          </div>
        ) : (
          <>
            {activeTab === "EXPLORE" && (
              <section className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    Explore Events & Competitions
                  </h1>
                  <p className="mt-1 text-xs text-slate-500">
                    Browse activities, read the rules and choose how
                    you want to participate.
                  </p>
                </div>

                <ParticipantEventTable
                  events={events}
                  standaloneActivities={standaloneActivities}
                  myRegistrations={myRegistrations}
                  onSelectEvent={setSelectedEventForDetails}
                  onSelectActivity={setSelectedActivityForDetails}
                  onRegisterActivity={setSelectedActivityForReg}
                  onViewMyRegistrations={showMyRegistrations}
                />
              </section>
            )}

            {activeTab === "MY_REGISTRATIONS" && (
              <section className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                      My Registrations
                    </h1>
                    <p className="mt-1 text-xs text-slate-500">
                      Track approval decisions, read organizer notes,
                      and manage your entries.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={refreshRegistrations}
                    disabled={
                      refreshingRegistrations || Boolean(cancellingId)
                    }
                    className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        refreshingRegistrations ? "animate-spin" : ""
                      }`}
                    />
                    {refreshingRegistrations
                      ? "Refreshing..."
                      : "Refresh registrations"}
                  </button>
                </div>

                <MyRegistrationsTable
                  registrations={myRegistrations}
                  events={events}
                  standaloneActivities={standaloneActivities}
                  myTeams={myTeams}
                  cancellingId={cancellingId}
                  currentUser={user}
                  onCancelRegistration={handleCancelRegistration}
                  onBrowseEvents={() => setActiveTab("EXPLORE")}
                />
              </section>
            )}

            {activeTab === "MY_TEAMS" && (
              <section className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                      My Teams
                    </h1>
                    <p className="mt-1 text-xs text-slate-500">
                      Manage your teams and their membership.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCreateTeamModal(true)}
                    className="inline-flex items-center gap-2 self-start rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4" />
                    Create Team
                  </button>
                </div>

                <MyTeamsList
                  teams={myTeams}
                  user={user}
                  onCreateTeamClick={() => setShowCreateTeamModal(true)}
                  onTeamUpdated={handleTeamUpdated}
                />
              </section>
            )}
          </>
        )}
      </main>

      <EventDetailsModal
        isOpen={Boolean(selectedEventForDetails)}
        event={selectedEventForDetails}
        myRegistrations={myRegistrations}
        onClose={closeEventDetails}
        onRegisterActivity={setSelectedActivityForReg}
        onRegisterEvent={handleRegisterForEvent}
        onViewActivityDetails={setSelectedActivityForDetails}
        onViewMyRegistrations={showMyRegistrations}
      />

      <ActivityDetailsModal
        isOpen={Boolean(selectedActivityForDetails)}
        activity={selectedActivityForDetails}
        registration={getActivityRegistration(
          myRegistrations,
          selectedActivityForDetails?.id
        )}
        onRegisterClick={setSelectedActivityForReg}
        onClose={closeActivityDetails}
      />

      <ActivityRegistrationModal
        isOpen={Boolean(selectedActivityForReg)}
        activity={selectedActivityForReg}
        onClose={closeRegistration}
        onRegistered={handleRegistrationSuccess}
      />

      <CreateTeamModal
        isOpen={showCreateTeamModal}
        onClose={closeCreateTeam}
        onTeamCreated={handleTeamCreated}
      />
    </div>
  );
}
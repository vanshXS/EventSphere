import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import {
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck
} from "lucide-react";

import { useAuth } from "../features/auth/AuthContext";
import { getMyAffiliationStatus } from "../features/auth/authApi";
import StudentAffiliationModal from "../features/auth/components/StudentAffiliationModal";

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

import MyCertificates from "../features/certificates/MyCertificates";
import ParticipantHeader from "../features/registration/components/ParticipantHeader";
import ParticipantEventTable from "../features/registration/components/ParticipantEventTable";
import MyRegistrationsTable from "../features/registration/components/MyRegistrationsTable";
import ActivityRegistrationModal from "../features/registration/components/ActivityRegistrationModal";

import EventDetailsModal from "../features/events/components/EventDetailsModal";
import ActivityDetailsModal from "../features/activities/components/ActivityDetailsModal";

import MyTeamsList from "../features/teams/components/MyTeamsList";
import CreateTeamModal from "../features/teams/components/CreateTeamModal";
import ParticipantLeaderboard from "../features/judging/components/ParticipantLeaderboard";
import { useToast } from "../components/common/ToastContext";

export default function ParticipantDashboard() {
  const { user, updateUser, logoutUser } = useAuth();
  const addToast = useToast();

  const [activeTab, setActiveTab] = useState("EXPLORE");
  const [selectedResultActivityId, setSelectedResultActivityId] = useState(null);
  const [isAffiliationModalOpen, setIsAffiliationModalOpen] = useState(false);

  const [events, setEvents] = useState([]);
  const [standaloneActivities, setStandaloneActivities] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [myTeams, setMyTeams] = useState([]);
  const [volunteerAssignments, setVolunteerAssignments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadVersion, setLoadVersion] = useState(0);
  const setError = (message) => {
    if (message) addToast(message, "error");
  };
  const setSuccessMessage = (message) => {
    if (message) addToast(message, "success");
  };

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
      getMyVolunteerAssignments(),
      getMyAffiliationStatus().catch(() => null)
    ])
      .then(([eventsData, activitiesData, registrationsData, teamsData, assignmentsData, affiliationData]) => {
        if (ignore) return;


        const sortByNewest = (list) =>
          (Array.isArray(list) ? list : []).slice().sort((a, b) => {
            const timeA = Date.parse(a.createdAt || a.startDateTime || 0);
            const timeB = Date.parse(b.createdAt || b.startDateTime || 0);
            return timeB - timeA;
          });

        const sortRegistrationsByNewest = (list) =>
          (Array.isArray(list) ? list : []).slice().sort((a, b) => {
            const timeA = Date.parse(a.registeredAt || a.createdAt || 0);
            const timeB = Date.parse(b.registeredAt || b.createdAt || 0);
            return timeB - timeA;
          });

        setEvents(sortByNewest(eventsData));
        setStandaloneActivities(sortByNewest(activitiesData));
        setMyRegistrations(sortRegistrationsByNewest(registrationsData));
        setMyTeams(teamsData);
        setVolunteerAssignments(assignmentsData);
      })
      .catch((err) => {
        if (!ignore) {
          const message = err.response?.data?.message ||
            "Could not load your dashboard. Please try again.";
          addToast(message, "error", {
            actionLabel: "Reload dashboard",
            onAction: () => {
              setLoading(true);
              setLoadVersion((previous) => previous + 1);
            }
          });
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [loadVersion, addToast]);

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

  const handleRegistrationSuccess = (registration) => {

    setMyRegistrations((previous) => [
      registration,
      ...previous.filter((item) => item.id !== registration.id)
    ]);

    setSuccessMessage(getRegistrationMessage(registration));
  };

  const handleEventRegistrationSuccess = (registration) => {

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
      const msg = err.response?.data?.message || "Could not register for this event.";
      setError(msg);
      if (
        msg.toLowerCase().includes("college") ||
        msg.toLowerCase().includes("affiliat") ||
        msg.toLowerCase().includes("verification")
      ) {
        addToast(
          "College verification required to register for this event.",
          "error",
          {
            actionLabel: "Verify College Affiliation",
            onAction: () => setIsAffiliationModalOpen(true)
          }
        );
      }
    }
  };

  const refreshRegistrations = async () => {
    if (refreshLock.current || cancellationLock.current) return;

    refreshLock.current = true;
    setRefreshingRegistrations(true);

    try {
      const registrations = await getMyRegistrations();
      const sortRegistrationsByNewest = (list) =>
        (Array.isArray(list) ? list : []).slice().sort((a, b) => {
          const timeA = Date.parse(a.registeredAt || a.createdAt || 0);
          const timeB = Date.parse(b.registeredAt || b.createdAt || 0);
          return timeB - timeA;
        });
      setMyRegistrations(sortRegistrationsByNewest(registrations));
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

  const handleTeamDeleted = (teamId) => {
    setMyTeams((previous) => previous.filter((item) => item.id !== teamId));
    setSuccessMessage("Team deleted successfully.");
  };

  const showMyRegistrations = () => {
    setActiveTab("MY_REGISTRATIONS");
  };

  const handleViewResults = (activityId) => {
    setSelectedResultActivityId(activityId || null);
    setActiveTab("RESULTS");
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
        onOpenAffiliationModal={() => setIsAffiliationModalOpen(true)}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* College Affiliation Status Alert Banner */}
        {user?.collegeVerificationStatus !== "VERIFIED" && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {user?.collegeVerificationStatus === "PENDING"
                    ? "College Affiliation Under Review"
                    : "Verify Your College Affiliation"}
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  {user?.collegeVerificationStatus === "PENDING"
                    ? "Your institutional affiliation is pending verification by your College Admin. College-exclusive events will unlock once approved."
                    : "Some campus competitions and events are restricted to verified students. Verify your affiliation to get full access."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAffiliationModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 cursor-pointer transition-colors shadow-2xs"
            >
              {user?.collegeVerificationStatus === "PENDING" ? "View Status" : "Verify Now"}
            </button>
          </div>
        )}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm font-medium">Loading your dashboard...</p>
          </div>
        ) : (
          <>
            {activeTab === "EXPLORE" && (
              <section className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    Explore Events & Competitions
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
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
                    <p className="mt-1 text-sm text-slate-500">
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
                    className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        refreshingRegistrations ? "animate-spin" : ""
                      }`}
                    />
                    {refreshingRegistrations
                      ? "Refreshing..."
                      : "Refresh"}
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
                  onViewResults={handleViewResults}
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
                    <p className="mt-1 text-sm text-slate-500">
                      Manage your teams and their membership.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCreateTeamModal(true)}
                    className="inline-flex items-center gap-2 self-start rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 shadow-sm cursor-pointer transition-colors"
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
                  onTeamDeleted={handleTeamDeleted}
                />
              </section>
            )}

            {activeTab === "CERTIFICATES" && <MyCertificates />}

            {activeTab === "RESULTS" && (
              <ParticipantLeaderboard
                myRegistrations={myRegistrations}
                selectedActivityId={selectedResultActivityId}
                onBrowseEvents={() => setActiveTab("EXPLORE")}
                onClearSelectedActivity={() => setSelectedResultActivityId(null)}
              />
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

      <StudentAffiliationModal
        isOpen={isAffiliationModalOpen}
        onClose={() => setIsAffiliationModalOpen(false)}
      />
    </div>
  );
}
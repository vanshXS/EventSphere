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
  ShieldCheck,
  X
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
import ParticipantLeaderboard from "../features/judging/components/ParticipantLeaderboard";
import { useToast } from "../components/common/ToastContext";
import { getAllMyCertificates } from "../features/certificates/certificateApi";
import { getParticipantLeaderboardResults } from "../features/judging/api/judgingApi";
import "../styles/participant-experience.css";

export default function ParticipantDashboard() {
  const { user, updateUser, logoutUser } = useAuth();
  const navigate = useNavigate();
  const addToast = useToast();

  const [activeTab, setActiveTab] = useState(() => { const requestedTab = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("tab"); return ["EXPLORE", "MY_REGISTRATIONS", "MY_TEAMS"].includes(requestedTab) ? requestedTab : "EXPLORE"; });
  const [selectedResultActivityId, setSelectedResultActivityId] = useState(null);
  const [isAffiliationModalOpen, setIsAffiliationModalOpen] = useState(false);

  const [events, setEvents] = useState([]);
  const [standaloneActivities, setStandaloneActivities] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [myTeams, setMyTeams] = useState([]);
  const [volunteerAssignments, setVolunteerAssignments] = useState([]);

  const [myCertificates, setMyCertificates] = useState([]);
  const [publishedResults, setPublishedResults] = useState([]);

  const [resultsModalActivityId, setResultsModalActivityId] = useState(null);


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
      getMyVolunteerAssignments().catch(() => []),
      getMyAffiliationStatus().catch(() => null),
      getAllMyCertificates().catch(() => []),
      getParticipantLeaderboardResults().catch(() => [])
    ])
      .then(([eventsData, activitiesData, registrationsData, teamsData, assignmentsData, affiliationData, certsData, resultsData]) => {
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
        setMyCertificates(Array.isArray(certsData) ? certsData : []);
        setPublishedResults(Array.isArray(resultsData) ? resultsData : []);
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
      const [registrations, certsData, resultsData] = await Promise.all([
        getMyRegistrations(),
        getAllMyCertificates().catch(() => []),
        getParticipantLeaderboardResults().catch(() => [])
      ]);
      const sortRegistrationsByNewest = (list) =>
        (Array.isArray(list) ? list : []).slice().sort((a, b) => {
          const timeA = Date.parse(a.registeredAt || a.createdAt || 0);
          const timeB = Date.parse(b.registeredAt || b.createdAt || 0);
          return timeB - timeA;
        });
      setMyRegistrations(sortRegistrationsByNewest(registrations));
      setMyCertificates(Array.isArray(certsData) ? certsData : []);
      setPublishedResults(Array.isArray(resultsData) ? resultsData : []);
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
    navigate("/participant?tab=MY_REGISTRATIONS", { replace: true });
  };

  
  const handleViewResults = (activityId) => {
    setResultsModalActivityId(activityId || null);
  };

  return (
    <div className="participant-workspace flex min-h-screen flex-col bg-slate-50 font-sans">
      <ParticipantHeader
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        volunteerAssignmentsCount={volunteerAssignments.length}
        onLogout={logoutUser}
        onOpenAffiliationModal={() => setIsAffiliationModalOpen(true)}
      />

      {activeTab === "MY_REGISTRATIONS" && user?.collegeName && (
        <div className="px-4 pt-4 md:hidden">
          <button
            type="button"
            onClick={() => setIsAffiliationModalOpen(true)}
            disabled={user?.collegeVerificationStatus === "VERIFIED"}
            className="flex w-full items-center justify-between gap-3 rounded-xl bg-indigo-50 px-4 py-3 text-left disabled:cursor-default"
            aria-label="College affiliation status"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-indigo-100 text-indigo-700">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Campus · {user?.collegeCode || "Participant"}
                </span>
                <span className="mt-0.5 block truncate text-sm font-medium text-slate-900">{user.collegeName}</span>
              </span>
            </span>
            <span className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${user?.collegeVerificationStatus === "VERIFIED" ? "bg-white text-emerald-700" : "bg-white text-amber-700"}`}>
              {user?.collegeVerificationStatus === "VERIFIED" ? "Verified" : user?.collegeVerificationStatus === "PENDING" ? "Pending" : "Verify"}
            </span>
          </button>
        </div>
      )}

      <main className="participant-main mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* College Affiliation Status Alert Banner */}
        {user?.collegeVerificationStatus !== "VERIFIED" && (
          <div className="participant-affiliation-alert mb-6 hidden rounded-xl border p-4 md:flex md:flex-row md:items-center md:justify-between md:gap-3">
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
              <section className="participant-page participant-discover-page space-y-6">
                <div className="participant-page-heading">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-indigo-600">Participant</p>
                  <h1 className="text-2xl font-bold text-slate-900">
                    Discover events
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Find events and competitions happening around your campus.
                  </p>
                </div>

                <ParticipantEventTable
                  events={events}
                  standaloneActivities={standaloneActivities}
                  myRegistrations={myRegistrations}
                  onSelectEvent={setSelectedEventForDetails}
                  onSelectActivity={setSelectedActivityForDetails}
                />
              </section>
            )}

            {activeTab === "MY_REGISTRATIONS" && (
              <section className="participant-page participant-registrations-page space-y-6">
                <div className="participant-page-heading flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-indigo-600">Participant hub</p>
                    <h1 className="text-2xl font-bold text-slate-900">
                      My Registrations
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                      Track approval decisions, access your entry tickets, and view published competition results.
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
                  publishedResults={publishedResults}
                  certificates={myCertificates}
                  currentUser={user}
                  onCancelRegistration={handleCancelRegistration}
                  onBrowseEvents={() => setActiveTab("EXPLORE")}
                  onViewResults={handleViewResults}
                />
              </section>
            )}

            {activeTab === "MY_TEAMS" && (
              <section className="participant-page participant-teams-page">
                <MyTeamsList
                  teams={myTeams}
                  user={user}
                  onCreateTeamClick={() => setShowCreateTeamModal(true)}
                  onTeamUpdated={handleTeamUpdated}
                  onTeamDeleted={handleTeamDeleted}
                />
              </section>
            )}

          </>
        )}
      </main>

      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} EventSphere Platform. Designed for campus innovation.
      </footer>

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
        onViewMyRegistrations={showMyRegistrations}
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

      {resultsModalActivityId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={(e) =>  {
            if(e.target === e.currentTarget)
              setResultsModalActivityId(null);
          }}    
        >
          <div className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-auto p-6">
            <button
            type="button"
            onClick={() => setResultsModalActivityId(null)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
                  <X/>
            </button>

            <ParticipantLeaderboard
                 myRegistrations={myRegistrations}
                 selectedActivityId={resultsModalActivityId}
                 onBrowseEvents={() => {
                  setResultsModalActivityId(null);
                  setActiveTab("EXPLORE");
                 }}
                 onClearSelectedActivity={() => setResultsModalActivityId(null)}
            />
            </div>
          </div>
      )}
    </div>
  );
}
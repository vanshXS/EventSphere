import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../features/auth/AuthContext";
import { 
  getVisibleEvents, 
  getVisibleStandaloneActivities,
  getMyRegistrations, 
  cancelRegistration 
} from "../features/registration/registrationApi";
import { getMyTeams } from "../features/teams/teamApi";
import ParticipantHeader from "../features/registration/components/ParticipantHeader";
import ParticipantEventTable from "../features/registration/components/ParticipantEventTable";
import MyRegistrationsTable from "../features/registration/components/MyRegistrationsTable";
import MyTeamsList from "../features/teams/components/MyTeamsList";
import EventDetailsModal from "../features/events/components/EventDetailsModal";
import ActivityDetailsModal from "../features/activities/components/ActivityDetailsModal";
import ActivityRegistrationModal from "../features/registration/components/ActivityRegistrationModal";
import CreateTeamModal from "../features/teams/components/CreateTeamModal";
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Plus 
} from "lucide-react";

export default function ParticipantDashboard() {
  const { user, logoutUser } = useAuth();

  // Tab State: 'EXPLORE' | 'MY_REGISTRATIONS' | 'MY_TEAMS'
  const [activeTab, setActiveTab] = useState("EXPLORE");

  // Data State
  const [events, setEvents] = useState([]);
  const [standaloneActivities, setStandaloneActivities] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [myTeams, setMyTeams] = useState([]);

  // Loading & Feedback States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Modals & Action States
  const [selectedEventForDetails, setSelectedEventForDetails] = useState(null);
  const [selectedActivityForDetails, setSelectedActivityForDetails] = useState(null);
  const [selectedActivityForReg, setSelectedActivityForReg] = useState(null);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  // Initial Data Load
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [eventsData, standaloneData, regsData, teamsData] = await Promise.all([
        getVisibleEvents(),
        getVisibleStandaloneActivities(),
        getMyRegistrations(),
        getMyTeams()
      ]);
      setEvents(eventsData);
      setStandaloneActivities(standaloneData);
      setMyRegistrations(regsData);
      setMyTeams(teamsData);
    } catch (err) {
      console.error("Failed to load participant data:", err);
      setError(
        err.response?.data?.message || "Failed to load events. Please check your connection."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRegistrationSuccess = async () => {
    setSuccessMessage("Registration successful! Added to My Registrations.");
    const updatedRegs = await getMyRegistrations();
    setMyRegistrations(updatedRegs);
    setTimeout(() => setSuccessMessage(""), 4000);
  };

  const handleCancelRegistration = async (registrationId) => {
    if (!window.confirm("Are you sure you want to cancel this registration?")) return;
    try {
      setCancellingId(registrationId);
      await cancelRegistration(registrationId);
      setSuccessMessage("Registration cancelled successfully.");
      const updatedRegs = await getMyRegistrations();
      setMyRegistrations(updatedRegs);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      console.error("Failed to cancel registration:", err);
      setError(err.response?.data?.message || "Failed to cancel registration.");
    } finally {
      setCancellingId(null);
    }
  };

  const handleTeamCreated = (newTeam) => {
    setMyTeams((prev) => [newTeam, ...prev]);
    setSuccessMessage(`Team "${newTeam.name}" created successfully!`);
    setTimeout(() => setSuccessMessage(""), 4000);
  };

  const activeRegistrationsCount = myRegistrations.filter((r) => r.status === "REGISTERED").length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Modular Header */}
      <ParticipantHeader
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeRegistrationsCount={activeRegistrationsCount}
        teamsCount={myTeams.length}
        onLogout={logoutUser}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Flash Banners */}
        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs text-emerald-800 shadow-2xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-xs text-red-800 shadow-2xs">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="text-sm font-medium">Loading EventSphere portal...</span>
          </div>
        ) : (
          <>
            {/* TAB 1: EXPLORE EVENTS & ACTIVITIES */}
            {activeTab === "EXPLORE" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Explore Events & Competitions</h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Discover campus events and competitions. Click any row or view details to inspect rules, schedules, and register.
                  </p>
                </div>

                {/* Table View of Events & Competitions */}
                <ParticipantEventTable
                  events={events}
                  standaloneActivities={standaloneActivities}
                  myRegistrations={myRegistrations}
                  onSelectEvent={(event) => setSelectedEventForDetails(event)}
                  onSelectActivity={(activity) => setSelectedActivityForDetails(activity)}
                  onRegisterActivity={(activity) => setSelectedActivityForReg(activity)}
                  onViewMyRegistrations={() => setActiveTab("MY_REGISTRATIONS")}
                />
              </div>
            )}

            {/* TAB 2: MY REGISTRATIONS */}
            {activeTab === "MY_REGISTRATIONS" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">My Registrations</h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage your event and competition registrations. You can cancel active signups anytime before the deadline.
                  </p>
                </div>

                <MyRegistrationsTable
                  registrations={myRegistrations}
                  events={events}
                  standaloneActivities={standaloneActivities}
                  myTeams={myTeams}
                  cancellingId={cancellingId}
                  onCancelRegistration={handleCancelRegistration}
                  onBrowseEvents={() => setActiveTab("EXPLORE")}
                />
              </div>
            )}

            {/* TAB 3: MY TEAMS */}
            {activeTab === "MY_TEAMS" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">My Teams</h1>
                    <p className="text-xs text-slate-500 mt-1">
                      Manage teams you lead or participate in for team-based competitions.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateTeamModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg cursor-pointer transition-colors shadow-2xs shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Team</span>
                  </button>
                </div>

                <MyTeamsList
                  teams={myTeams}
                  user={user}
                  onCreateTeamClick={() => setShowCreateTeamModal(true)}
                  onTeamUpdated={(updatedTeam) => {
                    setMyTeams((prev) =>
                      prev.map((t) => (t.id === updatedTeam.id ? updatedTeam : t))
                    );
                    setSuccessMessage(`Team "${updatedTeam.name}" updated successfully!`);
                    setTimeout(() => setSuccessMessage(""), 4000);
                  }}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Event Details Modal */}
      <EventDetailsModal
        isOpen={Boolean(selectedEventForDetails)}
        event={selectedEventForDetails}
        myRegistrations={myRegistrations}
        onClose={() => setSelectedEventForDetails(null)}
        onRegisterActivity={(activity) => setSelectedActivityForReg(activity)}
        onViewActivityDetails={(activity) => setSelectedActivityForDetails(activity)}
      />

      {/* Activity Details Modal */}
      <ActivityDetailsModal
        isOpen={Boolean(selectedActivityForDetails)}
        activity={selectedActivityForDetails}
        isRegistered={
          selectedActivityForDetails
            ? myRegistrations.some(
                (r) => r.activityId === selectedActivityForDetails.id && r.status === "REGISTERED"
              )
            : false
        }
        onRegisterClick={(activity) => setSelectedActivityForReg(activity)}
        onClose={() => setSelectedActivityForDetails(null)}
      />

      {/* Registration Modal */}
      <ActivityRegistrationModal
        isOpen={Boolean(selectedActivityForReg)}
        activity={selectedActivityForReg}
        onClose={() => setSelectedActivityForReg(null)}
        onRegistered={handleRegistrationSuccess}
      />

      {/* Create Team Modal */}
      <CreateTeamModal
        isOpen={showCreateTeamModal}
        onClose={() => setShowCreateTeamModal(false)}
        onTeamCreated={handleTeamCreated}
      />
    </div>
  );
}

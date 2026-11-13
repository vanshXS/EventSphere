import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import VerifyCertificatePage from "../features/certificates/VerifyCertificatePage";
import LoginPage from "../features/auth/pages/LoginPage";
import CollegeAdminAcceptPage from "../features/auth/pages/CollegeAdminAcceptPage";
import OrganizerRegisterPage from "../features/auth/pages/OrganizerRegisterPage";
import ParticipantRegisterPage from "../features/auth/pages/ParticipantRegisterPage";
import EventsPage from "../features/events/pages/EventsPage";
import CreateEventPage from "../features/events/pages/CreateEventPage";
import EditEventPage from "../features/events/pages/EditEventPage";
import ParticipantDashboard from "../pages/ParticipantDashboard";
import ProtectedRoutes from "../features/auth/ProtectedRoutes";
import UnauthorizedPage from "../pages/UnauthorizedPage";
import ParticipantTicketPage from "../pages/ParticipantTicketPage";
import VolunteerInvitationPage from "../pages/VolunteerInvitationPage";
import VolunteerScannerPage from "../pages/VolunteerScannerPage";
import JudgeInvitationPage from "../pages/JudgeInvitationPage";
import EventOperationsPage from "../pages/EventOperationsPage";
import StandaloneActivityOperationsPage from "../pages/StandaloneActivityOperationsPage";
import OrganizerJudgingPage from "../features/judging/pages/OrganizerJudgingPage";
import JudgeDashboardPage from "../features/judging/pages/JudgeDashboardPage";
import JudgeRoundPage from "../features/judging/pages/JudgeRoundPage";
import JudgeEvaluationPage from "../features/judging/pages/JudgeEvaluationPage";
import SuperAdminCollegesPage from "../pages/SuperAdminCollegesPage";
import CollegeAdminAffiliationsPage from "../pages/CollegeAdminAffiliationsPage";

// Helper redirects for backward compatibility with older route bookmarks
function EventOperationsRedirect({ tab, sub, vsub }) {
  const { eventId } = useParams();
  const search = new URLSearchParams();
  if (tab) search.set("tab", tab);
  if (sub) search.set("sub", sub);
  if (vsub) search.set("vsub", vsub);
  const q = search.toString();
  return <Navigate to={`/organizer/events/${eventId}/operations${q ? `?${q}` : ""}`} replace />;
}

function ActivityOperationsRedirect({ tab }) {
  const { activityId } = useParams();
  const search = new URLSearchParams();
  if (tab) search.set("tab", tab);
  const q = search.toString();
  return <Navigate to={`/organizer/activities/${activityId}/operations${q ? `?${q}` : ""}`} replace />;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        
        {/* Auth Routes */}
        <Route path="/verify-certificate" element={<VerifyCertificatePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/college-admin/accept" element={<CollegeAdminAcceptPage />} />
        <Route path="/register/organizer" element={<OrganizerRegisterPage />} />
        <Route path="/register/participant" element={<ParticipantRegisterPage />} />

        <Route
          path="/volunteer/invitations/:token"
          element={<VolunteerInvitationPage />}
        />
        <Route
          path="/judge/invitations/:token"
          element={<JudgeInvitationPage />}
        />

        {/* Protected Organizer Routes */}
        <Route
          path="/organizer"
          element={
            <ProtectedRoutes allowedRole={["ORGANIZER"]}>
              <EventsPage />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/organizer/events/new"
          element={
            <ProtectedRoutes allowedRole={["ORGANIZER"]}>
              <CreateEventPage />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/organizer/events/:eventId/edit"
          element={
            <ProtectedRoutes allowedRole={["ORGANIZER"]}>
              <EditEventPage />
            </ProtectedRoutes>
          }
        />

        {/* Unified Event Operations Hub */}
        <Route
          path="/organizer/events/:eventId/operations"
          element={
            <ProtectedRoutes allowedRole={["ORGANIZER"]}>
              <EventOperationsPage />
            </ProtectedRoutes>
          }
        />

        {/* Backward-compatible redirects into Unified Event Operations Hub */}
        <Route
          path="/organizer/events/:eventId/volunteers"
          element={
            <ProtectedRoutes allowedRole={["ORGANIZER"]}>
              <EventOperationsRedirect tab="volunteers" />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/organizer/events/:eventId/activity-volunteers"
          element={
            <ProtectedRoutes allowedRole={["ORGANIZER"]}>
              <EventOperationsRedirect tab="volunteers" vsub="activity" />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/organizer/events/:eventId/attendance"
          element={
            <ProtectedRoutes allowedRole={["ORGANIZER"]}>
              <EventOperationsRedirect tab="attendance" />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/organizer/events/:eventId/attendance/event-entry"
          element={
            <ProtectedRoutes allowedRole={["ORGANIZER"]}>
              <EventOperationsRedirect tab="attendance" sub="entry" />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/organizer/events/:eventId/attendance/activities"
          element={
            <ProtectedRoutes allowedRole={["ORGANIZER"]}>
              <EventOperationsRedirect tab="attendance" sub="activity" />
            </ProtectedRoutes>
          }
        />

        {/* Unified Standalone Activity Operations Hub */}
        <Route
          path="/organizer/activities/:activityId/operations"
          element={
            <ProtectedRoutes allowedRole={["ORGANIZER"]}>
              <StandaloneActivityOperationsPage />
            </ProtectedRoutes>
          }
        />

        {/* Backward-compatible redirects into Unified Standalone Activity Operations Hub */}
        <Route
          path="/organizer/activities/:activityId/volunteers"
          element={
            <ProtectedRoutes allowedRole={["ORGANIZER"]}>
              <ActivityOperationsRedirect tab="volunteers" />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/organizer/activities/:activityId/attendance"
          element={
            <ProtectedRoutes allowedRole={["ORGANIZER"]}>
              <ActivityOperationsRedirect tab="attendance" />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/organizer/activities/:activityId/judging"
          element={
            <ProtectedRoutes allowedRole={["ORGANIZER"]}>
              <OrganizerJudgingPage />
            </ProtectedRoutes>
          }
        />

        {/* Protected Participant Routes */}
        <Route
          path="/participant"
          element={
            <ProtectedRoutes allowedRole={["PARTICIPANT"]}>
              <ParticipantDashboard />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/participant/ticket"
          element={
            <ProtectedRoutes allowedRole={["PARTICIPANT"]}>
              <ParticipantTicketPage />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/volunteer"
          element={
            <ProtectedRoutes>
              <VolunteerScannerPage />
            </ProtectedRoutes>
          }
        />

        {/* Protected Judge Routes */}
        <Route
          path="/judge"
          element={
            <ProtectedRoutes allowedRole={["JUDGE"]}>
              <JudgeDashboardPage />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/judge/rounds/:roundId"
          element={
            <ProtectedRoutes allowedRole={["JUDGE"]}>
              <JudgeRoundPage />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/judge/rounds/:roundId/entries/:registrationId"
          element={
            <ProtectedRoutes allowedRole={["JUDGE"]}>
              <JudgeEvaluationPage />
            </ProtectedRoutes>
          }
        />

        {/* Convenience Aliases */}
        <Route path="/judge/dashboard" element={<Navigate to="/judge" replace />} />
        <Route path="/dashboard" element={<Navigate to="/participant" replace />} />
        <Route path="/organizer/dashboard" element={<Navigate to="/organizer" replace />} />

        {/* Super Admin Routes */}
        <Route
          path="/super-admin/colleges"
          element={
            <ProtectedRoutes allowedRole={["SUPER_ADMIN"]}>
              <SuperAdminCollegesPage />
            </ProtectedRoutes>
          }
        />

        {/* College Admin Routes */}
        <Route
          path="/college-admin"
          element={
            <ProtectedRoutes allowedRole={["COLLEGE_ADMIN"]}>
              <CollegeAdminAffiliationsPage />
            </ProtectedRoutes>
          }
        />

        {/* Status / Error Routes */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        
        {/* Fallback Catch-all Route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

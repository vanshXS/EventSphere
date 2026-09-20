import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "../features/auth/pages/LoginPage";
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
import EventOperationsPage from "../pages/EventOperationsPage";
import EventVolunteersPage from "../pages/EventVolunteersPage";
import EventActivityVolunteersPage from "../pages/EventActivityVolunteersPage";
import EventAttendancePage from "../pages/EventAttendancePage";
import EventEntryAttendancePage from "../pages/EventEntryAttendancePage";
import EventActivityAttendancePage from "../pages/EventActivityAttendancePage";
import StandaloneActivityOperationsPage from "../pages/StandaloneActivityOperationsPage";
import StandaloneActivityVolunteersPage from "../pages/StandaloneActivityVolunteersPage";
import StandaloneActivityAttendancePage from "../pages/StandaloneActivityAttendancePage";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register/organizer" element={<OrganizerRegisterPage />} />
        <Route path="/register/participant" element={<ParticipantRegisterPage />} />


        <Route
          path="/volunteer/invitations/:token"
          element={<VolunteerInvitationPage />}
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


        <Route
          path="/organizer/events/:eventId/operations"
          element={
            <ProtectedRoutes allowedRole={["ORGANIZER"]}>
              <EventOperationsPage />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/organizer/events/:eventId/volunteers"
          element={
            <ProtectedRoutes allowedRole={["ORGANIZER"]}>
              <EventVolunteersPage />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/organizer/events/:eventId/activity-volunteers"
          element={
            <ProtectedRoutes allowedRole={["ORGANIZER"]}>
              <EventActivityVolunteersPage />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/organizer/events/:eventId/attendance"
          element={
            <ProtectedRoutes allowedRole={["ORGANIZER"]}>
              <EventAttendancePage />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/organizer/events/:eventId/attendance/event-entry"
          element={
            <ProtectedRoutes allowedRole={["ORGANIZER"]}>
              <EventEntryAttendancePage />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/organizer/events/:eventId/attendance/activities"
          element={
            <ProtectedRoutes allowedRole={["ORGANIZER"]}>
              <EventActivityAttendancePage />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/organizer/activities/:activityId/operations"
          element={
            <ProtectedRoutes allowedRole={["ORGANIZER"]}>
              <StandaloneActivityOperationsPage />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/organizer/activities/:activityId/volunteers"
          element={
            <ProtectedRoutes allowedRole={["ORGANIZER"]}>
              <StandaloneActivityVolunteersPage />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/organizer/activities/:activityId/attendance"
          element={
            <ProtectedRoutes allowedRole={["ORGANIZER"]}>
              <StandaloneActivityAttendancePage />
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

        {/* Status / Error Routes */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        
        {/* Fallback Catch-all Route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

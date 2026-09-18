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
          path="/staff/invitations/:token"
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
            <ProtectedRoutes allowedRole={["VOLUNTEER"]}>
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

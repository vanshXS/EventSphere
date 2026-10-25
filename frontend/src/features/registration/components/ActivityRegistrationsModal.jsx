import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  X, 
  Users, 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
} from "lucide-react";
import { 
  getOrganizerActivityRegistrations,
  approveRegistration,
  rejectRegistration
} from "../registrationApi";
import { formatDateTime } from "../../events/utils/eventHelpers";
import RegistrationStatusBadge from "./RegistrationStatusBadge";
import { isActiveRegistration } from "../utils/registrationHelpers";

export default function ActivityRegistrationsModal({
  isOpen,
  activity,
  onClose,
  onRegistrationUpdated,
  isInline = false
}) {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchRegistrations = async () => {
    if (!activity?.id) return;
    try {
      setLoading(true);
      setError("");
      const data = await getOrganizerActivityRegistrations(activity.id, activity.eventId);
      setRegistrations(data);
    } catch (err) {
      console.error("Failed to load activity registrations:", err);
      setError(
        err.response?.data?.message || "Failed to load registrations. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (registrationId) => {
    try {
      setActionLoadingId(registrationId);
      await approveRegistration(registrationId);
      await fetchRegistrations();
      await onRegistrationUpdated?.();
    } catch (err) {
      console.error("Failed to approve registration:", err);
      alert(err.response?.data?.message || "Failed to approve registration.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (registrationId) => {
    const reason = window.prompt("Enter rejection reason (optional):");
    if (reason === null) return;
    try {
      setActionLoadingId(registrationId);
      await rejectRegistration(registrationId, reason);
      await fetchRegistrations();
      await onRegistrationUpdated?.();
    } catch (err) {
      console.error("Failed to reject registration:", err);
      alert(err.response?.data?.message || "Failed to reject registration.");
    } finally {
      setActionLoadingId(null);
    }
  };

  useEffect(() => {
    if (!isOpen || !activity?.id) return undefined;

    let cancelled = false;
    const loadRegistrations = async () => {
      try {
        const data = await getOrganizerActivityRegistrations(activity.id, activity.eventId);
        if (!cancelled) {
          setRegistrations(data);
          setError("");
        }
      } catch (err) {
        console.error("Failed to load activity registrations:", err);
        if (!cancelled) {
          setError(
            err.response?.data?.message || "Failed to load registrations. Please try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadRegistrations();
    if (!isInline) document.body.style.overflow = "hidden";

    return () => {
      cancelled = true;
      if (!isInline) document.body.style.overflow = "unset";
    };
  }, [isOpen, activity?.id, activity?.eventId, isInline]);

  if (!isOpen || !activity) return null;

  const activeRegistrations = registrations.filter(isActiveRegistration);
  const cancelledRegistrations = registrations.filter(
    (r) => r.status === "CANCELLED" || r.status === "REJECTED"
  );
  const capacity = activity.capacity;
  const availableSlots = capacity ? Math.max(0, capacity - activeRegistrations.length) : "Unlimited";

  const modalContent = (
    <div
      role={isInline ? undefined : "dialog"}
      aria-modal={isInline ? undefined : "true"}
      className={isInline ? "w-full" : "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs transition-opacity"}
      onClick={isInline ? undefined : (e) => {
        if (e.target === e.currentTarget && !loading) onClose?.();
      }}
    >
      <div
        className={isInline
          ? "w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm"
          : "relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-xl"}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                Organizer View
              </span>
              <span className="text-xs text-slate-500 font-medium">Activity Registrations</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">{activity.name}</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchRegistrations}
              disabled={loading}
              title="Refresh registrations"
              className="text-slate-500 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            {onClose && <button
                type="button"
                onClick={onClose}
                aria-label={isInline ? "Back to activities" : "Close registrations"}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>}
          </div>
        </div>

        {/* Capacity / Stats Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-100 text-xs">
          <div className="p-3 bg-white rounded-lg border border-slate-200/70 shadow-2xs">
            <span className="text-slate-500 font-medium">Total Capacity</span>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {capacity ? `${capacity} slots` : "Unlimited"}
            </div>
          </div>
          <div className="p-3 bg-white rounded-lg border border-slate-200/70 shadow-2xs">
            <span className="text-slate-500 font-medium">Active Signups</span>
            <div className="text-base font-bold text-indigo-600 mt-0.5">
              {activeRegistrations.length} slots
            </div>
          </div>
          <div className="p-3 bg-white rounded-lg border border-slate-200/70 shadow-2xs">
            <span className="text-slate-500 font-medium">Available Slots</span>
            <div className="text-base font-bold text-emerald-600 mt-0.5">
              {availableSlots}
            </div>
          </div>
          <div className="p-3 bg-white rounded-lg border border-slate-200/70 shadow-2xs">
            <span className="text-slate-500 font-medium">Cancelled</span>
            <div className="text-base font-bold text-slate-400 mt-0.5">
              {cancelledRegistrations.length}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className={`p-5 sm:p-6 ${isInline ? "" : "flex-1 overflow-y-auto"}`}>
          {loading ? (
            <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-sm">Loading activity registrations...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : registrations.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-2">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-semibold text-slate-700">No Registrations Yet</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Participants have not registered for this activity yet. When they register, they will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Participant</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Registered At</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {registrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">
                          {reg.participantName || "Participant"}
                        </div>
                        <div className="text-[11px] text-slate-500">{reg.participantEmail || reg.participantId}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800">
                          {reg.registrationType}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {reg.teamName ? (
                          <div>
                            <span className="font-medium text-indigo-700">{reg.teamName}</span>
                            {reg.teamMemberIds && (
                              <div className="text-[11px] text-slate-400">
                                {reg.teamMemberIds.length} members
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <RegistrationStatusBadge status={reg.status} />
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatDateTime(reg.registeredAt)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {reg.status === "PENDING" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              disabled={actionLoadingId === reg.id}
                              onClick={() => handleApprove(reg.id)}
                              className="rounded px-2.5 py-1 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              {actionLoadingId === reg.id ? "..." : "Approve"}
                            </button>
                            <button
                              type="button"
                              disabled={actionLoadingId === reg.id}
                              onClick={() => handleReject(reg.id)}
                              className="rounded px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        {onClose && <div className="flex justify-end border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
          >
            {isInline ? "Back to activities" : "Close"}
          </button>
        </div>}
      </div>
    </div>
  );

  if (isInline) return modalContent;
  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}

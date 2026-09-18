import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Ticket, AlertCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { getMyRegistrations } from "../features/registration/registrationApi";
import {
  getActivityTicket,
  getEventTicket
} from "../features/attendance/attendanceApi";
import QrTicketCard from "../features/registration/components/QrTicketCard";

export default function ParticipantTicketPage() {
  const [searchParams] = useSearchParams();
  const registrationId = searchParams.get("registrationId");
  const scope = searchParams.get("scope") || "ACTIVITY";

  const [registrations, setRegistrations] = useState([]);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getMyRegistrations();
        if (ignore) return;

        setRegistrations(data);

        if (!registrationId) {
          setError("No registration was selected.");
          return;
        }

        const loader =
          scope === "EVENT" ? getEventTicket : getActivityTicket;

        const loadedTicket = await loader(registrationId);
        if (!ignore) setTicket(loadedTicket);
      } catch (err) {
        if (!ignore) {
          setError(
            err.response?.data?.message ||
              "Could not load this ticket."
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();

    return () => {
      ignore = true;
    };
  }, [registrationId, scope]);

  const currentRegistration = useMemo(
    () => registrations.find((item) => item.id === registrationId),
    [registrations, registrationId]
  );

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/participant"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to participant dashboard
        </Link>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
              <Ticket className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">My Ticket</h1>
              <p className="text-sm text-slate-500">
                Keep this QR ready for check-in.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        ) : (
          <>
            {currentRegistration && (
              <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs uppercase tracking-wider text-slate-400">
                  Registration
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">
                  {currentRegistration.activityName ||
                    currentRegistration.eventName ||
                    "Event registration"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Status: {currentRegistration.status}
                </p>
              </div>
            )}

            {ticket ? (
              <QrTicketCard ticket={ticket} />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
                No active ticket is available for this registration.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

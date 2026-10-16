import { ExternalLink, QrCode } from "lucide-react";

function qrUrl(payload) {
  return (
    "https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=" +
    encodeURIComponent(payload || "")
  );
}

export default function QrTicketCard({ ticket, title = "Your QR Ticket" }) {
  if (!ticket?.qrPayload) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
          <QrCode className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">
            Show this QR code at the assigned check-in point.
          </p>
        </div>
      </div>

      <div className="mt-5 flex justify-center rounded-xl bg-slate-50 p-4">
        <img
          src={qrUrl(ticket.qrPayload)}
          alt="QR ticket"
          className="h-64 w-64 rounded-lg bg-white p-2"
        />
      </div>

      <div className="mt-4 flex justify-between gap-4 text-xs text-slate-500">
        <span>Scope</span>
        <span className="font-semibold text-slate-700">
          {ticket.scope === "EVENT" ? "Event Entry" : "Activity"}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-4 text-xs text-slate-500">
        <span>Ticket ID</span>
        <span className="max-w-[220px] truncate font-mono text-[10px] text-slate-600">
          {ticket.ticketId}
        </span>
      </div>

      <a
        href={qrUrl(ticket.qrPayload)}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
      >
        Open QR image
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

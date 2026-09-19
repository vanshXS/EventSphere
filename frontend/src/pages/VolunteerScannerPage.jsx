import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  LogOut,
  QrCode,
  ShieldCheck,
  Square,
  XCircle
} from "lucide-react";
import { useAuth } from "../features/auth/AuthContext";
import {
  checkIn,
  getMyVolunteerAssignments
} from "../features/attendance/attendanceApi";

const CHECK_IN_TYPES = [
  { value: "EVENT_ENTRY", label: "Event entry" },
  { value: "ACTIVITY", label: "Activity check-in" }
];

export default function VolunteerScannerPage() {
  const { user, logoutUser } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [checkInType, setCheckInType] = useState("EVENT_ENTRY");
  const [payload, setPayload] = useState("");
  const [message, setMessage] = useState(null);
  const [scanning, setScanning] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanningRef = useRef(false);
  const frameRef = useRef(null);

  useEffect(() => {
    getMyVolunteerAssignments()
      .then((data) => {
        setAssignments(data);
        const firstAssignment = data[0] || null;
        setSelectedAssignment(firstAssignment);

        if (firstAssignment?.activityId) {
          setCheckInType("ACTIVITY");
        } else {
          setCheckInType("EVENT_ENTRY");
        }
      })
      .catch((err) => {
        setMessage({
          type: "error",
          text:
            err.response?.data?.message ||
            "Could not load volunteer assignments."
        });
      });

    return () => stopCamera();
  }, []);

  const stopCamera = () => {
    scanningRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    setScanning(false);
  };

  const submitPayload = async (value) => {
    if (!value?.trim()) return;

    try {
      setMessage({ type: "loading", text: "Checking ticket..." });
      const result = await checkIn(value.trim(), checkInType);

      setMessage({
        type: result.alreadyCheckedIn ? "warning" : "success",
        text: result.alreadyCheckedIn
          ? "Already checked in."
          : "Participant checked in successfully."
      });
      setPayload("");
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err.response?.data?.message ||
          "This ticket could not be checked in."
      });
    }
  };

  const startCamera = async () => {
    setMessage(null);

    if (!("BarcodeDetector" in window)) {
      setMessage({
        type: "error",
        text:
          "QR camera scanning is not available in this browser. Paste the QR payload below instead."
      });
      return;
    }

    if (!selectedAssignment) {
      setMessage({
        type: "error",
        text: "You do not have an active volunteer assignment."
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      scanningRef.current = true;
      setScanning(true);

      const detector = new BarcodeDetector({ formats: ["qr_code"] });

      const scan = async () => {
        if (!scanningRef.current || !videoRef.current) return;

        try {
          const codes = await detector.detect(videoRef.current);

          if (codes.length && codes[0].rawValue) {
            scanningRef.current = false;
            stopCamera();
            await submitPayload(codes[0].rawValue);
            return;
          }
        } catch {
          // Continue scanning.
        }

        frameRef.current = requestAnimationFrame(scan);
      };

      scan();
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err.message ||
          "Camera access failed. Check browser permissions."
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-600 p-2 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900">EventSphere</div>
              <div className="text-xs text-slate-500">Volunteer Check-in</div>
            </div>
          </div>

          <button
            onClick={logoutUser}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h1 className="text-xl font-bold text-slate-900">
            Welcome, {user?.name || "Volunteer"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Scan a participant ticket and let EventSphere validate the check-in.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">
                Assigned event / activity
              </span>
              <select
                value={selectedAssignment?.id || ""}
                onChange={(event) => {
                  const assignment = assignments.find(
                    (item) => item.id === event.target.value
                  );

                  setSelectedAssignment(assignment || null);
                  setCheckInType(assignment?.activityId ? "ACTIVITY" : "EVENT_ENTRY");
                  setMessage(null);
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              >
                {assignments.map((assignment) => (
                  <option key={assignment.id} value={assignment.id}>
                    {assignment.eventName ||
                      assignment.activityName ||
                      "Assigned event"}
                    {assignment.activityName
                      ? " · " + assignment.activityName
                      : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">
                Check-in type
              </span>
              <select
                value={checkInType}
                onChange={(event) => setCheckInType(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              >
                {CHECK_IN_TYPES
                  .filter((type) =>
                    selectedAssignment?.activityId
                      ? type.value === "ACTIVITY"
                      : true
                  )
                  .map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
              </select>
            </label>
          </div>
        </div>

        {message && (
          <div
            className={
              "rounded-2xl border p-4 text-sm " +
              (message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : message.type === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : message.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-slate-200 bg-white text-slate-700")
            }
          >
            <div className="flex items-center gap-2">
              {message.type === "success" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : message.type === "error" ? (
                <XCircle className="h-5 w-5" />
              ) : (
                <QrCode className="h-5 w-5" />
              )}
              {message.text}
            </div>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="aspect-video overflow-hidden rounded-2xl bg-slate-900">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                muted
                playsInline
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {!scanning ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  <Camera className="h-4 w-4" />
                  Start camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
                >
                  <Square className="h-4 w-4" />
                  Stop camera
                </button>
              )}
            </div>

            <div className="mt-5 border-t border-slate-100 pt-5">
              <label className="block text-xs font-semibold text-slate-700">
                Manual QR payload
              </label>
              <textarea
                value={payload}
                onChange={(event) => setPayload(event.target.value)}
                rows={3}
                placeholder="Paste the QR payload here when camera scanning is unavailable."
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => submitPayload(payload)}
                className="mt-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Check in
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-900">
              How check-in works
            </h2>
            <ol className="mt-4 space-y-3 text-sm text-slate-600">
              <li>1. Select the event/activity you were assigned to.</li>
              <li>2. Select whether you are checking event entry or an activity.</li>
              <li>3. Scan the participant QR.</li>
              <li>4. EventSphere validates the ticket and your assignment.</li>
              <li>5. A successful scan creates one attendance record.</li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}

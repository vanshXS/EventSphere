
import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import {
  Camera,
  QrCode,
  ShieldCheck,
  Square,
  ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";
import AppHeader from "../components/common/AppHeader";
import { useToast } from "../components/common/ToastContext";
import { useAuth } from "../features/auth/AuthContext";
import {
  checkIn,
  getMyVolunteerAssignments
} from "../features/attendance/attendanceApi";

const SCAN_COOLDOWN_MS = 4000;

const types = [
  { value: "EVENT_ENTRY", label: "Event entry" },
  { value: "ACTIVITY", label: "Activity check-in" }
];

export default function VolunteerScannerPage() {
  const { user, logoutUser } = useAuth();
  const addToast = useToast();

  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [checkInType, setCheckInType] = useState("EVENT_ENTRY");
  const [payload, setPayload] = useState("");
  const setMessage = useCallback((message) => {
    if (message?.text) {
      addToast(
        message.text,
        message.type === "success" ? "success" : message.type === "error" ? "error" : "info"
      );
    }
  }, [addToast]);
  const [recentScans, setRecentScans] = useState([]);
  const [scanning, setScanning] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);
  const detectorIntervalRef = useRef(null);
  const detectingRef = useRef(false);
  const scanningRef = useRef(false);
  const processingRef = useRef(new Set());
  const lastSeenRef = useRef(new Map());

 const stopCamera = () => {
  scanningRef.current = false;

  if (detectorIntervalRef.current) {
    clearInterval(detectorIntervalRef.current);
    detectorIntervalRef.current = null;
  }

  /*
   * Stop ZXing first if it owns the scanner.
   */
  controlsRef.current?.stop?.();
  controlsRef.current = null;

  readerRef.current?.reset?.();
  readerRef.current = null;

  /*
   * Stop manually-created stream if the native
   * BarcodeDetector path owns it.
   */
  streamRef.current?.getTracks().forEach((track) => {
    track.stop();
  });

  streamRef.current = null;

  detectingRef.current = false;

  setScanning(false);
};

  useEffect(() => {
    let cancelled = false;

    getMyVolunteerAssignments()
      .then((data) => {
        if (cancelled) return;

        setAssignments(data);
        const first = data[0] || null;
        setSelectedAssignment(first);
        setCheckInType(first?.activityId ? "ACTIVITY" : "EVENT_ENTRY");
      })
      .catch((err) => {
        if (!cancelled) {
          setMessage({
            type: "error",
            text:
              err.response?.data?.message ||
              "Could not load volunteer assignments."
          });
        }
      });

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [setMessage]);

  const addRecentScan = (type, text) => {
    setRecentScans((previous) => [
      {
        id: Date.now() + Math.random(),
        type,
        text,
        time: new Date()
      },
      ...previous
    ].slice(0, 6));
  };

  const submitPayload = async (value) => {
    const normalized = value?.trim();
    if (!normalized || processingRef.current.has(normalized)) return;

    const now = Date.now();
    const previous = lastSeenRef.current.get(normalized);

    if (previous && now - previous < SCAN_COOLDOWN_MS) {
      return;
    }

    lastSeenRef.current.set(normalized, now);
    processingRef.current.add(normalized);

    try {
      const result = await checkIn(normalized, checkInType);
      const already = Boolean(result?.alreadyCheckedIn);
      const text = already
        ? "Already checked in."
        : "Participant checked in successfully.";

      addRecentScan(already ? "warning" : "success", text);
      setMessage({
        type: already ? "warning" : "success",
        text
      });
      setPayload("");
    } catch (err) {
      const text =
        err.response?.data?.message ||
        "This ticket could not be checked in.";

      addRecentScan("error", text);
      setMessage({ type: "error", text });
    } finally {
      processingRef.current.delete(normalized);
    }
  };

  const startCamera = async () => {
  if (scanningRef.current) return;


  if (!selectedAssignment) {
    setMessage({
      type: "error",
      text: "Select an assignment before starting the scanner."
    });
    return;
  }

  if (
    !window.isSecureContext &&
    !["localhost", "127.0.0.1"].includes(window.location.hostname)
  ) {
    setMessage({
      type: "error",
      text:
        "Camera access requires HTTPS or localhost. Use HTTPS on the device used for check-in."
    });
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    setMessage({
      type: "error",
      text: "This browser does not support camera access."
    });
    return;
  }

  try {
    stopCamera();

    /*
     * ==========================================================
     * PATH 1: Native BarcodeDetector
     * ==========================================================
     *
     * Our code owns the camera stream.
     */
    if ("BarcodeDetector" in window) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 }
        },
        audio: false
      });

      streamRef.current = stream;

      if (!videoRef.current) {
        throw new Error("Camera preview could not be initialized.");
      }

      videoRef.current.srcObject = stream;

      /*
       * Wait until metadata is ready before calling play().
       * This avoids another class of play/load races.
       */
      await new Promise((resolve, reject) => {
        const video = videoRef.current;

        if (video.readyState >= 1) {
          resolve();
          return;
        }

        const onLoadedMetadata = () => {
          cleanup();
          resolve();
        };

        const onError = () => {
          cleanup();
          reject(new Error("Camera video could not be loaded."));
        };

        const cleanup = () => {
          video.removeEventListener(
            "loadedmetadata",
            onLoadedMetadata
          );
          video.removeEventListener("error", onError);
        };

        video.addEventListener(
          "loadedmetadata",
          onLoadedMetadata,
          { once: true }
        );

        video.addEventListener(
          "error",
          onError,
          { once: true }
        );
      });

      await videoRef.current.play();

      const detector = new window.BarcodeDetector({
        formats: ["qr_code"]
      });

      scanningRef.current = true;
      setScanning(true);

      const detect = async () => {
        if (
          !scanningRef.current ||
          !videoRef.current ||
          detectingRef.current
        ) {
          return;
        }

        detectingRef.current = true;

        try {
          const results = await detector.detect(videoRef.current);

          /*
           * BarcodeDetector may return multiple QR codes
           * from the same frame.
           */
          const values = [
            ...new Set(
              (results || [])
                .map((result) => result.rawValue?.trim())
                .filter(Boolean)
            )
          ];

          values.forEach((value) => {
            void submitPayload(value);
          });
        } catch {
          /*
           * Ignore a bad frame.
           * Keep camera alive.
           */
        } finally {
          detectingRef.current = false;
        }
      };

      await detect();

      detectorIntervalRef.current = window.setInterval(
        detect,
        100
      );

      return;
    }

    /*
     * ==========================================================
     * PATH 2: ZXing fallback
     * ==========================================================
     *
     * IMPORTANT:
     * Do NOT call getUserMedia() here.
     *
     * ZXing owns the stream and the video element.
     */
    const reader = new BrowserQRCodeReader(
      undefined,
      {
        delayBetweenScanAttempts: 120,
        delayBetweenScanSuccess: 150
      }
    );

    readerRef.current = reader;

    scanningRef.current = true;
    setScanning(true);

    const controls = await reader.decodeFromVideoDevice(
      undefined,
      videoRef.current,
      async (result) => {
        if (!result || !scanningRef.current) {
          return;
        }

        const value =
          typeof result.getText === "function"
            ? result.getText()
            : result.text;

        if (value?.trim()) {
          await submitPayload(value);
        }
      }
    );

    controlsRef.current = controls;

  } catch (err) {
    stopCamera();

    let text =
      "Could not start the camera. Check camera permissions.";

    if (err?.name === "NotAllowedError") {
      text =
        "Camera permission was denied. Allow camera access and try again.";
    } else if (err?.name === "NotFoundError") {
      text =
        "No camera was found on this device.";
    } else if (err?.name === "NotReadableError") {
      text =
        "The camera is already in use. Close another camera app or tab and try again.";
    } else if (err?.message) {
      text = err.message;
    }

    setMessage({
      type: "error",
      text
    });
  }
};

  const changeAssignment = (id) => {
    stopCamera();

    const assignment = assignments.find((item) => item.id === id) || null;
    setSelectedAssignment(assignment);
    setCheckInType(assignment?.activityId ? "ACTIVITY" : "EVENT_ENTRY");
    setRecentScans([]);
    lastSeenRef.current.clear();
  };

  const allowedTypes = types.filter((type) =>
    selectedAssignment?.activityId
      ? type.value === "ACTIVITY"
      : true
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader
        user={user}
        onLogout={logoutUser}
        roleBadge={{ label: "Volunteer Scanner", color: "amber" }}
        actions={
          <Link
            to="/participant"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Participant Dashboard</span>
          </Link>
        }
      />

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h1 className="text-xl font-bold text-slate-900">
            Welcome, {user?.name || "Volunteer"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Select your assignment, start the camera, and keep scanning.
          </p>

          {/* Assignment Summary Cards */}
          {assignments.length > 0 && (
            <div className="mt-4 mb-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
                Your Assignments ({assignments.length})
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {assignments.map((assignment) => (
                  <button
                    key={assignment.id}
                    type="button"
                    onClick={() => changeAssignment(assignment.id)}
                    className={`text-left rounded-xl border p-3 transition-all cursor-pointer ${
                      selectedAssignment?.id === assignment.id
                        ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <p className={`text-sm font-semibold truncate ${
                      selectedAssignment?.id === assignment.id
                        ? "text-indigo-900"
                        : "text-slate-800"
                    }`}>
                      {assignment.eventName || "Event"}
                    </p>
                    {assignment.activityName ? (
                      <p className="mt-0.5 text-xs text-slate-500 truncate">
                        Activity: {assignment.activityName}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-slate-400 italic">
                        Event gate entry
                      </p>
                    )}
                    <span className={`mt-2 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      assignment.activityId
                        ? "bg-violet-100 text-violet-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}>
                      <QrCode className="w-2.5 h-2.5" />
                      {assignment.activityId ? "Activity check-in" : "Gate scanner"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {assignments.length === 0 && (
            <div className="mt-4 mb-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
              <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">No assignments yet</p>
              <p className="mt-1 text-xs text-slate-400">
                Your organizer hasn't assigned you to any events or activities. Ask them to invite you via the Operations Console.
              </p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">
                Assignment
              </span>
              <select
                value={selectedAssignment?.id || ""}
                onChange={(e) => changeAssignment(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              >
                <option value="">Select assignment</option>
                {assignments.map((assignment) => (
                  <option key={assignment.id} value={assignment.id}>
                    {assignment.eventName || "Event"}
                    {assignment.activityName
                      ? " · " + assignment.activityName
                      : " · Event entry"}
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
                onChange={(e) => {
                  stopCamera();
                  setCheckInType(e.target.value);
                  setRecentScans([]);
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              >
                {allowedTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="relative overflow-hidden rounded-2xl bg-slate-900">
              <video
                ref={videoRef}
                className="aspect-video w-full object-cover"
                muted
                autoPlay
                playsInline
              />
              {scanning && (
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-white/80" />
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-white">
                    Scanner active
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {scanning
                  ? "Present the next ticket. The camera stays on."
                  : "Start the camera when you are ready."}
              </p>

              {!scanning ? (
                <button
                  type="button"
                  onClick={startCamera}
                  disabled={!selectedAssignment}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
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
                onChange={(e) => setPayload(e.target.value)}
                rows={3}
                placeholder="Use this only when camera scanning is unavailable."
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => submitPayload(payload)}
                disabled={!selectedAssignment || !payload.trim()}
                className="mt-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Check in
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Recent scans</h2>
              <span className="text-[11px] text-slate-400">
                {recentScans.length}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {recentScans.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                  Scan a ticket to see the result here.
                </div>
              ) : (
                recentScans.map((item) => (
                  <div
                    key={item.id}
                    className={
                      "rounded-xl border p-3 " +
                      (item.type === "success"
                        ? "border-emerald-200 bg-emerald-50"
                        : item.type === "warning"
                        ? "border-amber-200 bg-amber-50"
                        : "border-rose-200 bg-rose-50")
                    }
                  >
                    <p className="text-xs font-semibold text-slate-800">
                      {item.text}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {item.time.toLocaleTimeString()}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
              <p className="font-semibold text-slate-800">
                Continuous scanning
              </p>
              <p className="mt-1">
                Each new QR is validated by the backend. The same payload is
                temporarily deduplicated so one ticket does not generate a
                request on every camera frame.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

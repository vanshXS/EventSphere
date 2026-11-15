import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  Download,
  FileBadge,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../features/auth/AuthContext";
import ParticipantHeader from "../features/registration/components/ParticipantHeader";
import { getMyVolunteerAssignments } from "../features/attendance/attendanceApi";
import {
  downloadCertificate,
  getCertificatePdfBlob,
  getMyCertificates
} from "../features/certificates/certificateApi";

function formatIssuedDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(date);
}

async function findMyCertificate(certificateId) {
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    const result = await getMyCertificates(page);
    const certificate = (result?.content || []).find((item) => item.id === certificateId);
    if (certificate) return certificate;
    totalPages = Math.max(1, result?.totalPages || 1);
    page += 1;
  }

  return null;
}

export default function ParticipantCertificatePreviewPage() {
  const { certificateId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logoutUser } = useAuth();

  const initialCertificate = location.state?.certificate?.id === certificateId
    ? location.state.certificate
    : null;

  const [certificate, setCertificate] = useState(initialCertificate);
  const [loading, setLoading] = useState(!initialCertificate);
  const [error, setError] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfLoading, setPdfLoading] = useState(Boolean(initialCertificate));
  const [pdfError, setPdfError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [volunteerAssignmentsCount, setVolunteerAssignmentsCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getMyVolunteerAssignments()
      .then((assignments) => {
        if (!cancelled) setVolunteerAssignmentsCount(Array.isArray(assignments) ? assignments.length : 0);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCertificate = async () => {
      setError("");
      setLoading(true);
      try {
        const existing = location.state?.certificate?.id === certificateId
          ? location.state.certificate
          : await findMyCertificate(certificateId);

        if (!existing) {
          throw new Error("This certificate could not be found in your issued certificates.");
        }
        if (!cancelled) setCertificate(existing);
      } catch (loadError) {
        if (!cancelled) setError(loadError.response?.data?.message || loadError.message || "Could not load this certificate.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCertificate();
    return () => { cancelled = true; };
  }, [certificateId, location.state]);

  useEffect(() => {
    if (!certificate?.id || certificate.id !== certificateId) return undefined;

    let cancelled = false;
    let createdUrl = "";

    const loadPdf = async () => {
      setPdfLoading(true);
      setPdfError("");
      setPdfUrl("");
      try {
        const blob = await getCertificatePdfBlob(certificate.id);
        createdUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setPdfUrl(createdUrl);
        } else {
          URL.revokeObjectURL(createdUrl);
        }
      } catch (pdfLoadError) {
        if (!cancelled) {
          setPdfError(pdfLoadError.response?.data?.message || "The PDF preview is unavailable. You can still try downloading the certificate.");
        }
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    };

    loadPdf();
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [certificate?.id, certificateId]);

  const handleDownload = async () => {
    if (!certificate?.id) return;
    setDownloading(true);
    setDownloadError("");
    try {
      await downloadCertificate(certificate.id, certificate.certificateNumber || "Certificate");
    } catch (downloadFailure) {
      setDownloadError(downloadFailure.response?.data?.message || "Could not download this certificate. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const isWinner = certificate?.type === "WINNER";
  const title = isWinner ? "Certificate of Achievement" : "Certificate of Participation";

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f8fc] text-slate-900">
      <ParticipantHeader
        user={user}
        activeTab="MY_REGISTRATIONS"
        setActiveTab={(tab) => navigate(`/participant?tab=${tab}`)}
        onLogout={logoutUser}
        volunteerAssignmentsCount={volunteerAssignmentsCount}
      />

      <div className="border-b border-indigo-100 bg-indigo-50/70">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3 max-md:px-4">
          <Link
            to="/participant?tab=MY_REGISTRATIONS"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:text-indigo-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Registrations
          </Link>
          <span className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-[11px] font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
            {certificate?.status === "REVOKED" ? "Revoked" : "Issued certificate"}
          </span>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-7 max-md:px-4">
        {loading ? (
          <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            Loading certificate...
          </div>
        ) : error ? (
          <div role="alert" className="mx-auto mt-10 max-w-xl rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
            {error}
            <div className="mt-4">
              <Link to="/participant?tab=MY_REGISTRATIONS" className="font-semibold text-indigo-700 hover:underline">Return to My Registrations</Link>
            </div>
          </div>
        ) : certificate ? (
          <>
            <div className="mb-7 flex flex-wrap items-end justify-between gap-5 border-b border-slate-200 pb-5">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                  <span>{isWinner ? "Winner certificate" : "Participation certificate"}</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>{certificate.type === "WINNER" ? "Winner" : "Participation"}</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 max-md:text-2xl">{title}</h1>
                <p className="mt-1.5 text-sm text-slate-600">
                  {certificate.scopeName || "EventSphere certificate"}
                  {certificate.rank != null ? ` · Rank ${certificate.rank}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Download PDF
                </button>
                <Link
                  to={`/verify-certificate?number=${encodeURIComponent(certificate.certificateNumber || "")}`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Check certificate number
                </Link>
              </div>
            </div>

            {downloadError && (
              <div role="alert" className="mb-5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{downloadError}</div>
            )}

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(300px,0.9fr)]">
              <section className="min-w-0">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    <FileBadge className="h-4 w-4 text-indigo-700" />
                    Certificate PDF preview
                  </div>
                  <span className="text-[11px] text-slate-500">Original issued document</span>
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm max-md:p-2">
                  {pdfLoading ? (
                    <div className="flex min-h-[420px] items-center justify-center gap-3 text-sm text-slate-500">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                      Loading PDF preview...
                    </div>
                  ) : pdfUrl ? (
                    <iframe
                      title={`PDF certificate: ${certificate.certificateNumber}`}
                      src={pdfUrl}
                      className="h-[min(76vh,900px)] min-h-[480px] w-full rounded-lg bg-slate-100 max-md:min-h-[580px]"
                    />
                  ) : (
                    <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
                      <Award className="h-10 w-10 text-indigo-400" />
                      <h2 className="mt-3 text-base font-semibold text-slate-900">PDF preview unavailable</h2>
                      <p className="mt-1 max-w-md text-sm text-slate-500">{pdfError || "Download the original certificate PDF to view it."}</p>
                      <button type="button" onClick={handleDownload} disabled={downloading} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60">
                        <Download className="h-4 w-4" />Download PDF
                      </button>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-slate-500">This preview displays the PDF returned by EventSphere’s authenticated certificate download endpoint.</p>
              </section>

              <aside className="space-y-5">
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Award className="h-4 w-4 text-indigo-700" />
                      Certificate details
                    </h2>
                    <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">{certificate.status || "Issued"}</span>
                  </div>
                  <dl className="space-y-4 text-xs">
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-slate-500">Recipient</dt>
                      <dd className="text-right font-semibold text-slate-900">{user?.name || "Your account"}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-slate-500">Event / Activity</dt>
                      <dd className="max-w-[62%] text-right font-semibold text-slate-900">{certificate.scopeName || "—"}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-slate-500">Certificate type</dt>
                      <dd className="text-right font-semibold text-slate-900">{isWinner ? "Winner" : "Participation"}</dd>
                    </div>
                    {certificate.rank != null && (
                      <div className="flex items-start justify-between gap-4">
                        <dt className="text-slate-500">Rank</dt>
                        <dd className="text-right font-semibold text-indigo-700">Rank {certificate.rank}</dd>
                      </div>
                    )}
                    {certificate.teamName && (
                      <div className="flex items-start justify-between gap-4">
                        <dt className="text-slate-500">Team</dt>
                        <dd className="text-right font-semibold text-slate-900">{certificate.teamName}</dd>
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-slate-500">Issued date</dt>
                      <dd className="text-right font-semibold text-slate-900">{formatIssuedDate(certificate.issuedAt)}</dd>
                    </div>
                  </dl>
                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Certificate ID</p>
                    <p className="break-all rounded-lg bg-indigo-50 px-3 py-2.5 font-mono text-xs font-semibold text-indigo-900">{certificate.certificateNumber}</p>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Public number verification
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    EventSphere can check whether this certificate number is recorded as issued or revoked.
                    This check does not prove that an altered PDF or printed copy is unchanged.
                  </p>
                  <Link to={`/verify-certificate?number=${encodeURIComponent(certificate.certificateNumber || "")}`} className="mt-4 inline-flex min-h-9 w-full items-center justify-center rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100">
                    Verify certificate number
                  </Link>
                </section>
              </aside>
            </div>
          </>
        ) : null}
      </main>

      <footer className="mt-auto border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} EventSphere Platform.
      </footer>
    </div>
  );
}

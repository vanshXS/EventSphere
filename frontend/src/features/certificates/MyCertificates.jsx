import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Award, Download, Loader2, RefreshCw } from "lucide-react";
import { downloadCertificate, getMyCertificates } from "./certificateApi";

export default function MyCertificates() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getMyCertificates(page));
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load certificates.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    let cancelled = false;

    getMyCertificates(page)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.message || "Could not load certificates.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [page]);

  const handleDownload = async (certificate) => {
    if (!certificate?.id) return;
    setBusy(certificate.id);
    setError("");
    try {
      await downloadCertificate(certificate.id, certificate.certificateNumber || "Certificate");
    } catch (err) {
      setError(err.response?.data?.message || "Could not download this certificate. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="participant-certificates-content space-y-5" aria-busy={loading}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <p className="text-sm text-slate-500">
          {data?.totalElements ?? data?.content?.length ?? 0} issued certificates
        </p>
        <div className="flex items-center gap-2">
          <Link
            to="/verify-certificate"
            className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Verify a certificate
          </Link>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            aria-label="Refresh certificates"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
          Loading certificates...
        </div>
      ) : data?.content?.length ? (
        <div className="participant-certificate-grid grid gap-3 md:grid-cols-2">
          {data.content.map((certificate) => (
            <article
              key={certificate.id}
              className="participant-certificate-card flex min-w-0 flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Award className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="break-words text-base font-semibold text-slate-900">
                    {certificate.scopeName || "Event certificate"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {certificate.type === "WINNER"
                      ? `Winner · Rank ${certificate.rank}`
                      : "Participation"}
                    {certificate.teamName ? ` · ${certificate.teamName}` : ""}
                  </p>
                </div>
                <span className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  Issued
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <span className="min-w-0 break-all font-mono text-xs text-slate-500">
                  {certificate.certificateNumber}
                </span>
                <button
                  type="button"
                  onClick={() => handleDownload(certificate)}
                  disabled={busy !== null}
                  className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy === certificate.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Download className="h-4 w-4" />}
                  Download PDF
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <Award className="mx-auto h-9 w-9 text-indigo-400" />
          <h2 className="mt-3 text-base font-semibold text-slate-900">No certificates yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Certificates issued for your participation and achievements will appear here.
          </p>
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4 text-sm">
          <button
            type="button"
            disabled={page === 0 || loading}
            onClick={() => setPage((current) => current - 1)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-slate-500">Page {page + 1} of {data.totalPages}</span>
          <button
            type="button"
            disabled={data.last || loading}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}

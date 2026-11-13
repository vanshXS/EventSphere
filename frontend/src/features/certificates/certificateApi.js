import api from "../../lib/api";

export async function getCertificatePreview(scope, id, type, roundId) {
  const response = await api.get(`/api/organizer/${scope}/${id}/certificates/eligibility`, {
    params: scope === "activities" ? { type, ...(roundId ? { roundId } : {}) } : {},
  });
  return response.data;
}
export async function generateCertificate(scope, id, request) {
  const response = await api.post(`/api/organizer/${scope}/${id}/certificates/generate`, request);
  return response.data;
}
export async function getMyCertificates(page = 0) {
  const response = await api.get("/api/participant/certificates", { params: { page } });
  return response.data;
}
export async function downloadCertificate(id, number) {
  const response = await api.get(`/api/participant/certificates/${id}/download`, { responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${number}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function verifyCertificate(number) {
  // Public lookup: don't trigger authentication refresh when the user is signed out.
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"}/api/public/certificates/${encodeURIComponent(number)}/verify`, { cache: "no-store" });
  if (!response.ok) throw new Error("Verification is currently unavailable.");
  return response.json();
}

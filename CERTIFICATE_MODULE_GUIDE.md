# EventSphere certificates: implementation and viva guide

This guide describes the certificate MVP in this patch, based on `rajat-branch` commit `56bbd995793de85dd2e17bd9b05f3c5468cd0e2a`. Read the limitations before calling it production-ready.

## 1. Flow from registration to certificate

1. The institution is verified in EventSphere. Organizers and participants register against a verified institution, verify their registration email by OTP and sign in. College affiliation is a separate check from email OTP: the existing rules decide who can publish or access college-only events.
2. An organizer creates an event or activity, subject to the application's existing authorization and affiliation policy. A participant registers. An active registration alone does **not** prove attendance.
3. At entry, staff scan or record attendance. Event entry uses `EVENT_ENTRY`; activity check-in uses `ACTIVITY`. A ticket and its check-in are different things: the ticket identifies registration; the attendance record is evidence that the person checked in.
4. The event or activity must have status `COMPLETED`. In Operations → Certificates, the organizer chooses the scope, reviews eligibility and starts generation. For winners, results must be published and the organizer explicitly confirms the final round.
5. The backend checks ownership and the evidence again, reserves the award, renders HTML as a PDF, stores it privately, and changes the record to `ISSUED`. The participant opens Certificates in their dashboard and downloads their own PDF.
6. Anyone with the certificate number can check its issuance status at the public verification page. This is a **status lookup**, not proof that the document's name, rank, or other text has not been edited.

## 2. Eligibility and the semifinal question

- **Event participation:** event completed; registration is `REGISTERED` or `APPROVED`; matching event-entry check-in exists with a timestamp.
- **Activity participation:** activity completed; active activity registration; the person belongs to the individual registration or the saved team-member snapshot; matching individual activity check-in exists.
- **Winner:** all the activity participation checks, plus an entry in the selected published round's published result with rank 1, 2 or 3. Every tied entry at those ranks qualifies. Each qualifying team member gets a separate certificate only if that member checked in.
- A semifinal participant who did not reach the selected final round does **not** get a winner certificate for that final. They can still receive participation if they meet the attendance and registration rules. Creating multiple rounds does not automatically generate multiple winner certificates.
- Old team registrations without a saved member snapshot are excluded and counted for manual review. Do not guess historical team members from the current team.

## 3. What the main pieces mean

- **Recipient:** the person receiving the certificate, identified by their user ID. Their name is captured as a snapshot so later profile changes do not silently rewrite the existing PDF.
- **Scope:** the event or activity being certified. **Type:** participation or winner.
- **Entitlement:** a database record meaning “this recipient is entitled to this kind of certificate for this scope.” The unique compound index over recipient, type, scope and scope ID stops two requests from reserving the same award. Example: one activity-participation entitlement and one activity-winner entitlement may both exist for the same student, but two activity-winner entitlements for that same activity may not.
- **Certificate number:** a random `ES-` plus UUID-derived identifier printed on the PDF, with a separate unique index. It is not a password or a digital signature.
- **Final-round record:** locks one selected final round per activity as soon as winner issuance begins, even if the first PDF fails. There is no user interface to change it afterwards; verify the selection carefully.
- **Snapshots:** the issued record saves the recipient name, scope name, registration, check-in, rank and source round as applicable. It does not silently update old certificates when the source data later changes.
- **Status:** `PENDING` means reserved or processing, `ISSUED` means available, and `FAILED` means generation failed and can be retried by the organizer while still eligible. A short generation lease stops two workers from completing the same record at once; if a worker disappears, retry after the lease expires. `REVOKED` exists in the model and verification handles it, but there is **no revocation or replacement interface/API in this patch**.

## 4. Backend mechanics

`CertificateWorkflowService` coordinates preview and issuance. The existing event, activity and winner eligibility services inspect registrations, attendance and published results. The workflow reserves the certificate and entitlement in a MongoDB transaction, with write guards intended to detect competing updates. The older `CertificateEntitlementService.reserve()` is retained for reference but is not used by issuance: called alone, it can leave a reservation without a certificate. A unique index is the final duplicate-prevention constraint; checking first without it would race. PDF creation happens outside the database transaction because a filesystem write cannot participate in a MongoDB transaction. A second transaction rechecks eligibility and finalizes the record. A crashed or failed attempt can leave an orphan PDF on disk; periodic reconciliation/cleanup is not implemented.

`CertificatePdfService` fills `templates/certificate.html` using Spring Thymeleaf, then OpenHTMLtoPDF/PDFBox converts the HTML to a one-page PDF. Thymeleaf escapes values; the renderer blocks external resources. Names are currently limited to printable ASCII; unsupported names fail instead of silently producing an incorrect PDF. A proper Unicode font and script-rendering solution is future work.

`CertificateStorageService` stores PDFs by a random UUID filename in a private directory and saves their SHA-256 digest in MongoDB. `Path` represents a filesystem path; the storage service normalizes the configured directory and accepts only UUID filenames rather than user-supplied paths. When a participant downloads, the server hashes the saved PDF again and compares it to the stored hash. A mismatch blocks the download.

**SHA-256 is not a signature.** It detects changes to the stored bytes when the saved digest remains trustworthy. If an attacker can change both file and database, the hash alone cannot prove authenticity. The public status endpoint does not compare an uploaded PDF or display signed recipient details. There is no QR code or cryptographic digital signature in this implementation. Do not claim otherwise in a viva.

## 5. API and access

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/organizer/events/{id}/certificates/eligibility` | Event preview |
| POST | `/api/organizer/events/{id}/certificates/generate` | Issue one event-participation certificate |
| GET | `/api/organizer/activities/{id}/certificates/eligibility?type=PARTICIPATION` | Activity preview; for `WINNER`, also pass `roundId` |
| POST | `/api/organizer/activities/{id}/certificates/generate` | Issue one activity participation or winner certificate |
| GET | `/api/participant/certificates?page=0` | List signed-in participant's issued certificates |
| GET | `/api/participant/certificates/{id}/download` | Download only the signed-in participant's issued PDF |
| GET | `/api/public/certificates/{number}/verify` | Return `ISSUED`, `REVOKED`, or `NOT_FOUND` without requiring login |

For generation the JSON contains `type`, `registrationId`, `participantId`, and for winners, `roundId`. The interface sends one request per eligible person, sequentially; this is not a server-side background batch. Organizer endpoints require the organizer role and ownership of the event/activity. Participant endpoints require the participant role, with recipient ownership checked in the download query. The public response contains status only; it does not expose a PDF or participant profile.

## 6. Setup and demonstration

- Use the project Java version (21) and a MongoDB deployment configured for transactions, such as a replica set. The existing `TransactionRunner` requires transaction support; a standalone MongoDB server is not enough. Configure the project's existing Mongo URI and credentials locally, never commit secrets.
- `FRONTEND_URL` controls the verification URL printed on newly generated PDFs (default `http://localhost:5173`); set it to your real frontend origin before issuance. Set frontend `VITE_API_BASE_URL` to the backend origin and configure the existing CORS setting accordingly. Existing PDFs keep their original URL.
- `CERTIFICATE_STORAGE_DIRECTORY` defaults to `./data/certificates` relative to the backend's working directory. Use a persistent, private directory, backed up with the database. Do not put it in a public static directory or Git. Multi-instance deployments require shared durable storage; this local filesystem design alone is unsuitable for ephemeral containers or independent nodes.
- Start the backend and frontend using the project's existing instructions. Create a completed event and/or activity, register test participants, record the correct type of check-in, and for winners publish a final judging round. Open the organizer Operations → Certificates tab, review, and issue. Sign in as the participant and download. Open the printed verification URL in a signed-out browser.
- Optional Windows test commands: `cd backend` then `mvnw.cmd -Dtest=CertificateOutputTest,CertificateEligibilityRulesTest test`; frontend: `cd frontend` then `npm run build`.

## 7. Honest readiness and operational risks

The focused automated tests cover PDF output and escaping, storage tamper detection and path rejection, event eligibility, team snapshots and attendance, and published-round/rank checks. The UI was exercised using **mock API responses**, not a running production backend. Compilation and these tests do not prove end-to-end behavior, authorization under real JWTs, database index creation, race safety, Mongo transaction behavior, or recovery after a crash. Run those integration tests on your configured replica set before a final demo or deployment.

Other current limits: preview rejects over 500 registrations instead of paginating; bulk generation depends on the browser staying open; no admin correction, revocation, replacement, queue, cleanup job, or rate limiting; no Unicode/complex-script support; no accessible public identity comparison or PDF signature. The certificate date is fixed when the reservation is created in UTC, so a delayed retry can print a date earlier than actual issuance. The existing backend already has tracked PDFs under `backend/data/eventsphere-documents/`: the new ignore rule prevents new untracked files from being added, but **does not remove already tracked files or erase Git history**. Treat real sensitive documents as exposed, review with the repository owner, and remove tracking/history if appropriate.

For production, prioritize a real Mongo-backed end-to-end/security/concurrency test suite, an explicit privacy-reviewed authenticity method (e.g. signed data or minimal comparison fields), Unicode font rendering, operational recovery and revocation, API rate limits, paginated/background generation, and durable shared storage.

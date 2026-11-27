package com.vansh.eventsphere.eventsphere.certificate.services;

import com.vansh.eventsphere.eventsphere.certificate.dto.CertificateApi.*;
import com.vansh.eventsphere.eventsphere.certificate.models.*;
import com.vansh.eventsphere.eventsphere.certificate.repository.*;
import com.vansh.eventsphere.eventsphere.common.transaction.TransactionRunner;
import com.vansh.eventsphere.eventsphere.event.model.*;
import com.vansh.eventsphere.eventsphere.event.repository.*;
import com.vansh.eventsphere.eventsphere.event.service.validators.ActivityOwnershipValidator;
import com.vansh.eventsphere.eventsphere.exception.ApiException;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgingRoundRepository;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import com.vansh.eventsphere.eventsphere.certificate.services.CertificatePdfService.CertificatePdfData;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j
public class CertificateWorkflowService {
    private final EventRepository events;
    private final EventRegistrationRepository eventRegistrations;
    private final ActivityRegistrationRepository activityRegistrations;
    private final UserRepository users;
    private final ActivityOwnershipValidator activityOwnership;
    private final JudgingRoundRepository rounds;
    private final CertificateEligibilityService eventEligibility;
    private final ActivityCertificateEligibilityService activityEligibility;
    private final WinnerCertificateEligibilityService winnerEligibility;
    private final CertificateEntitlementRepository entitlements;
    private final CertificateRepository certificates;
    private final CertificateFinalRoundRepository finalRounds;
    private final CertificateNumberService numbers;
    private final CertificatePdfService pdfs;
    private final CertificateStorageService storage;
    private final TransactionRunner transactions;
    private final MongoTemplate mongo;
    private static final int MAX_PREVIEW = 500;

    private ApiException error(HttpStatus status, String msg) { return new ApiException(msg, status); }
    private Event ownedEvent(String id, String organizer) {
        Event event = events.findById(id).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Event not found"));
        if (!Objects.equals(event.getOrganizerId(), organizer)) throw error(HttpStatus.FORBIDDEN, "You do not manage this event");
        return event;
    }
    private Activity ownedActivity(String id, String organizer) {
        // Use the same ownership rule as the rest of the application.
        try { return activityOwnership.getAndValidateOwnedActivity(id, organizer); }
        catch (org.springframework.security.access.AccessDeniedException e) { throw error(HttpStatus.FORBIDDEN, "You do not manage this activity"); }
    }
    private String name(String userId) { return users.findById(userId).map(u -> u.getName()).filter(n -> !n.isBlank()).orElse(null); }
    private String requiredName(String userId) {
        return users.findById(userId).map(u -> u.getName()).filter(n -> n != null && !n.isBlank())
                .orElseThrow(() -> error(HttpStatus.BAD_REQUEST, "Participant account or name is missing; review the registration"));
    }
    private String existingStatus(String userId, CertificateType type, CertificateScope scope, String scopeId) {
        return entitlements.findByRecipientUserIdAndTypeAndScopeAndScopeId(userId,type,scope,scopeId)
                .flatMap(e -> certificates.findById(e.getCurrentCertificateId()))
                .map(c -> c.getStatus().name()).orElse(null);
    }
    public Preview previewEvent(String id, String organizer) {
        Event event = ownedEvent(id, organizer);
        var registrations = eventRegistrations.findByEventId(id);
        if (registrations.size() > MAX_PREVIEW) throw error(HttpStatus.BAD_REQUEST, "More than 500 registrations; paginated previews are not yet supported");
        List<Candidate> items = new ArrayList<>();
        for (var reg : registrations) {
            if (reg.getParticipantId() == null) continue;
            var eligibility = eventEligibility.checkEventParticipation(id, reg.getParticipantId());
            String recipient = name(reg.getParticipantId());
            items.add(new Candidate(reg.getId(), reg.getParticipantId(), recipient == null ? "Participant account missing" : recipient, eligibility.eligible() && recipient != null, recipient == null ? "PARTICIPANT_NAME_MISSING" : eligibility.reason().name(), existingStatus(reg.getParticipantId(), CertificateType.PARTICIPATION, CertificateScope.EVENT, id)));
        }
        return new Preview(event.getTitle(), String.valueOf(event.getEventStatus()), null, 0, items);
    }
    public Preview previewActivity(String id, String organizer, CertificateType type, String roundId) {
        Activity activity = ownedActivity(id, organizer);
        if (type == null) throw error(HttpStatus.BAD_REQUEST, "Certificate type is required");
        var selection = finalRounds.findById(id).orElse(null);
        if (type == CertificateType.WINNER && (roundId == null || roundId.isBlank()))
            throw error(HttpStatus.BAD_REQUEST, "Select the final published round");
        if (type == CertificateType.WINNER && selection != null && !selection.getRoundId().equals(roundId))
            throw error(HttpStatus.CONFLICT, "Winner certificates are already tied to a different final round");
        var registrations = activityRegistrations.findByActivityId(id);
        if (registrations.size() > MAX_PREVIEW) throw error(HttpStatus.BAD_REQUEST, "More than 500 registrations; paginated previews are not yet supported");
        List<Candidate> items = new ArrayList<>(); int missing = 0;
        for (var reg : registrations) {
            List<String> members;
            if (reg.getRegistrationType() == RegistrationType.TEAM) {
                if (reg.getTeamMemberIds() == null) { missing++; continue; }
                members = reg.getTeamMemberIds();
            } else if (reg.getRegistrationType() == RegistrationType.INDIVIDUAL && reg.getParticipantId() != null) {
                members = List.of(reg.getParticipantId());
            } else continue;
            for (String member : new LinkedHashSet<>(members)) {
                if (member == null || member.isBlank()) continue;
                boolean eligible; String reason;
                if (type == CertificateType.WINNER) {
                    var e = winnerEligibility.checkWinner(id, reg.getId(), member, roundId);
                    eligible = e.eligible(); reason = e.participationReason() == null ? e.reason().name() : e.participationReason().name();
                } else {
                    var e = activityEligibility.checkParticipation(id, reg.getId(), member);
                    eligible = e.eligible(); reason = e.reason().name();
                }
                String recipient = name(member);
                items.add(new Candidate(reg.getId(), member, recipient == null ? "Participant account missing" : recipient, eligible && recipient != null, recipient == null ? "PARTICIPANT_NAME_MISSING" : reason, existingStatus(member, type, CertificateScope.ACTIVITY, id)));
            }
        }
        return new Preview(activity.getName(), String.valueOf(activity.getStatus()), selection == null ? null : selection.getRoundId(), missing, items);
    }
    public CertificateView generateEvent(String id, String organizer, GenerateRequest request) {
        if (request.type() != CertificateType.PARTICIPATION) throw error(HttpStatus.BAD_REQUEST, "Only participation certificates are available for events");
        ownedEvent(id, organizer);
        return generate(CertificateScope.EVENT, id, organizer, request);
    }
    public CertificateView generateActivity(String id, String organizer, GenerateRequest request) {
        ownedActivity(id, organizer);
        return generate(CertificateScope.ACTIVITY, id, organizer, request);
    }
    private CertificateView generate(CertificateScope scope, String scopeId, String organizer, GenerateRequest request) {
        if (request == null || request.type() == null || request.registrationId() == null || request.participantId() == null)
            throw error(HttpStatus.BAD_REQUEST, "Certificate type, registration and participant are required");
        Certificate existing = current(request.participantId(), request.type(), scope, scopeId);
        if (existing != null) {
            if (request.type() == CertificateType.WINNER && !Objects.equals(existing.getSourceRoundId(), request.roundId()))
                throw error(HttpStatus.CONFLICT, "A different final round was already selected");
            if (existing.getStatus() == CertificateStatus.ISSUED) return CertificateView.of(existing);
            if (existing.getStatus() == CertificateStatus.REVOKED) throw error(HttpStatus.CONFLICT, "Certificate revoked; replacement is not available yet");
            return process(existing.getId(), organizer);
        }
        String certId = UUID.randomUUID().toString(), entitlementId = UUID.randomUUID().toString(), number = numbers.generate();
        try {
            Certificate created = transactions.run(() -> {
                // Guard the scope and registration against concurrent changes.
                if (scope == CertificateScope.EVENT) transactions.guard(Event.class, scopeId);
                else transactions.guard(Activity.class, scopeId);
                if (scope == CertificateScope.EVENT) transactions.guard(EventRegistration.class, request.registrationId());
                else transactions.guard(ActivityRegistration.class, request.registrationId());
                Evidence e = evidence(scope, scopeId, organizer, request);
                if (request.type() == CertificateType.WINNER) {
                    CertificateFinalRound selected = finalRounds.findById(scopeId).orElse(null);
                    if (selected == null) finalRounds.insert(CertificateFinalRound.builder().activityId(scopeId).roundId(request.roundId()).selectedBy(organizer).selectedAt(Instant.now()).build());
                    else if (!Objects.equals(selected.getRoundId(), request.roundId())) throw error(HttpStatus.CONFLICT, "Winner certificates are already tied to a different final round");
                }
                Instant now = Instant.now();
                var entitlement = CertificateEntitlement.builder().id(entitlementId).recipientUserId(request.participantId()).type(request.type()).scope(scope).scopeId(scopeId).currentCertificateId(certId).updatedAt(now).build();
                var certificate = Certificate.builder().id(certId).certificateNumber(number).entitlementId(entitlementId)
                        .type(request.type()).scope(scope).status(CertificateStatus.PENDING).recipientUserId(request.participantId())
                        .recipientName(requiredName(request.participantId())).eventId(e.eventId()).activityId(scope == CertificateScope.ACTIVITY ? scopeId : null)
                        .registrationId(request.registrationId()).attendanceId(e.attendanceId()).rank(e.rank()).teamName(e.teamName())
                        .sourceRoundId(request.type() == CertificateType.WINNER ? request.roundId() : null).issuedByUserId(organizer)
                        .createdAt(now).certificateDate(LocalDate.ofInstant(now, ZoneOffset.UTC)).scopeNameSnapshot(e.scopeName()).pdfTemplateVersion("v1").build();
                entitlements.insert(entitlement);
                return certificates.insert(certificate);
            });
            return process(created.getId(), organizer);
        } catch (DuplicateKeyException ex) {
            // Duplicate inserts abort MongoDB transactions; read only after it has ended.
            Certificate after = current(request.participantId(), request.type(), scope, scopeId);
            if (after == null) throw error(HttpStatus.CONFLICT, "Concurrent change or certificate-number collision. Refresh and retry.");
            if (request.type() == CertificateType.WINNER && !Objects.equals(after.getSourceRoundId(), request.roundId())) throw error(HttpStatus.CONFLICT, "A different final round was already selected");
            if (after.getStatus() == CertificateStatus.ISSUED) return CertificateView.of(after);
            if (after.getStatus() == CertificateStatus.REVOKED) throw error(HttpStatus.CONFLICT, "Certificate revoked; replacement is not available yet");
            return process(after.getId(), organizer);
        }
    }
    private Certificate current(String user, CertificateType type, CertificateScope scope, String scopeId) {
        return entitlements.findByRecipientUserIdAndTypeAndScopeAndScopeId(user, type, scope, scopeId)
                .map(e -> certificates.findById(e.getCurrentCertificateId()).orElseThrow(() -> error(HttpStatus.CONFLICT, "Incomplete reservation requires administrator review")))
                .orElse(null);
    }
    private record Evidence(String scopeName, String eventId, String attendanceId, Integer rank, String teamName) {}
    private Evidence evidence(CertificateScope scope, String id, String organizer, GenerateRequest request) {
        if (scope == CertificateScope.EVENT) {
            Event event = ownedEvent(id, organizer);
            var e = eventEligibility.checkEventParticipation(id, request.participantId());
            if (!e.eligible() || !Objects.equals(e.registrationId(), request.registrationId())) throw error(HttpStatus.BAD_REQUEST, "Not eligible: " + e.reason());
            return new Evidence(event.getTitle(), id, e.attendanceId(), null, null);
        }
        Activity activity = ownedActivity(id, organizer);
        if (request.type() == CertificateType.WINNER) {
            if (request.roundId() == null || request.roundId().isBlank()) throw error(HttpStatus.BAD_REQUEST, "Select the final published round");
            var e = winnerEligibility.checkWinner(id, request.registrationId(), request.participantId(), request.roundId());
            if (!e.eligible()) throw error(HttpStatus.BAD_REQUEST, "Not eligible: " + (e.participationReason() == null ? e.reason() : e.participationReason()));
            return new Evidence(activity.getName(), activity.getEventId(), e.attendanceId(), e.rank(), e.teamName());
        }
        var e = activityEligibility.checkParticipation(id, request.registrationId(), request.participantId());
        if (!e.eligible()) throw error(HttpStatus.BAD_REQUEST, "Not eligible: " + e.reason());
        // No historical team-name snapshot exists for participation registrations.
        return new Evidence(activity.getName(), activity.getEventId(), e.attendanceId(), null, null);
    }
    private CertificateView process(String id, String organizer) {
        String token = UUID.randomUUID().toString(); Instant now = Instant.now();
        Query claim = Query.query(new Criteria().andOperator(Criteria.where("_id").is(id), Criteria.where("status").in(CertificateStatus.PENDING, CertificateStatus.FAILED), new Criteria().orOperator(Criteria.where("generationLeaseUntil").exists(false), Criteria.where("generationLeaseUntil").is(null), Criteria.where("generationLeaseUntil").lt(now))));
        Certificate c = mongo.findAndModify(claim, new Update().set("status", CertificateStatus.PENDING).set("generationToken", token).set("generationLeaseUntil", now.plusSeconds(120)).unset("failureMessage"), FindAndModifyOptions.options().returnNew(true), Certificate.class);
        if (c == null) {
            Certificate latest = certificates.findById(id).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Certificate not found"));
            if (latest.getStatus() == CertificateStatus.ISSUED) return CertificateView.of(latest);
            throw error(HttpStatus.CONFLICT, "Certificate generation is already in progress; refresh shortly");
        }
        try {
            byte[] pdf = pdfs.generate(new CertificatePdfData(c.getRecipientName(), c.getScopeNameSnapshot(), c.getType(), c.getRank(), c.getTeamName(), c.getCertificateDate(), c.getCertificateNumber()));
            // Each attempt has its own file, so a timed-out worker cannot overwrite a newer file.
            var stored = storage.store(UUID.randomUUID().toString(), pdf);
            Certificate completed = transactions.run(() -> {
                if (c.getScope() == CertificateScope.EVENT) transactions.guard(Event.class, c.getEventId());
                else transactions.guard(Activity.class, c.getActivityId());
                if (c.getScope() == CertificateScope.EVENT) transactions.guard(EventRegistration.class, c.getRegistrationId());
                else transactions.guard(ActivityRegistration.class, c.getRegistrationId());
                var request = new GenerateRequest(c.getType(), c.getRegistrationId(), c.getRecipientUserId(), c.getSourceRoundId());
                Evidence checked = evidence(c.getScope(), c.getScope() == CertificateScope.EVENT ? c.getEventId() : c.getActivityId(), organizer, request);
                if (!Objects.equals(checked.attendanceId(), c.getAttendanceId()) || !Objects.equals(checked.rank(), c.getRank()))
                    throw error(HttpStatus.CONFLICT, "Eligibility changed during generation. Review and retry.");
                Query match = Query.query(Criteria.where("_id").is(id).and("status").is(CertificateStatus.PENDING).and("generationToken").is(token));
                Certificate saved = mongo.findAndModify(match, new Update().set("status", CertificateStatus.ISSUED).set("issuedAt", Instant.now()).set("pdfStorageKey", stored.storageKey()).set("pdfSha256", stored.sha256()).unset("generationToken").unset("generationLeaseUntil"), FindAndModifyOptions.options().returnNew(true), Certificate.class);
                if (saved == null) throw error(HttpStatus.CONFLICT, "Generation lease changed; refresh and retry");
                return saved;
            });
            return CertificateView.of(completed);
        } catch (Exception ex) {
            // A transaction with an unknown commit result may already have succeeded. Never undo ISSUED.
            mongo.updateFirst(Query.query(Criteria.where("_id").is(id).and("status").is(CertificateStatus.PENDING).and("generationToken").is(token)), new Update().set("status", CertificateStatus.FAILED).set("failureMessage", "Generation failed; retry after reviewing the source data").unset("generationToken").unset("generationLeaseUntil"), Certificate.class);
            log.warn("Certificate generation failed for {}", id, ex);
            if (ex instanceof ApiException api) throw api;
            throw error(HttpStatus.INTERNAL_SERVER_ERROR, "Could not generate the certificate. Check the participant and event names, then retry.");
        }
    }
}

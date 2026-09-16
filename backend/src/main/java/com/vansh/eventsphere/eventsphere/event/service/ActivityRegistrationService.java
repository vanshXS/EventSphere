package com.vansh.eventsphere.eventsphere.event.service;

import com.vansh.eventsphere.eventsphere.common.transaction.TransactionRunner;
import com.vansh.eventsphere.eventsphere.event.dto.ActivityRegistrationRequest;
import com.vansh.eventsphere.eventsphere.event.dto.ActivityRegistrationResponse;
import com.vansh.eventsphere.eventsphere.event.dto.OrganizerRegistrationResponse;
import com.vansh.eventsphere.eventsphere.event.model.*;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRegistrationRepository;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRepository;
import com.vansh.eventsphere.eventsphere.event.repository.EventRepository;
import com.vansh.eventsphere.eventsphere.event.repository.TeamRepository;
import com.vansh.eventsphere.eventsphere.event.service.mappers.ActivityRegistrationMapper;
import com.vansh.eventsphere.eventsphere.event.service.validators.ActivityRegistrationValidator;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityRegistrationService {

    private final ActivityRegistrationMapper mapper;
    private final ActivityRegistrationRepository activityRegistrationRepository;
    private final ActivityRepository activityRepository;
    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final TeamRepository teamRepository;
    private final VisibilityService visibilityService;
    private final ActivityRegistrationValidator validator;
    private final MongoTemplate mongoTemplate;
    private final TransactionRunner transactionRunner;


    public ActivityRegistrationResponse register(
            String activityId,
            String participantId,
            ActivityRegistrationRequest request
    ) {
        return transactionRunner.run(() -> {
            guardActivity(activityId);
            return registerInsideTransaction(activityId, participantId, request);
        });
    }
    public ActivityRegistrationResponse registerInsideTransaction(
            String activityId,
            String participantId,
            ActivityRegistrationRequest request
    ) {
        log.info("ActivityRegistrationService.register called for activityId: {}, participantId: {}", activityId, participantId);

        User participant = getUser(participantId);
        Activity activity = getActivity(activityId);

        if (activity.getEventId() != null) {
            Event event = getEvent(activity.getEventId());
            if (!visibilityService.canViewEvent(event, participant)) {
                throw new BadRequestException("You are not allowed to register for this activity.");
            }
            validateRegistrationLifecycle(event.getEventStatus());
        } else {
            User organizer = activity.getOrganizerId() != null
                    ? userRepository.findById(activity.getOrganizerId()).orElse(null)
                    : null;
            if (!visibilityService.canViewStandAloneActivity(activity, organizer, participant)) {
                throw new BadRequestException("You are not allowed to register for this activity.");
            }
            validateRegistrationLifecycle(activity.getStatus());
        }

        validator.validateRegistrationDeadline(activity);
        validator.validateRegistrationType(activity, request.getRegistrationType());

        Team team = validator.validateTeamRequirements(activity, request, participantId);

        validator.validateDuplicateRegistration(activityId, participantId, request, team);
        validator.validateCapacity(activity);

        RegistrationStatus initialStatus = activity.isRequiresApproval()
                ? RegistrationStatus.PENDING
                : RegistrationStatus.APPROVED;

        ActivityRegistration registration = ActivityRegistration.builder()
                .activityId(activity.getId())
                .eventId(activity.getEventId())
                .participantId(participantId)
                .registrationType(request.getRegistrationType())
                .teamId(request.getTeamId())
                .teamMemberIds(team == null ? null : List.copyOf(team.getMembersId()))
                .teamLeaderId(team == null ? null : team.getLeaderId())
                .status(initialStatus)
                .registeredAt(LocalDateTime.now())
                .build();

        ActivityRegistration saved = activityRegistrationRepository.save(registration);
        return enrichRegistrationResponse(saved);
    }

    public List<ActivityRegistrationResponse> getMyRegistrations(String participantId) {
        log.info("ActivityRegistrationService.getMyRegistrations called for participant: {}",
                participantId);

        List<ActivityRegistration> registrations = activityRegistrationRepository
                .findByParticipantIdOrTeamMemberIdsContaining(participantId, participantId);

        return registrations.stream()
                .map(this::enrichRegistrationResponse)
                .toList();
    }

    public ActivityRegistrationResponse cancelRegistration(String registrationId, String participantId) {
        log.info("ActivityRegistrationService.cancelRegistration called for registrationId: {} by participant: {}", registrationId, participantId);

        ActivityRegistration registration = activityRegistrationRepository.findById(registrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Registration not found"));

        RegistrationStatus status = registration.getStatus();

        if (!registration.getParticipantId().equals(participantId)) {

            boolean isTeamMember = registration.getTeamMemberIds() != null
                    && registration.getTeamMemberIds().contains(participantId);

            if (isTeamMember) {
                throw new BadRequestException(
                        "Only the team leader can cancel this team registration."
                );
            }

            throw new BadRequestException("You can only cancel your own registration.");
        }

        if (status == RegistrationStatus.CANCELLED) {
            throw new BadRequestException("Registration is already cancelled.");
        }

        if(status != RegistrationStatus.PENDING
        && status != RegistrationStatus.APPROVED
        && status != RegistrationStatus.REGISTERED) {
            throw new BadRequestException(
                    "Only pending or approval registration can be cancelled"
            );
        }

        Query query = Query.query(
                Criteria.where("id").is(registrationId)
                        .and("participantId").is(participantId)
                        .and("status").in(
                                RegistrationStatus.PENDING,
                                RegistrationStatus.APPROVED,
                                RegistrationStatus.REGISTERED
                        )
        );

        Update update = new Update()
                .set("status", RegistrationStatus.CANCELLED);

        ActivityRegistration updated = mongoTemplate.findAndModify(
                query,
                update,
                FindAndModifyOptions.options().returnNew(true),
                ActivityRegistration.class
        );

        if (updated == null) {
            throw new BadRequestException(
                    "This registration can no longer be cancelled. Refresh and try again."
            );
        }

        return enrichRegistrationResponse(updated);
    }

    public OrganizerRegistrationResponse approveRegistration(
            String registrationId,
            String organizerId
    ) {
        return reviewRegistration(
                registrationId,
                organizerId,
                RegistrationStatus.APPROVED,
                null
        );
    }

    public OrganizerRegistrationResponse rejectRegistration(
            String registrationId,
            String organizerId,
            String reason
    ) {
        return reviewRegistration(
                registrationId,
                organizerId,
                RegistrationStatus.REJECTED,
                reason
        );
    }

    private ActivityRegistrationResponse enrichRegistrationResponse(ActivityRegistration reg) {
        ActivityRegistrationResponse res = mapper.mapToResponse(reg);

        if (reg.getActivityId() != null) {
            Activity act = activityRepository.findById(reg.getActivityId()).orElse(null);
            if (act != null) {
                res.setActivityName(act.getName());
                res.setActivityType(act.getType());
                res.setStartDateTime(act.getStartDateTime());
                res.setEndDateTime(act.getEndDateTime());
                res.setLocation(act.getLocation());
            }
        }

        if (reg.getEventId() != null) {
            Event event = eventRepository.findById(reg.getEventId()).orElse(null);
            if (event != null) {
                res.setEventName(event.getTitle());
            }
        }

        if (reg.getTeamId() != null) {
            Team team = teamRepository.findById(reg.getTeamId()).orElse(null);
            if (team != null) {
                res.setTeamName(team.getName());
            }
        }

        res.setTeamMemberIds(reg.getTeamMemberIds());
        res.setTeamLeaderId(reg.getTeamLeaderId());

        return res;
    }

    public List<OrganizerRegistrationResponse> getRegistrationsForActivity(String activityId, String organizerId) {
        log.info("ActivityRegistrationService.getRegistrationsForActivity called for activityId: {} by organizer: {}", activityId, organizerId);

        Activity activity = getActivity(activityId);

        if (!organizerId.equals(activity.getOrganizerId())) {
            throw new BadRequestException("You are not allowed to view registrations for this activity.");
        }

        List<ActivityRegistration> registrations = activityRegistrationRepository.findByActivityId(activityId);

        return registrations.stream()
                .map(this::mapToOrganizerResponse)
                .toList();
    }

    private OrganizerRegistrationResponse mapToOrganizerResponse(ActivityRegistration reg) {
        User participant = userRepository.findById(reg.getParticipantId()).orElse(null);
        String participantName = participant != null ? participant.getName() : null;
        String participantEmail = participant != null ? participant.getEmail() : null;

        String teamName = null;
        List<String> teamMemberIds = reg.getTeamMemberIds();

        if (reg.getTeamId() != null) {
            Team team = teamRepository.findById(reg.getTeamId()).orElse(null);
            if (team != null) {
                teamName = team.getName();

                // Pre-snapshot rows fall back to the current roster.
                if (teamMemberIds == null) {
                    teamMemberIds = team.getMembersId();
                }
            }
        }

        return OrganizerRegistrationResponse.builder()
                .id(reg.getId())
                .activityId(reg.getActivityId())
                .eventId(reg.getEventId())
                .participantId(reg.getParticipantId())
                .participantName(participantName)
                .participantEmail(participantEmail)
                .registrationType(reg.getRegistrationType())
                .status(reg.getStatus())
                .registeredAt(reg.getRegisteredAt())
                .reviewedBy(reg.getReviewedBy())
                .reviewedAt(reg.getReviewedAt())
                .reviewNote(reg.getReviewNote())
                .teamId(reg.getTeamId())
                .teamName(teamName)
                .teamMemberIds(teamMemberIds)
                .build();
    }

    // Helper functions
    private Activity getActivity(String activityId) {
        return activityRepository.findById(activityId)
                .orElseThrow(() -> new ResourceNotFoundException("Activity not found"));
    }

    private User getUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Event getEvent(String eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));
    }

    private void validateRegistrationLifecycle(EventStatus status) {
        if (status != EventStatus.PUBLISHED && status != EventStatus.ONGOING) {
            throw new BadRequestException(
                    "Registration is not available for this activity."
            );
        }
    }

    private OrganizerRegistrationResponse reviewRegistration(
            String registrationId,
            String organizerId,
            RegistrationStatus decision,
            String note
    ) {
        ActivityRegistration registration = activityRegistrationRepository
                .findById(registrationId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Registration not found.")
                );

        Activity activity = getActivity(registration.getActivityId());

        Event parentEvent = activity.getEventId() != null
                ? getEvent(activity.getEventId())
                : null;

        String ownerId = parentEvent != null
                ? parentEvent.getOrganizerId()
                : activity.getOrganizerId();

        if (organizerId == null || !organizerId.equals(ownerId)) {
            throw new BadRequestException(
                    "You are not allowed to review this registration."
            );
        }

        if (registration.getStatus() != RegistrationStatus.PENDING) {
            throw new BadRequestException(
                    "Only pending registrations can be approved or rejected."
            );
        }

        LocalDateTime now = LocalDateTime.now();

        if (decision == RegistrationStatus.APPROVED) {
            validateRegistrationLifecycle(
                    parentEvent != null
                            ? parentEvent.getEventStatus()
                            : activity.getStatus()
            );

            if (activity.getEndDateTime() != null
                    && !activity.getEndDateTime().isAfter(now)) {
                throw new BadRequestException(
                        "Registrations cannot be approved after the activity has ended."
                );
            }
        }

        String reviewNote = note == null ? null : note.trim();

        if (reviewNote != null && reviewNote.isEmpty()) {
            reviewNote = null;
        }

        if (reviewNote != null && reviewNote.length() > 500) {
            throw new BadRequestException(
                    "Review note cannot exceed 500 characters."
            );
        }

        Query query = Query.query(
                Criteria.where("id").is(registrationId)
                        .and("status").is(RegistrationStatus.PENDING)
        );

        Update update = new Update()
                .set("status", decision)
                .set("reviewedBy", organizerId)
                .set("reviewedAt", now)
                .set("reviewNote", reviewNote);

        ActivityRegistration updated = mongoTemplate.findAndModify(
                query,
                update,
                FindAndModifyOptions.options().returnNew(true),
                ActivityRegistration.class
        );

        if (updated == null) {
            throw new BadRequestException(
                    "This registration changed while you were reviewing it. Refresh and try again."
            );
        }

        log.info(
                "Registration {} reviewed by organizer {}: {}",
                registrationId,
                organizerId,
                decision
        );

        return mapToOrganizerResponse(updated);
    }

    private void guardActivity(String activityId) {
        if (!activityRepository.existsById(activityId)) {
            throw new ResourceNotFoundException("Activity not found");
        }

        transactionRunner.guard(Activity.class, activityId);
    }

}

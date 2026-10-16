package com.vansh.eventsphere.eventsphere.event.service;

import com.vansh.eventsphere.eventsphere.common.transaction.TransactionRunner;
import com.vansh.eventsphere.eventsphere.event.dto.ActivityRegistrationRequest;
import com.vansh.eventsphere.eventsphere.event.dto.ActivityRegistrationResponse;
import com.vansh.eventsphere.eventsphere.event.dto.OrganizerRegistrationResponse;
import com.vansh.eventsphere.eventsphere.event.dto.TicketResponse;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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
    private final TicketService ticketService;

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
        User participant = getUser(participantId);
        Activity activity = getActivity(activityId);

        LocalDateTime now = LocalDateTime.now();

        if (activity.getEventId() != null) {
            Event event = getEvent(activity.getEventId());
            if (!visibilityService.canViewEvent(event, participant)) {
                throw new BadRequestException(
                        "You are not allowed to register for this activity."
                );
            }
            if (event.getEventStatus() == EventStatus.CANCELLED) {
                throw new BadRequestException("Registration is closed because the event is cancelled.");
            }
            if (event.getEventStatus() == EventStatus.COMPLETED
                    || (event.getEndDateTime() != null && !event.getEndDateTime().isAfter(now))) {
                throw new BadRequestException("Registration is closed because the event has ended.");
            }
            validateRegistrationLifecycle(event.getEventStatus());
        } else {
            User organizer = activity.getOrganizerId() != null
                    ? userRepository.findById(activity.getOrganizerId()).orElse(null)
                    : null;

            if (!visibilityService.canViewStandAloneActivity(
                    activity,
                    organizer,
                    participant
            )) {
                throw new BadRequestException(
                        "You are not allowed to register for this activity."
                );
            }
        }

        // Validate activity-level status and timing
        if (activity.getStatus() == EventStatus.COMPLETED
                || activity.getActualEndDateTime() != null
                || (activity.getEndDateTime() != null && !activity.getEndDateTime().isAfter(now))) {
            throw new BadRequestException("Registration is closed because this activity has ended.");
        }

        if (activity.getStatus() == EventStatus.ONGOING || activity.getActualStartDateTime() != null) {
            throw new BadRequestException("Registration is closed because this activity is already in progress.");
        }

        if (activity.getStatus() == EventStatus.CANCELLED) {
            throw new BadRequestException("Registration is closed because this activity is cancelled.");
        }

        if (activity.getStatus() == EventStatus.DRAFT) {
            throw new BadRequestException("Registration is not available for draft activities.");
        }

        validator.validateRegistrationDeadline(activity);
        validator.validateRegistrationType(activity, request.getRegistrationType());

        Team team = validator.validateTeamRequirements(
                activity,
                request,
                participantId
        );

        validator.validateDuplicateRegistration(
                activityId,
                participantId,
                request,
                team
        );

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
                .teamMemberIds(team == null
                        ? null
                        : List.copyOf(team.getMembersId()))
                .teamLeaderId(team == null ? null : team.getLeaderId())
                .status(initialStatus)
                .registeredAt(LocalDateTime.now())
                .build();

        ActivityRegistration saved = activityRegistrationRepository.save(registration);

        /*
         * Issue tickets for participants.
         * For activities under an event, this also ensures an Event Entry Ticket.
         */
        if (initialStatus == RegistrationStatus.APPROVED
                || initialStatus == RegistrationStatus.REGISTERED) {
            ticketService.ensureTicketsForActivityRegistration(saved);
        }

        return enrichRegistrationResponse(saved, participantId);
    }

    public List<ActivityRegistrationResponse> getMyRegistrations(
            String participantId
    ) {
        /*
         * A team registration is owned by the team, not by the leader's user
         * account. Team membership can legitimately change after registration,
         * so we resolve the participant's current teams as well as the
         * registration's stored member snapshot.
         */
        Map<String, ActivityRegistration> registrations = new LinkedHashMap<>();

        activityRegistrationRepository
                .findByParticipantIdOrTeamMemberIdsContaining(
                        participantId,
                        participantId
                )
                .forEach(registration ->
                        registrations.put(registration.getId(), registration)
                );

        List<String> teamIds = teamRepository
                .findByMembersIdContaining(participantId)
                .stream()
                .map(Team::getId)
                .filter(id -> id != null && !id.isBlank())
                .toList();

        if (!teamIds.isEmpty()) {
            activityRegistrationRepository
                    .findByTeamIdIn(teamIds)
                    .forEach(registration ->
                            registrations.put(registration.getId(), registration)
                    );
        }

        return registrations.values()
                .stream()
                .map(registration -> enrichRegistrationResponse(
                        registration,
                        participantId
                ))
                .toList();
    }

    public ActivityRegistrationResponse cancelRegistration(
            String registrationId,
            String participantId
    ) {
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

        if (status != RegistrationStatus.PENDING
                && status != RegistrationStatus.APPROVED
                && status != RegistrationStatus.REGISTERED) {
            throw new BadRequestException(
                    "Only pending or approved registrations can be cancelled."
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

        ActivityRegistration updated = mongoTemplate.findAndModify(
                query,
                new Update().set("status", RegistrationStatus.CANCELLED),
                FindAndModifyOptions.options().returnNew(true),
                ActivityRegistration.class
        );

        if (updated == null) {
            throw new BadRequestException(
                    "This registration can no longer be cancelled. Refresh and try again."
            );
        }

        ticketService.revokeActivityRegistration(updated);

        return enrichRegistrationResponse(updated, participantId);
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

    private ActivityRegistrationResponse enrichRegistrationResponse(
            ActivityRegistration reg,
            String viewerParticipantId
    ) {
        ActivityRegistrationResponse res = mapper.mapToResponse(reg);

        Activity activity = activityRepository.findById(reg.getActivityId()).orElse(null);
        if (activity != null) {
            res.setActivityName(activity.getName());
            res.setActivityType(activity.getType());
            res.setStartDateTime(activity.getStartDateTime());
            res.setEndDateTime(activity.getEndDateTime());
            res.setLocation(activity.getLocation());
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
                res.setTeamMemberIds(team.getMembersId());
                res.setTeamLeaderId(team.getLeaderId());
            } else {
                res.setTeamMemberIds(reg.getTeamMemberIds());
                res.setTeamLeaderId(reg.getTeamLeaderId());
            }
        } else {
            res.setTeamMemberIds(reg.getTeamMemberIds());
            res.setTeamLeaderId(reg.getTeamLeaderId());
        }

        if (reg.getStatus() == RegistrationStatus.APPROVED
                || reg.getStatus() == RegistrationStatus.REGISTERED) {
            res.setTicket(
                    ticketService.getOrIssueActivityTicket(
                            reg.getId(),
                            viewerParticipantId
                    )
            );

            if (reg.getEventId() != null && !reg.getEventId().isBlank()) {
                EventRegistration eventReg = ticketService.getOrEnsureEventRegistration(
                        reg.getEventId(),
                        viewerParticipantId
                );
                TicketResponse eventTicket = ticketService.ensureEventEntryTicket(
                        reg.getEventId(),
                        viewerParticipantId,
                        eventReg.getId()
                );
                res.setEventTicket(eventTicket);
            }
        }

        return res;
    }

    public List<OrganizerRegistrationResponse> getRegistrationsForActivity(
            String activityId,
            String organizerId
    ) {
        Activity activity = getActivity(activityId);

        String ownerId = activity.getEventId() != null
                ? getEvent(activity.getEventId()).getOrganizerId()
                : activity.getOrganizerId();

        if (!organizerId.equals(ownerId)) {
            throw new BadRequestException(
                    "You are not allowed to view registrations for this activity."
            );
        }

        return activityRegistrationRepository.findByActivityId(activityId)
                .stream()
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
            if (parentEvent != null) {
                if (parentEvent.getEventStatus() == EventStatus.CANCELLED) {
                    throw new BadRequestException(
                            "Registrations cannot be approved because the event is cancelled."
                    );
                }
                if (parentEvent.getEventStatus() == EventStatus.COMPLETED
                        || (parentEvent.getEndDateTime() != null && !parentEvent.getEndDateTime().isAfter(now))) {
                    throw new BadRequestException(
                            "Registrations cannot be approved because the event has ended or is completed."
                    );
                }
                validateRegistrationLifecycle(parentEvent.getEventStatus());
            }

            if (activity.getStatus() == EventStatus.COMPLETED
                    || activity.getActualEndDateTime() != null
                    || (activity.getEndDateTime() != null && !activity.getEndDateTime().isAfter(now))) {
                throw new BadRequestException(
                        "Registrations cannot be approved after the activity has ended."
                );
            }

            if (activity.getStatus() == EventStatus.CANCELLED) {
                throw new BadRequestException(
                        "Registrations cannot be approved for a cancelled activity."
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

        if (decision == RegistrationStatus.APPROVED) {
            ticketService.ensureTicketsForActivityRegistration(updated);
        } else if (decision == RegistrationStatus.REJECTED) {
            ticketService.revokeActivityRegistration(updated);
        }

        return mapToOrganizerResponse(updated);
    }

    private void guardActivity(String activityId) {
        if (!activityRepository.existsById(activityId)) {
            throw new ResourceNotFoundException("Activity not found");
        }

        transactionRunner.guard(Activity.class, activityId);
    }
}

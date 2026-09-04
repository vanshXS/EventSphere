package com.vansh.eventsphere.eventsphere.event.service;

import com.vansh.eventsphere.eventsphere.event.dto.ActivityRegistrationRequest;
import com.vansh.eventsphere.eventsphere.event.dto.ActivityRegistrationResponse;
import com.vansh.eventsphere.eventsphere.event.dto.OrganizerRegistrationResponse;
import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.event.model.ActivityRegistration;
import com.vansh.eventsphere.eventsphere.event.model.Event;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationStatus;
import com.vansh.eventsphere.eventsphere.event.model.Team;
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

    public ActivityRegistrationResponse register(
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
        } else {
            User organizer = activity.getOrganizerId() != null
                    ? userRepository.findById(activity.getOrganizerId()).orElse(null)
                    : null;
            if (!visibilityService.canViewStandAloneActivity(activity, organizer, participant)) {
                throw new BadRequestException("You are not allowed to register for this activity.");
            }
        }

        validator.validateRegistrationDeadline(activity);
        validator.validateRegistrationType(activity, request.getRegistrationType());
        validator.validateTeamRequirements(activity, request, participantId);
        validator.validateDuplicateRegistration(
                activityId,
                participantId,
                request
        );
        validator.validateCapacity(activity);

        ActivityRegistration registration = ActivityRegistration.builder()
                .activityId(activity.getId())
                .eventId(activity.getEventId())
                .participantId(participantId)
                .registrationType(request.getRegistrationType())
                .teamId(request.getTeamId())
                .status(RegistrationStatus.REGISTERED)
                .registeredAt(LocalDateTime.now())
                .build();

        ActivityRegistration saved = activityRegistrationRepository.save(registration);
        return enrichRegistrationResponse(saved);
    }

    public List<ActivityRegistrationResponse> getMyRegistrations(String participantId) {
        log.info("ActivityRegistrationService.getMyRegistrations called for participant: {}", participantId);
        List<ActivityRegistration> registrations = activityRegistrationRepository.findByParticipantId(participantId);
        return registrations.stream()
                .map(this::enrichRegistrationResponse)
                .toList();
    }

    public ActivityRegistrationResponse cancelRegistration(String registrationId, String participantId) {
        log.info("ActivityRegistrationService.cancelRegistration called for registrationId: {} by participant: {}", registrationId, participantId);

        ActivityRegistration registration = activityRegistrationRepository.findById(registrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Registration not found"));

        if (!registration.getParticipantId().equals(participantId)) {
            throw new BadRequestException("You can only cancel your own registration.");
        }

        if (registration.getStatus() == RegistrationStatus.CANCELLED) {
            throw new BadRequestException("Registration is already cancelled.");
        }

        registration.setStatus(RegistrationStatus.CANCELLED);
        ActivityRegistration updated = activityRegistrationRepository.save(registration);
        return enrichRegistrationResponse(updated);
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
        List<String> teamMemberIds = null;
        if (reg.getTeamId() != null) {
            Team team = teamRepository.findById(reg.getTeamId()).orElse(null);
            if (team != null) {
                teamName = team.getName();
                teamMemberIds = team.getMembersId();
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
}

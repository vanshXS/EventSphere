package com.vansh.eventsphere.eventsphere.event.service;

import com.vansh.eventsphere.eventsphere.common.transaction.TransactionRunner;
import com.vansh.eventsphere.eventsphere.event.dto.ActivityResponse;
import com.vansh.eventsphere.eventsphere.event.dto.CreateActivityRequest;
import com.vansh.eventsphere.eventsphere.event.dto.UpdateActivityRequest;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationStatus;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRegistrationRepository;
import com.vansh.eventsphere.eventsphere.event.service.mappers.ActivityMapper;
import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.event.model.Event;
import com.vansh.eventsphere.eventsphere.event.model.EventStatus;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRepository;
import com.vansh.eventsphere.eventsphere.event.repository.EventRepository;
import com.vansh.eventsphere.eventsphere.event.repository.EventRegistrationRepository;
import com.vansh.eventsphere.eventsphere.event.service.validators.ActivityValidator;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ActivityService {

    private final ActivityRepository activityRepository;
    private final ActivityValidator activityValidator;
    private final EventRepository eventRepository;
    private final ActivityMapper activityMapper;
    private final TransactionRunner transactionRunner;
    private final ActivityRegistrationRepository activityRegistrationRepository;
    private final EventRegistrationRepository eventRegistrationRepository;

    private static final List<RegistrationStatus> CAPACITY_STATUSES = List.of(
            RegistrationStatus.PENDING,
            RegistrationStatus.APPROVED,
            RegistrationStatus.REGISTERED
    );


    // =========================================================
    // CREATE ACTIVITY INSIDE EVENT
    // =========================================================

    public ActivityResponse createActivity(
            CreateActivityRequest request,
            String eventId,
            String organizerId
    ) {

        return transactionRunner.run(() -> {
            transactionRunner.guard(Event.class, eventId);

            Event event = getOwnedEvent(eventId, organizerId);

            if (eventRegistrationRepository.existsByEventIdAndStatusIn(
                    eventId,
                    CAPACITY_STATUSES
            )) {
                throw new BadRequestException(
                        "Activities cannot be added after participants have registered for event entry."
                );
            }

            activityValidator.validate(request, event);

            Activity activity = buildActivity(
                    request,
                    eventId,
                    organizerId
            );

            return activityMapper.mapToResponse(
                    activityRepository.save(activity)
            );
        });
    }


    // =========================================================
    // CREATE STANDALONE ACTIVITY
    // =========================================================

    public ActivityResponse createStandaloneActivity(
            CreateActivityRequest request,
            String organizerId
    ) {

        activityValidator.validate(request, null);

        Activity activity = buildActivity(
                request,
                null,
                organizerId
        );

        return activityMapper.mapToResponse(
                activityRepository.save(activity)
        );
    }


    // =========================================================
    // GET ACTIVITIES BY EVENT
    // =========================================================

    public List<ActivityResponse> getActivitiesByEvent(
            String eventId,
            String organizerId
    ) {

        getOwnedEvent(eventId, organizerId);

        List<Activity> activities =
                activityRepository.findByEventId(eventId);

        return activities.stream()
                .sorted(Comparator.comparing(Activity::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Activity::getStartDateTime, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(activityMapper::mapToResponse)
                .toList();
    }


    // =========================================================
    // GET STANDALONE ACTIVITIES
    // =========================================================

    public List<ActivityResponse> getStandaloneActivities(
            String organizerId
    ) {

        return activityRepository
                .findByOrganizerIdAndEventIdIsNull(organizerId)
                .stream()
                .sorted(Comparator.comparing(Activity::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Activity::getStartDateTime, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(activityMapper::mapToResponse)
                .toList();
    }


    // =========================================================
    // GET ACTIVITY
    // =========================================================

    public ActivityResponse getActivity(
            String activityId,
            String organizerId
    ) {

        Activity activity = getOwnedActivity(
                activityId,
                organizerId
        );

        return activityMapper.mapToResponse(activity);
    }


    // =========================================================
    // PUT / FULL UPDATE
    // =========================================================

    public ActivityResponse updateActivity(
            String activityId,
            UpdateActivityRequest request,
            String organizerId
    ) {
            return transactionRunner.run(() -> {
                    guardActivity(activityId);
                    return updateActivityInsideTransaction(activityId, request, organizerId);
            });
    }
    public ActivityResponse updateActivityInsideTransaction(
            String activityId,
            UpdateActivityRequest request,
            String organizerId
    ) {

        Activity activity = getOwnedActivity(
                activityId,
                organizerId
        );

        Event parentEvent = activity.getEventId() != null
                ? getOwnedEvent(
                activity.getEventId(),
                organizerId
        )
                : null;

        activityValidator.validate(
                request,
                parentEvent
        );

        applyUpdate(
                activity,
                request
        );

        return activityMapper.mapToResponse(
                activityRepository.save(activity)
        );
    }


    // =========================================================
    // PATCH
    // =========================================================

    public ActivityResponse patchActivity(
            String activityId,
            UpdateActivityRequest request,
            String organizerId
    ) {
      return  transactionRunner.run(() -> {
            guardActivity(activityId);
            return patchActivityInsideTransaction(activityId, request, organizerId);
        });
    }
    public ActivityResponse patchActivityInsideTransaction(
            String activityId,
            UpdateActivityRequest request,
            String organizerId
    ) {

        Activity activity = getOwnedActivity(
                activityId,
                organizerId
        );

        Event parentEvent = activity.getEventId() != null
                ? getOwnedEvent(
                activity.getEventId(),
                organizerId
        )
                : null;

        /*
         * PATCH means:
         *
         * 1. Get existing entity
         * 2. Apply only supplied fields
         * 3. Validate the FINAL entity
         * 4. Save
         */

        applyPatch(
                activity,
                request
        );

        activityValidator.validate(
                activity,
                parentEvent
        );

        return activityMapper.mapToResponse(
                activityRepository.save(activity)
        );
    }


    // =========================================================
    // DELETE
    // =========================================================

    public void deleteActivity(
            String activityId,
            String organizerId
    ) {

        Activity activity = getOwnedActivity(
                activityId,
                organizerId
        );

        if(activity.getStatus() == EventStatus.ONGOING) {
            throw new BadRequestException(
                    "Cannot delete activity that is ongoing"
            );
        }

        activityRepository.delete(activity);
    }

    public ActivityResponse publishStandaloneActivity(String activityId, String organizerId) {
        Activity activity = getOwnedActivity(activityId, organizerId);
        if (activity.getEventId() != null) {
            throw new BadRequestException("Activities within an Event are published with their parent Event.");
        }
        if (activity.getStatus() == EventStatus.PUBLISHED || activity.getStatus() == EventStatus.ONGOING) {
            throw new BadRequestException("Activity is already published.");
        }
        if (activity.getStatus() != null && activity.getStatus() != EventStatus.DRAFT) {
            throw new BadRequestException("Only draft activities can be published.");
        }
        if (!activity.getStartDateTime().isAfter(LocalDateTime.now())) {
            throw new BadRequestException("Activity start time must be in the future before publishing.");
        }
        activity.setStatus(EventStatus.PUBLISHED);
        activity.setUpdatedAt(LocalDateTime.now());
        return activityMapper.mapToResponse(activityRepository.save(activity));
    }

    // =========================================================
    // LIFECYCLE CONTROLS: START & COMPLETE ACTIVITY
    // =========================================================

    public ActivityResponse startActivity(
            String activityId,
            String organizerId
    ) {
        return transactionRunner.run(() -> {
            guardActivity(activityId);
            return startActivityInsideTransaction(activityId, organizerId);
        });
    }

    public ActivityResponse startActivityInsideTransaction(
            String activityId,
            String organizerId
    ) {
        Activity activity = getOwnedActivity(activityId, organizerId);

        if (activity.getStatus() == EventStatus.ONGOING || activity.getActualStartDateTime() != null) {
            throw new BadRequestException("Activity has already started.");
        }

        if (activity.getStatus() == EventStatus.COMPLETED) {
            throw new BadRequestException("Cannot start an already completed activity.");
        }

        if (activity.getStatus() != EventStatus.PUBLISHED) {
            throw new BadRequestException("Only published activities can be started.");
        }

        LocalDateTime now = LocalDateTime.now();
        activity.setActualStartDateTime(now);
        activity.setStatus(EventStatus.ONGOING);
        activity.setUpdatedAt(now);

        return activityMapper.mapToResponse(activityRepository.save(activity));
    }

    public ActivityResponse completeActivity(
            String activityId,
            String organizerId
    ) {
        return transactionRunner.run(() -> {
            guardActivity(activityId);
            return completeActivityInsideTransaction(activityId, organizerId);
        });
    }

    public ActivityResponse completeActivityInsideTransaction(
            String activityId,
            String organizerId
    ) {
        Activity activity = getOwnedActivity(activityId, organizerId);

        if (activity.getStatus() == EventStatus.COMPLETED || activity.getActualEndDateTime() != null) {
            throw new BadRequestException("Activity has already been completed.");
        }

        if (activity.getStatus() == EventStatus.PUBLISHED) {
            throw new BadRequestException("Cannot complete a published activity that has not started.");
        }

        if (activity.getStatus() != EventStatus.ONGOING) {
            throw new BadRequestException("Only ongoing activities can be completed.");
        }

        if (activity.getActualStartDateTime() == null) {
            throw new BadRequestException("Activity cannot be completed before an actual start time exists.");
        }

        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(activity.getActualStartDateTime())) {
            throw new BadRequestException("Completion time cannot be before actual start time.");
        }
        if (!now.isAfter(activity.getActualStartDateTime())) {
            now = activity.getActualStartDateTime().plusNanos(1_000_000);
        }

        activity.setActualEndDateTime(now);
        activity.setStatus(EventStatus.COMPLETED);
        activity.setUpdatedAt(now);

        return activityMapper.mapToResponse(activityRepository.save(activity));
    }


    // =========================================================
    // GET OWNED EVENT
    // =========================================================

    private Event getOwnedEvent(
            String eventId,
            String organizerId
    ) {

        Event event = eventRepository
                .findById(eventId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Event not found."
                        )
                );

        if (!event.getOrganizerId().equals(organizerId)) {
            throw new BadRequestException(
                    "You are not allowed to modify this event."
            );
        }

        return event;
    }


    // =========================================================
    // GET OWNED ACTIVITY
    // =========================================================

    private Activity getOwnedActivity(
            String activityId,
            String organizerId
    ) {

        Activity activity = activityRepository
                .findById(activityId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Activity not found."
                        )
                );

        if (!organizerId.equals(activity.getOrganizerId())) {
            throw new BadRequestException(
                    "You are not allowed to modify this activity."
            );
        }

        return activity;
    }


    // =========================================================
    // BUILD ACTIVITY
    // =========================================================

    private Activity buildActivity(
            CreateActivityRequest request,
            String eventId,
            String organizerId
    ) {

        LocalDateTime now = LocalDateTime.now();

        return Activity.builder()
                .eventId(eventId)
                .organizerId(organizerId)
                .name(request.getName())
                .description(request.getDescription())
                .type(request.getType())
                .rules(request.getRules())
                .location(request.getLocation())
                .startDateTime(request.getStartDateTime())
                .endDateTime(request.getEndDateTime())
                .registrationDeadline(
                        request.getRegistrationDeadline()
                )
                .registrationType(
                        request.getRegistrationType()
                )
                .capacity(request.getCapacity())
                .minTeamSize(request.getMinTeamSize())
                .maxTeamSize(request.getMaxTeamSize())
                .status(eventId == null ? EventStatus.DRAFT : EventStatus.PUBLISHED)
                /*
                 * Visibility is owned by the Event for event activities.
                 * Only standalone activities carry their own visibility.
                 */
                .visibility(
                        eventId == null
                                ? request.getVisibility()
                                : null
                )
                .requiresApproval(request.isRequiresApproval())
                .createdAt(now)
                .updatedAt(now)
                .build();
    }


    // =========================================================
    // APPLY FULL UPDATE
    // =========================================================

    private void applyUpdate(
            Activity activity,
            UpdateActivityRequest request
    ) {

        activity.setName(request.getName());
        activity.setDescription(request.getDescription());
        activity.setType(request.getType());
        activity.setRules(request.getRules());
        activity.setLocation(request.getLocation());

        // Standalone activities own their visibility; event activities inherit it.
        if (activity.getEventId() == null) {
            activity.setVisibility(request.getVisibility());
        }

        if(request.getRequiresApproval() != null) {
            activity.setRequiresApproval(request.getRequiresApproval());
        }

        activity.setStartDateTime(
                request.getStartDateTime()
        );

        activity.setEndDateTime(
                request.getEndDateTime()
        );

        activity.setRegistrationDeadline(
                request.getRegistrationDeadline()
        );

        activity.setRegistrationType(
                request.getRegistrationType()
        );

        activity.setCapacity(
                request.getCapacity()
        );

        activity.setMinTeamSize(
                request.getMinTeamSize()
        );

        activity.setMaxTeamSize(
                request.getMaxTeamSize()
        );

        activity.setUpdatedAt(
                LocalDateTime.now()
        );
    }


    // =========================================================
    // APPLY PATCH
    // =========================================================

    private void applyPatch(
            Activity activity,
            UpdateActivityRequest request
    ) {

        if (request.getName() != null) {
            activity.setName(request.getName());
        }

        if (request.getDescription() != null) {
            activity.setDescription(request.getDescription());
        }

        if(request.getRequiresApproval() != null) {
            activity.setRequiresApproval(request.getRequiresApproval());
        }

        if (request.getType() != null) {
            activity.setType(request.getType());
        }

        if (request.getRules() != null) {
            activity.setRules(request.getRules());
        }

        if (request.getVisibility() != null
                && activity.getEventId() == null) {
            activity.setVisibility(request.getVisibility());
        }

        if (request.getLocation() != null) {
            activity.setLocation(request.getLocation());
        }

        if (request.getStartDateTime() != null) {
            activity.setStartDateTime(
                    request.getStartDateTime()
            );
        }

        if (request.getEndDateTime() != null) {
            activity.setEndDateTime(
                    request.getEndDateTime()
            );
        }

        if (request.getRegistrationDeadline() != null) {
            activity.setRegistrationDeadline(
                    request.getRegistrationDeadline()
            );
        }

        if (request.getRegistrationType() != null) {
            activity.setRegistrationType(
                    request.getRegistrationType()
            );
        }

        if (request.getCapacity() != null) {
            activity.setCapacity(
                    request.getCapacity()
            );
        }

        if (request.getMinTeamSize() != null) {
            activity.setMinTeamSize(
                    request.getMinTeamSize()
            );
        }

        if (request.getMaxTeamSize() != null) {
            activity.setMaxTeamSize(
                    request.getMaxTeamSize()
            );
        }

        activity.setUpdatedAt(
                LocalDateTime.now()
        );
    }

    private void guardActivity(String activityId) {
        if (!activityRepository.existsById(activityId)) {
            throw new ResourceNotFoundException("Activity not found.");
        }

        transactionRunner.guard(Activity.class, activityId);
    }

    private void validateCapacityAgainstRegistrations(Activity activity) {
        if (activity.getCapacity() == null) {
            return;
        }

        long occupiedCount = activityRegistrationRepository
                .countByActivityIdAndStatusIn(activity.getId(), CAPACITY_STATUSES);

        if (activity.getCapacity() < occupiedCount) {
            throw new BadRequestException(
                    "Capacity cannot be lower than the " + occupiedCount
                            + " entries already reserved."
            );
        }
    }
}

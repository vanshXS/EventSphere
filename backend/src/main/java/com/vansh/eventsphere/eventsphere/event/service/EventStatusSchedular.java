package com.vansh.eventsphere.eventsphere.event.service;

import java.time.LocalDateTime;
import java.util.List;

import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.vansh.eventsphere.eventsphere.event.model.Event;
import com.vansh.eventsphere.eventsphere.event.model.EventStatus;
import com.vansh.eventsphere.eventsphere.event.repository.EventRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class EventStatusSchedular {

    private final EventRepository eventRepository;
    private final ActivityRepository activityRepository;

    @Scheduled(fixedRate = 60000, initialDelay = 5000)
    public void updateStatus() {
        updateEventStatuses();
        updateActivityStatues();
    }

    private void updateActivityStatues() {
        LocalDateTime now = LocalDateTime.now();

        List<Activity> activities = activityRepository.findByStatusIn(
                List.of(EventStatus.PUBLISHED, EventStatus.ONGOING)
        );

        for(Activity activity : activities) {
            LocalDateTime start = activity.getStartDateTime();
            LocalDateTime end = activity.getEndDateTime();

            if (end != null && !end.isAfter(now)) {
                /*
                 * PUBLISHED + end passed means the activity was never started.
                 * Keep it PUBLISHED so the UI can truthfully show "Not started".
                 * Only an activity that actually entered ONGOING is completed
                 * automatically.
                 */
                if (activity.getStatus() == EventStatus.ONGOING) {
                    activity.setStatus(EventStatus.COMPLETED);
                    activityRepository.save(activity);
                }
            } else if (start != null && !start.isAfter(now)) {
                if (activity.getStatus() == EventStatus.PUBLISHED) {
                    activity.setStatus(EventStatus.ONGOING);
                    activityRepository.save(activity);
                }
            }
        }

    }
    private void updateEventStatuses() {
        LocalDateTime now = LocalDateTime.now();
        log.info("Updating events statuses... Current time: {}", now);

        try {
            List<Event> events = eventRepository.findByEventStatusIn(
                    List.of(EventStatus.PUBLISHED, EventStatus.ONGOING));

            log.info("Found {} candidate event(s) (PUBLISHED / ONGOING) to evaluate", events.size());

            for (Event event : events) {
                try {
                    LocalDateTime start = event.getStartDateTime();
                    LocalDateTime end = event.getEndDateTime();

                    log.debug("Evaluating event ID: {}, CurrentStatus: {}, Start: {}, End: {}",
                            event.getId(), event.getEventStatus(), start, end);

                    // If end time has already passed, mark as COMPLETED
                    if (end != null && !end.isAfter(now)) {
                        if (event.getEventStatus() != EventStatus.COMPLETED) {
                            event.setEventStatus(EventStatus.COMPLETED);
                            event.setUpdatedAt(now);
                            eventRepository.save(event);
                            log.info("Event ID {} status updated to COMPLETED (End time {} <= Now {})",
                                    event.getId(), end, now);
                        }
                    }
                    // If start time has passed (and end time hasn't passed), mark as ONGOING
                    else if (start != null && !start.isAfter(now)) {
                        if (event.getEventStatus() == EventStatus.PUBLISHED) {
                            event.setEventStatus(EventStatus.ONGOING);
                            event.setUpdatedAt(now);
                            eventRepository.save(event);
                            log.info("Event ID {} status updated from PUBLISHED to ONGOING (Start time {} <= Now {})",
                                    event.getId(), start, now);
                        }
                    }
                } catch (Exception e) {
                    log.error("Error updating status for event ID {}: {}", event.getId(), e.getMessage(), e);
                }
            }
        } catch (Exception e) {
            log.error("Error executing event status scheduler: {}", e.getMessage(), e);
        }
    }
}

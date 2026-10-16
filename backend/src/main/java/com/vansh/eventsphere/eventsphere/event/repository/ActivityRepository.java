package com.vansh.eventsphere.eventsphere.event.repository;

import com.vansh.eventsphere.eventsphere.event.model.Activity;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import com.vansh.eventsphere.eventsphere.event.model.EventStatus;

@Repository
public interface ActivityRepository extends MongoRepository<Activity, String> {

    List<Activity> findByEventId(String eventId);

    List<Activity> findByOrganizerIdAndEventIdIsNull(String organizerId);

    List<Activity> findByEventIdIsNull();

    List<Activity> findByOrganizerId(String organizerId);

    List<Activity> findByEventIdIsNullAndStatusIn(List<EventStatus> statuses);

    List<Activity> findByStatusIn(List<EventStatus> statuses);

    long countByEventId(String eventId);
}

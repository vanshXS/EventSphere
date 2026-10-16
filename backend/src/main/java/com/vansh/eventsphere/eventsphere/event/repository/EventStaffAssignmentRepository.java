package com.vansh.eventsphere.eventsphere.event.repository;

import com.vansh.eventsphere.eventsphere.event.model.EventStaffAssignment;
import com.vansh.eventsphere.eventsphere.event.model.EventStaffPermission;
import com.vansh.eventsphere.eventsphere.event.model.EventStaffStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EventStaffAssignmentRepository extends MongoRepository<EventStaffAssignment, String> {

    Optional<EventStaffAssignment> findByInvitationTokenHashAndStatus(
            String invitationTokenHash,
            EventStaffStatus status
    );

    List<EventStaffAssignment> findByUserIdAndStatus(
            String userId,
            EventStaffStatus status
    );

    List<EventStaffAssignment> findByEventId(String eventId);

    List<EventStaffAssignment> findByActivityId(String activityId);

    boolean existsByEventIdAndEmailAndPermissionAndStatusIn(
            String eventId,
            String email,
            EventStaffPermission permission,
            List<EventStaffStatus> statuses
    );

    boolean existsByActivityIdAndEmailAndPermissionAndStatusIn(
            String activityId,
            String email,
            EventStaffPermission permission,
            List<EventStaffStatus> statuses
    );
}

package com.vansh.eventsphere.eventsphere.event.repository;

import com.vansh.eventsphere.eventsphere.event.model.Attendance;
import com.vansh.eventsphere.eventsphere.event.model.CheckInType;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends MongoRepository<Attendance, String> {

    Optional<Attendance> findByTicketIdAndCheckInType(
            String ticketId,
            CheckInType checkInType
    );

    List<Attendance> findByEventIdAndCheckInType(
            String eventId,
            CheckInType checkInType
    );

    List<Attendance> findByActivityIdAndCheckInType(
            String activityId,
            CheckInType checkInType
    );

    List<Attendance> findByEventIdAndRegistrationIdAndParticipantIdAndCheckInType(
            String eventId,
            String registrationId,
            String participantId,
            CheckInType checkInType
    );

    List<Attendance> findByActivityIdAndRegistrationIdAndParticipantIdAndCheckInType(
            String activityId,
            String registrationId,
            String participantId,
            CheckInType checkInType
    );
}

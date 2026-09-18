package com.vansh.eventsphere.eventsphere.event.repository;

import com.vansh.eventsphere.eventsphere.event.model.Attendance;
import com.vansh.eventsphere.eventsphere.event.model.CheckInType;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends MongoRepository<Attendance, String> {

    Optional<Attendance> findByRegistrationIdAndCheckInType(
            String registrationId,
            CheckInType checkInType
    );

    List<Attendance> findByEventId(String eventId);

    List<Attendance> findByActivityId(String activityId);
}

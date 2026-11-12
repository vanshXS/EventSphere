package com.vansh.eventsphere.eventsphere.certificate.services;

import com.vansh.eventsphere.eventsphere.certificate.dto.EligibilityResult;
import com.vansh.eventsphere.eventsphere.certificate.models.Reason;
import com.vansh.eventsphere.eventsphere.event.model.*;
import com.vansh.eventsphere.eventsphere.event.repository.AttendanceRepository;
import com.vansh.eventsphere.eventsphere.event.repository.EventRegistrationRepository;
import com.vansh.eventsphere.eventsphere.event.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CertificateEligibilityService {

    private final EventRepository eventRepository;
    private final EventRegistrationRepository eventRegistrationRepository;
    private final AttendanceRepository attendanceRepository;

    public EligibilityResult checkEventParticipation(
            String eventId,
            String participantId
    ) {

        if(eventId == null || eventId.isBlank()
        || participantId == null || participantId.isBlank()) {
            throw new IllegalArgumentException(
                    "Event ID and participant ID are required"
            );
        }

        Optional<Event> event = eventRepository.findById(eventId);

        if(event.isEmpty()) {
            return EligibilityResult.ineligible(Reason.EVENT_NOT_FOUND);
        }

        if(event.get().getEventStatus() != EventStatus.COMPLETED) {
            return EligibilityResult.ineligible(Reason.EVENT_NOT_COMPLETED);
        }

        Optional<EventRegistration> registration =
                eventRegistrationRepository.findByEventIdAndParticipantId(
                        eventId, participantId
                );

        if (registration.isEmpty()
                || registration.get().getId() == null
                || !isActive(registration.get().getStatus())) {
            return EligibilityResult.ineligible(Reason.NO_ACTIVE_REGISTRATION);
        }

        Optional<Attendance> attendance = attendanceRepository
                .findByEventIdAndRegistrationIdAndParticipantIdAndCheckInType(
                        eventId,
                        registration.get().getId(),
                        participantId,
                        CheckInType.EVENT_ENTRY
                )
                .stream()
                .filter(record -> record.getId() != null)
                .filter(record -> record.getCheckedInAt() != null)
                .findFirst();

        return attendance.map(value -> new EligibilityResult(
                true,
                Reason.ELIGIBLE,
                registration.get().getId(),
                value.getId()
        )).orElseGet(() -> EligibilityResult.ineligible(Reason.NO_MATCHING_EVENT_CHECK_IN));

    }

    private boolean isActive(RegistrationStatus status) {
        return status == RegistrationStatus.APPROVED
                || status == RegistrationStatus.REGISTERED;
    }

}

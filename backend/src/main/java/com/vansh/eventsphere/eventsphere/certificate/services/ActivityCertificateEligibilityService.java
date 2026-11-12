package com.vansh.eventsphere.eventsphere.certificate.services;

import java.util.Objects;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.event.model.ActivityRegistration;
import com.vansh.eventsphere.eventsphere.event.model.Attendance;
import com.vansh.eventsphere.eventsphere.event.model.CheckInType;
import com.vansh.eventsphere.eventsphere.event.model.EventStatus;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationStatus;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationType;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRegistrationRepository;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRepository;
import com.vansh.eventsphere.eventsphere.event.repository.AttendanceRepository;

@Service
public class ActivityCertificateEligibilityService {

    private final ActivityRepository activityRepository;
    private final ActivityRegistrationRepository registrationRepository;
    private final AttendanceRepository attendanceRepository;

    public ActivityCertificateEligibilityService(
            ActivityRepository activityRepository,
            ActivityRegistrationRepository registrationRepository,
            AttendanceRepository attendanceRepository
    ) {
        this.activityRepository = activityRepository;
        this.registrationRepository = registrationRepository;
        this.attendanceRepository = attendanceRepository;
    }

    public EligibilityResult checkParticipation(
            String activityId,
            String registrationId,
            String participantId
    ) {
        if (isBlank(activityId) || isBlank(registrationId)
                || isBlank(participantId)) {
            throw new IllegalArgumentException(
                    "Activity, registration, and participant IDs are required"
            );
        }

        Optional<Activity> activity = activityRepository.findById(activityId);

        if (activity.isEmpty()) {
            return EligibilityResult.ineligible(Reason.ACTIVITY_NOT_FOUND);
        }

        if (activity.get().getStatus() != EventStatus.COMPLETED) {
            return EligibilityResult.ineligible(Reason.ACTIVITY_NOT_COMPLETED);
        }

        Optional<ActivityRegistration> found =
                registrationRepository.findById(registrationId);

        if (found.isEmpty()
                || !Objects.equals(found.get().getActivityId(), activityId)
                || !isActive(found.get().getStatus())) {
            return EligibilityResult.ineligible(Reason.NO_ACTIVE_REGISTRATION);
        }

        ActivityRegistration registration = found.get();

        if (registration.getRegistrationType() == RegistrationType.INDIVIDUAL) {
            if (!Objects.equals(registration.getParticipantId(), participantId)) {
                return EligibilityResult.ineligible(Reason.NOT_IN_REGISTRATION);
            }
        } else if (registration.getRegistrationType() == RegistrationType.TEAM) {
            if (registration.getTeamMemberIds() == null) {
                return EligibilityResult.ineligible(Reason.MISSING_TEAM_SNAPSHOT);
            }

            if (!registration.getTeamMemberIds().contains(participantId)) {
                return EligibilityResult.ineligible(Reason.NOT_IN_REGISTRATION);
            }
        } else {
            return EligibilityResult.ineligible(
                    Reason.UNSUPPORTED_REGISTRATION_TYPE
            );
        }

        Optional<Attendance> attendance = attendanceRepository
                .findByActivityIdAndRegistrationIdAndParticipantIdAndCheckInType(
                        activityId,
                        registrationId,
                        participantId,
                        CheckInType.ACTIVITY
                )
                .stream()
                .filter(record -> record.getId() != null)
                .filter(record -> record.getCheckedInAt() != null)
                .findFirst();

        return attendance.map(value -> new EligibilityResult(
                true,
                Reason.ELIGIBLE,
                registrationId,
                value.getId()
        )).orElseGet(() -> EligibilityResult.ineligible(Reason.NO_ACTIVITY_CHECK_IN));

    }

    private boolean isActive(RegistrationStatus status) {
        return status == RegistrationStatus.APPROVED
                || status == RegistrationStatus.REGISTERED;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    public enum Reason {
        ELIGIBLE,
        ACTIVITY_NOT_FOUND,
        ACTIVITY_NOT_COMPLETED,
        NO_ACTIVE_REGISTRATION,
        MISSING_TEAM_SNAPSHOT,
        NOT_IN_REGISTRATION,
        UNSUPPORTED_REGISTRATION_TYPE,
        NO_ACTIVITY_CHECK_IN
    }

    public record EligibilityResult(
            boolean eligible,
            Reason reason,
            String registrationId,
            String attendanceId
    ) {
        public static EligibilityResult ineligible(Reason reason) {
            return new EligibilityResult(false, reason, null, null);
        }
    }
}
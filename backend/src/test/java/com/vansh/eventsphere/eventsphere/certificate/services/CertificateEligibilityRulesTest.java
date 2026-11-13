package com.vansh.eventsphere.eventsphere.certificate.services;

import com.vansh.eventsphere.eventsphere.event.model.*;
import com.vansh.eventsphere.eventsphere.event.repository.*;
import com.vansh.eventsphere.eventsphere.judge.model.*;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgingRoundStatus;
import com.vansh.eventsphere.eventsphere.judge.repository.*;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CertificateEligibilityRulesTest {
    @Test void eventNeedsCompletedActiveRegistrationAndEventEntry() {
        var events = mock(EventRepository.class); var registrations = mock(EventRegistrationRepository.class); var attendance = mock(AttendanceRepository.class);
        var service = new CertificateEligibilityService(events, registrations, attendance);
        var event = Event.builder().eventStatus(EventStatus.COMPLETED).build();
        var reg = EventRegistration.builder().id("r").status(RegistrationStatus.REGISTERED).build();
        when(events.findById("e")).thenReturn(Optional.of(event));
        when(registrations.findByEventIdAndParticipantId("e", "p")).thenReturn(Optional.of(reg));
        when(attendance.findByEventIdAndRegistrationIdAndParticipantIdAndCheckInType("e", "r", "p", CheckInType.EVENT_ENTRY)).thenReturn(List.of(Attendance.builder().id("att").checkedInAt(LocalDateTime.now()).build()));
        assertTrue(service.checkEventParticipation("e", "p").eligible());
        reg.setStatus(RegistrationStatus.CANCELLED); assertFalse(service.checkEventParticipation("e", "p").eligible());
        reg.setStatus(RegistrationStatus.REGISTERED); event.setEventStatus(EventStatus.ONGOING); assertFalse(service.checkEventParticipation("e", "p").eligible());
    }
    @Test void teamSnapshotAndIndividualAttendanceRequiredAndWinnerNeedsPublishedTopThree() {
        var activities=mock(ActivityRepository.class); var registrations=mock(ActivityRegistrationRepository.class); var attendance=mock(AttendanceRepository.class);
        var rounds=mock(JudgingRoundRepository.class); var results=mock(JudgingResultRepository.class);
        var participation=new ActivityCertificateEligibilityService(activities, registrations, attendance);
        var winners=new WinnerCertificateEligibilityService(participation, registrations, rounds, results);
        var reg=ActivityRegistration.builder().id("r").activityId("a").status(RegistrationStatus.REGISTERED).registrationType(RegistrationType.TEAM).teamMemberIds(List.of("p", "q")).build();
        when(activities.findById("a")).thenReturn(Optional.of(Activity.builder().status(EventStatus.COMPLETED).build()));
        when(registrations.findById("r")).thenReturn(Optional.of(reg));
        when(attendance.findByActivityIdAndRegistrationIdAndParticipantIdAndCheckInType("a", "r", "p", CheckInType.ACTIVITY)).thenReturn(List.of(Attendance.builder().id("att").checkedInAt(LocalDateTime.now()).build()));
        assertTrue(participation.checkParticipation("a", "r", "p").eligible());
        assertFalse(participation.checkParticipation("a", "r", "q").eligible());
        assertFalse(participation.checkParticipation("a", "r", "late-member").eligible());
        var round=JudgeRound.builder().activityId("a").status(JudgingRoundStatus.PUBLISHED).build();
        var entry=JudgingResultEntry.builder().registrationId("r").entryType(RegistrationType.TEAM).entryName("Team A").rank(2).build();
        when(rounds.findById("final")).thenReturn(Optional.of(round));
        when(results.findByRoundId("final")).thenReturn(Optional.of(JudgingResult.builder().activityId("a").publishedAt(LocalDateTime.now()).entries(List.of(entry)).build()));
        assertTrue(winners.checkWinner("a", "r", "p", "final").eligible());
        assertFalse(winners.checkWinner("a", "r", "q", "final").eligible());
        entry.setRank(4); assertFalse(winners.checkWinner("a", "r", "p", "final").eligible());
        entry.setRank(1); round.setStatus(JudgingRoundStatus.CLOSED); assertFalse(winners.checkWinner("a", "r", "p", "final").eligible());
        reg.setTeamMemberIds(null); assertFalse(participation.checkParticipation("a", "r", "p").eligible());
    }
}

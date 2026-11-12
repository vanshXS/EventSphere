package com.vansh.eventsphere.eventsphere.certificate.services;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.vansh.eventsphere.eventsphere.event.model.ActivityRegistration;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationType;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRegistrationRepository;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeRound;
import com.vansh.eventsphere.eventsphere.judge.model.JudgingResult;
import com.vansh.eventsphere.eventsphere.judge.model.JudgingResultEntry;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgingRoundStatus;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgingResultRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgingRoundRepository;

@Service
public class WinnerCertificateEligibilityService {

    private final ActivityCertificateEligibilityService activityEligibility;
    private final ActivityRegistrationRepository registrationRepository;
    private final JudgingRoundRepository roundRepository;
    private final JudgingResultRepository resultRepository;

    public WinnerCertificateEligibilityService(
            ActivityCertificateEligibilityService activityEligibility,
            ActivityRegistrationRepository registrationRepository,
            JudgingRoundRepository roundRepository,
            JudgingResultRepository resultRepository
    ) {
        this.activityEligibility = activityEligibility;
        this.registrationRepository = registrationRepository;
        this.roundRepository = roundRepository;
        this.resultRepository = resultRepository;
    }

    public WinnerEligibilityResult checkWinner(
            String activityId,
            String registrationId,
            String participantId,
            String roundId
    ) {
        if (roundId == null || roundId.isBlank()) {
            throw new IllegalArgumentException("Round ID is required");
        }

        var participation = activityEligibility.checkParticipation(
                activityId, registrationId, participantId
        );

        if (!participation.eligible()) {
            return WinnerEligibilityResult.ineligible(
                    Reason.ACTIVITY_INELIGIBLE,
                    participation.reason()
            );
        }

        Optional<JudgeRound> round = roundRepository.findById(roundId);

        if (round.isEmpty()
                || !Objects.equals(round.get().getActivityId(), activityId)
                || round.get().getStatus() != JudgingRoundStatus.PUBLISHED) {
            return WinnerEligibilityResult.ineligible(
                    Reason.ROUND_NOT_PUBLISHED,
                    null
            );
        }

        Optional<JudgingResult> foundResult =
                resultRepository.findByRoundId(roundId);

        if (foundResult.isEmpty()
                || !Objects.equals(foundResult.get().getActivityId(), activityId)
                || foundResult.get().getPublishedAt() == null
                || foundResult.get().getEntries() == null) {
            return WinnerEligibilityResult.ineligible(
                    Reason.PUBLISHED_RESULT_NOT_FOUND,
                    null
            );
        }

        List<JudgingResultEntry> matchingEntries = foundResult.get()
                .getEntries()
                .stream()
                .filter(Objects::nonNull)
                .filter(entry -> Objects.equals(
                        entry.getRegistrationId(), registrationId
                ))
                .toList();

        if (matchingEntries.isEmpty()) {
            return WinnerEligibilityResult.ineligible(
                    Reason.REGISTRATION_NOT_IN_RESULT,
                    null
            );
        }

        if (matchingEntries.size() != 1) {
            return WinnerEligibilityResult.ineligible(
                    Reason.INCONSISTENT_RESULT,
                    null
            );
        }

        JudgingResultEntry entry = matchingEntries.get(0);

        Optional<ActivityRegistration> registration =
                registrationRepository.findById(registrationId);

        if (registration.isEmpty()
                || entry.getEntryType() != registration.get().getRegistrationType()) {
            return WinnerEligibilityResult.ineligible(
                    Reason.INCONSISTENT_RESULT,
                    null
            );
        }

        if (entry.getRank() < 1 || entry.getRank() > 3) {
            return WinnerEligibilityResult.ineligible(
                    Reason.NOT_A_WINNING_RANK,
                    null
            );
        }

        String teamName = entry.getEntryType() == RegistrationType.TEAM
                ? entry.getEntryName()
                : null;

        return new WinnerEligibilityResult(
                true,
                Reason.ELIGIBLE,
                null,
                registrationId,
                participation.attendanceId(),
                roundId,
                entry.getRank(),
                teamName
        );
    }

    public enum Reason {
        ELIGIBLE,
        ACTIVITY_INELIGIBLE,
        ROUND_NOT_PUBLISHED,
        PUBLISHED_RESULT_NOT_FOUND,
        REGISTRATION_NOT_IN_RESULT,
        INCONSISTENT_RESULT,
        NOT_A_WINNING_RANK
    }

    public record WinnerEligibilityResult(
            boolean eligible,
            Reason reason,
            ActivityCertificateEligibilityService.Reason participationReason,
            String registrationId,
            String attendanceId,
            String sourceRoundId,
            Integer rank,
            String teamName
    ) {
        public static WinnerEligibilityResult ineligible(
                Reason reason,
                ActivityCertificateEligibilityService.Reason participationReason
        ) {
            return new WinnerEligibilityResult(
                    false, reason, participationReason,
                    null, null, null, null, null
            );
        }
    }
}
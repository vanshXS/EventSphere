package com.vansh.eventsphere.eventsphere.judge.service;

import com.vansh.eventsphere.eventsphere.event.model.ActivityRegistration;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationStatus;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRegistrationRepository;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;
import com.vansh.eventsphere.eventsphere.judge.dto.JudgeEvaluationResponse;
import com.vansh.eventsphere.eventsphere.judge.dto.SaveJudgeEvaluationRequest;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeAssignment;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeAssignmentStatus;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeEvaluation;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeEvaluationStatus;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeRound;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgingRoundStatus;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgeAssignmentRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgeEvaluationRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgingRoundRepository;
import com.vansh.eventsphere.eventsphere.judge.service.calculators.ScoreCalculator;
import com.vansh.eventsphere.eventsphere.judge.service.mapper.JudgeEvaluationMapper;
import com.vansh.eventsphere.eventsphere.judge.service.validator.JudgeEvaluationValidator;
import com.vansh.eventsphere.eventsphere.user.model.Role;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class JudgeEvaluationService {

    private final JudgingRoundRepository judgingRoundRepository;
    private final JudgeAssignmentRepository judgeAssignmentRepository;
    private final JudgeEvaluationRepository judgeEvaluationRepository;
    private final ActivityRegistrationRepository activityRegistrationRepository;
    private final UserRepository userRepository;

    private final JudgeEvaluationValidator evaluationValidator;
    private final ScoreCalculator scoreCalculator;
    private final JudgeEvaluationMapper evaluationMapper;

    public JudgeEvaluationResponse saveDraft(
            String roundId,
            String registrationId,
            SaveJudgeEvaluationRequest request,
            String judgeEmail
    ) {
        if (request == null) {
            throw new BadRequestException(
                    "Evaluation request is required."
            );
        }

        JudgeRound round = getAndValidateOpenRound(roundId);
        User judge = getAndValidateJudge(judgeEmail);

        validateActiveAssignment(roundId, judge.getUserId());

        ActivityRegistration registration =
                getAndValidateEligibleRegistration(
                        registrationId,
                        round.getActivityId()
                );

        evaluationValidator.validateScore(
                round,
                request.getScore(),
                false
        );

        JudgeEvaluation evaluation =
                getOrCreateEvaluation(
                        round,
                        registration,
                        judge.getUserId()
                );

        rejectSubmittedEvaluation(evaluation);

        evaluation.setScores(
                evaluationMapper.toDomainScores(
                        round,
                        request.getScore()
                )
        );

        evaluation.setFeedback(normalizeFeedback(request.getFeedback()));
        evaluation.setUpdatedAt(LocalDateTime.now());

        return evaluationMapper.toResponse(
                judgeEvaluationRepository.save(evaluation)
        );
    }

    public JudgeEvaluationResponse submitEvaluation(
            String roundId,
            String registrationId,
            SaveJudgeEvaluationRequest request,
            String judgeEmail
    ) {
        if (request == null) {
            throw new BadRequestException(
                    "Evaluation request is required."
            );
        }

        JudgeRound round = getAndValidateOpenRound(roundId);
        User judge = getAndValidateJudge(judgeEmail);

        validateActiveAssignment(roundId, judge.getUserId());

        ActivityRegistration registration =
                getAndValidateEligibleRegistration(
                        registrationId,
                        round.getActivityId()
                );

        evaluationValidator.validateScore(
                round,
                request.getScore(),
                true
        );

        JudgeEvaluation evaluation =
                getOrCreateEvaluation(
                        round,
                        registration,
                        judge.getUserId()
                );

        rejectSubmittedEvaluation(evaluation);

        evaluation.setScores(
                evaluationMapper.toDomainScores(
                        round,
                        request.getScore()
                )
        );

        evaluation.setFeedback(normalizeFeedback(request.getFeedback()));

        // Never trust a total score supplied by the client.
        evaluation.setTotalScore(
                scoreCalculator.calculateWeightedTotal(
                        round,
                        evaluation.getScores()
                )
        );
            LocalDateTime now = LocalDateTime.now();
        evaluation.setStatus(JudgeEvaluationStatus.SUBMITTED);
        evaluation.setSubmittedAt(now);
        evaluation.setUpdatedAt(now);

        return evaluationMapper.toResponse(
                judgeEvaluationRepository.save(evaluation)
        );
    }

    public JudgeEvaluationResponse getMyEvaluation(
            String roundId,
            String registrationId,
            String judgeEmail
    ) {
        JudgeRound round = getRound(roundId);
        User judge = getAndValidateJudge(judgeEmail);

        validateActiveAssignment(roundId, judge.getUserId());

        getAndValidateEligibleRegistration(
                registrationId,
                round.getActivityId()
        );

        JudgeEvaluation evaluation = judgeEvaluationRepository
                .findByRoundIdAndRegistrationIdAndJudgeId(
                        roundId,
                        registrationId,
                        judge.getUserId()
                )
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Your evaluation was not found."
                        )
                );

        return evaluationMapper.toResponse(evaluation);
    }

    private JudgeRound getRound(String roundId) {
        return judgingRoundRepository.findById(roundId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Judging round not found."
                        )
                );
    }

    private JudgeRound getAndValidateOpenRound(String roundId) {
        JudgeRound round = getRound(roundId);

        if (round.getStatus() != JudgingRoundStatus.OPEN) {
            throw new BadRequestException(
                    "Evaluations can only be changed while the round is open."
            );
        }

        return round;
    }

    private User getAndValidateJudge(String judgeEmail) {
        if (judgeEmail == null || judgeEmail.isBlank()) {
            throw new AccessDeniedException(
                    "Authenticated judge identity is required."
            );
        }

        User judge = userRepository.findByEmail(judgeEmail)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Judge account not found."
                        )
                );

        if (judge.getRole() != Role.JUDGE || !judge.isActive()) {
            throw new AccessDeniedException(
                    "An active judge account is required."
            );
        }

        return judge;
    }

    private void validateActiveAssignment(
            String roundId,
            String judgeId
    ) {
        JudgeAssignment assignment = judgeAssignmentRepository
                .findByRoundIdAndJudgeId(roundId, judgeId)
                .orElseThrow(() ->
                        new AccessDeniedException(
                                "You are not assigned to this judging round."
                        )
                );

        if (assignment.getStatus() != JudgeAssignmentStatus.ACTIVE) {
            throw new AccessDeniedException(
                    "Your assignment to this round is not active."
            );
        }
    }

    private ActivityRegistration getAndValidateEligibleRegistration(
            String registrationId,
            String activityId
    ) {
        ActivityRegistration registration =
                activityRegistrationRepository.findById(registrationId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Activity registration not found."
                                )
                        );

        if (!activityId.equals(registration.getActivityId())) {
            throw new BadRequestException(
                    "This registration does not belong to the judging activity."
            );
        }

        List<RegistrationStatus> eligibleStatuses = List.of(
                RegistrationStatus.APPROVED,
                RegistrationStatus.REGISTERED
        );

        if (!eligibleStatuses.contains(registration.getStatus())) {
            throw new BadRequestException(
                    "Only approved registrations are eligible for judging."
            );
        }

        return registration;
    }

    private JudgeEvaluation getOrCreateEvaluation(
            JudgeRound round,
            ActivityRegistration registration,
            String judgeId
    ) {
        return judgeEvaluationRepository
                .findByRoundIdAndRegistrationIdAndJudgeId(
                        round.getId(),
                        registration.getId(),
                        judgeId
                )
                .orElseGet(() -> {
                    LocalDateTime now = LocalDateTime.now();

                    return JudgeEvaluation.builder()
                            .roundId(round.getId())
                            .activityId(round.getActivityId())
                            .registrationId(registration.getId())
                            .judgeId(judgeId)
                            .scores(List.of())
                            .status(JudgeEvaluationStatus.DRAFT)
                            .createdAt(now)
                            .updatedAt(now)
                            .build();
                });
    }

    private void rejectSubmittedEvaluation(
            JudgeEvaluation evaluation
    ) {
        if (evaluation.getStatus() == JudgeEvaluationStatus.SUBMITTED) {
            throw new BadRequestException(
                    "This evaluation has already been submitted and is locked."
            );
        }
    }

    private String normalizeFeedback(String feedback) {
        if (feedback == null || feedback.isBlank()) {
            return null;
        }

        return feedback.trim();
    }
}
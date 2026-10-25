
package com.vansh.eventsphere.eventsphere.judge.service;

import com.vansh.eventsphere.eventsphere.event.service.validators.ActivityOwnershipValidator;
import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;
import com.vansh.eventsphere.eventsphere.judge.dto.CompetitionResponse;
import com.vansh.eventsphere.eventsphere.judge.dto.CreateCompetitionRequest;
import com.vansh.eventsphere.eventsphere.judge.model.Competition;
import com.vansh.eventsphere.eventsphere.judge.model.enums.CompetitionMode;
import com.vansh.eventsphere.eventsphere.judge.repository.CompetitionRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgingRoundRepository;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgingRoundStatus;
import com.vansh.eventsphere.eventsphere.judge.service.mapper.CompetitionMapper;

import com.vansh.eventsphere.eventsphere.judge.service.validator.CompetitionValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class CompetitionService {

    private final ActivityOwnershipValidator activityOwnershipValidator;
    private final CompetitionValidator competitionValidator;
    private final CompetitionMapper competitionMapper;
    private final CompetitionRepository competitionRepository;
    private final JudgingRoundRepository judgingRoundRepository;

    public CompetitionResponse createForActivity(
            String activityId,
            CreateCompetitionRequest request,
            String organizerId) {

        // 1. Verify the Activity exists and the organizer owns it.
        Activity activity = activityOwnershipValidator.getAndValidateOwnedActivity(
                activityId, organizerId);

        // 2. Validate competition configuration and prevent duplicates.
        competitionValidator.validateConfiguration(request, activity);
        competitionValidator.validateNoExistingConfiguration(activityId);

        // 3. Map the validated request into a domain object.
        Competition competition = competitionMapper.toEntity(
                activityId, organizerId, request);

        // 4. Set persistence timestamps.
        Instant now = Instant.now();
        competition.setCreatedAt(now);
        competition.setUpdatedAt(now);

        // 5. Save and return the response DTO.
        Competition savedCompetition = competitionRepository.save(competition);

        return competitionMapper.toResponse(savedCompetition);
    }

    public CompetitionResponse updateForActivity(
            String activityId,
            CreateCompetitionRequest request,
            String organizerId) {
        Activity activity = activityOwnershipValidator.getAndValidateOwnedActivity(
                activityId, organizerId);
        Competition competition = competitionRepository.findByActivityId(activityId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Competition configuration not found for this activity."));
        competitionValidator.validateConfiguration(request, activity);

        var rounds = judgingRoundRepository.findByActivityIdOrderBySequenceAsc(activityId);
        boolean judgingStarted = rounds.stream()
                .anyMatch(round -> round.getStatus() != JudgingRoundStatus.DRAFT);
        if (judgingStarted) {
            throw new BadRequestException(
                    "Competition settings cannot be changed after judging has started.");
        }
        if (request.getCompetitionMode()
                == CompetitionMode.SINGLE_STAGE
                && rounds.size() > 1) {
            throw new BadRequestException(
                    "A competition with multiple rounds cannot be changed to single-stage mode.");
        }

        competition.setJudgingEnabled(request.getJudgingEnabled());
        competition.setCompetitionMode(request.getCompetitionMode());
        competition.setRankingPolicy(request.getRankingPolicy());
        competition.setUpdatedAt(Instant.now());
        return competitionMapper.toResponse(competitionRepository.save(competition));
    }

    public CompetitionResponse getByActivity(
            String activityId,
            String organizerId) {

        // Verify ownership before revealing configuration details.
        activityOwnershipValidator.getAndValidateOwnedActivity(
                activityId, organizerId);

        Competition competition = competitionRepository
                .findByActivityId(activityId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Competition configuration not found for this activity."));

        return competitionMapper.toResponse(competition);
    }
}

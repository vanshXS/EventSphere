
package com.vansh.eventsphere.eventsphere.judge.service;

import com.vansh.eventsphere.eventsphere.event.service.validators.ActivityOwnershipValidator;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;
import com.vansh.eventsphere.eventsphere.judge.dto.CompetitionResponse;
import com.vansh.eventsphere.eventsphere.judge.dto.CreateCompetitionRequest;
import com.vansh.eventsphere.eventsphere.judge.model.Competition;
import com.vansh.eventsphere.eventsphere.judge.repository.CompetitionRepository;
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

    public CompetitionResponse createForActivity(
            String activityId,
            CreateCompetitionRequest request,
            String organizerId) {

        // 1. Verify the Activity exists and the organizer owns it.
        activityOwnershipValidator.getAndValidateOwnedActivity(
                activityId, organizerId);

        // 2. Validate competition configuration and prevent duplicates.
        competitionValidator.validateConfiguration(request);
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

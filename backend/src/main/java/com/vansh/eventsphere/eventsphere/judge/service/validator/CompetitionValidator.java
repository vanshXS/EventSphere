package com.vansh.eventsphere.eventsphere.judge.service.validator;


import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationType;
import com.vansh.eventsphere.eventsphere.judge.dto.CreateCompetitionRequest;
import com.vansh.eventsphere.eventsphere.judge.model.enums.RankingPolicy;
import com.vansh.eventsphere.eventsphere.judge.repository.CompetitionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CompetitionValidator {

    private final CompetitionRepository competitionRepository;

    public void validateConfiguration(CreateCompetitionRequest request) {
        if (request == null || request.getJudgingEnabled() == null) {
            throw new BadRequestException(
                    "A valid competition configuration is required."
            );
        }

        if (request.getJudgingEnabled() && request.getCompetitionMode() == null) {
            throw new BadRequestException(
                    "A competition mode is required when judging is enabled."
            );
        }

        if (!request.getJudgingEnabled() && request.getCompetitionMode() != null) {
            throw new BadRequestException(
                    "A competition mode must not be specified when judging is disabled."
            );
        }
    }

    public void validateConfiguration(
            CreateCompetitionRequest request,
            Activity activity
    ) {
        validateConfiguration(request);
        if (!request.getJudgingEnabled()) {
            request.setRankingPolicy(null);
            return;
        }

        if (activity.getRegistrationType() == RegistrationType.BOTH) {
            if (request.getRankingPolicy() == null) {
                request.setRankingPolicy(RankingPolicy.SEPARATE_BY_ENTRY_TYPE);
            }
        } else if (request.getRankingPolicy() != null) {
            throw new BadRequestException(
                    "A ranking policy can only be configured when the activity accepts both individuals and teams.");
        }
    }

    public void validateNoExistingConfiguration(String activityId) {
        if(competitionRepository.existsByActivityId(activityId)){
            throw new BadRequestException(
                    "A competition configuration already exists for this activity."
            );
        }
    }
}

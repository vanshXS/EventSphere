package com.vansh.eventsphere.eventsphere.judge.service.validator;


import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.judge.dto.CreateCompetitionRequest;
import com.vansh.eventsphere.eventsphere.judge.repository.CompetitionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CompetitionValidator {

    private final CompetitionRepository competitionRepository;

    public void validateConfiguration(CreateCompetitionRequest request) {

        if(request == null || request.getJudgingEnabled() == null) {
            throw new BadRequestException(
                    "A valid competition configuration is required."
            );
        }

        if(request.getJudgingEnabled() && request.getCompetitionMode() == null
        ){
            throw new BadRequestException(
                    "A competition mode is required when judging is enabled."
            );


        }

        if(!request.getJudgingEnabled() && request.getCompetitionMode() != null) {
            throw new BadRequestException(
                    "A competition mode must not be specified when judging is disabled."
            );
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

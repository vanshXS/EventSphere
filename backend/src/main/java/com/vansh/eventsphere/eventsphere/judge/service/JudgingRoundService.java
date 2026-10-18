package com.vansh.eventsphere.eventsphere.judge.service;


import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.judge.dto.CreateJudgingRoundRequest;
import com.vansh.eventsphere.eventsphere.judge.dto.JudgeRoundResponse;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeRound;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgingRoundStatus;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgingRoundRepository;
import com.vansh.eventsphere.eventsphere.judge.service.mapper.JudgeRoundMapper;
import com.vansh.eventsphere.eventsphere.judge.service.validator.JudgeRoundValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class JudgingRoundService{

    private JudgeRoundValidator validator;
    private JudgeRoundMapper mapper;
    private JudgingRoundRepository judgingRoundRepository;

    public JudgeRoundResponse createRound(
            String activityId,
            CreateJudgingRoundRequest request,
            String organizerId
    ){

        // verify that the activity exists and belongs to the orgnizer.
        Activity activity =
                validator.getAndValidateOwnedActivity(activityId, organizerId);

        // 2. Verify that judging is enabled in MULTI_ROUND mode.
        validator.getAndValidateMultiRoundCompetition(activityId, organizerId);

        // 3. Validate business rules not covered by DTO annotations.
        validator.validateUniqueCriterionNames(request.getCriteria());

        validator.validateCriterionWeightsTotal100(request.getCriteria());

        validator.validateSequenceAvailable(activity.getId(), request.getSequence());

        //convert the request into a domain model
        JudgeRound round = mapper.toRoundEntity(
                activity.getId(), organizerId, request
        );


        round.setCreatedAt(LocalDateTime.now());
        round.setUpdatedAt(LocalDateTime.now());

        JudgeRound savedRound = judgingRoundRepository.save(round);

        return mapper.toRoundResponse(savedRound);


    }

    public List<JudgeRoundResponse> getRoundsByActivity(String activityId, String organizerId){

        Activity activity =
                validator.getAndValidateOwnedActivity(
                        activityId, organizerId
                );

        validator.getAndValidateMultiRoundCompetition(
                activity.getId(), organizerId
        );

        return judgingRoundRepository
                .findByActivityIdOrderBySequenceAsc(activity.getId())
                .stream()
                .map(mapper::toRoundResponse)
                .toList();
    }

    public JudgeRoundResponse openRound(String roundId, String organizerId){

        JudgeRound round = validator.getAndValidateDraftRound(roundId);

        Activity activity =
                validator.getAndValidateOwnedActivity(round.getActivityId(), organizerId);

        validator.getAndValidateMultiRoundCompetition(activity.getId(), organizerId);

        //The round cannot open without an eligible rubric and judge panel.
        validator.validateRoundCanOpen(round);


        round.setStatus(JudgingRoundStatus.OPEN);
        round.setCreatedAt(LocalDateTime.now());
        round.setUpdatedAt(LocalDateTime.now());

        JudgeRound savedRound = judgingRoundRepository.save(round);

        return mapper.toRoundResponse(savedRound);
    }

    public JudgeRoundResponse closeRound(String roundId, String organizerId){

        JudgeRound round = validator.getAndValidateOpenRound(roundId);

        Activity activity =
                validator.getAndValidateOwnedActivity(round.getActivityId(), organizerId);

        validator.getAndValidateMultiRoundCompetition(activity.getId(), organizerId);

        round.setStatus(JudgingRoundStatus.CLOSED);
        round.setCreatedAt(LocalDateTime.now());
        round.setUpdatedAt(LocalDateTime.now());

        JudgeRound savedRound = judgingRoundRepository.save(round);

        return mapper.toRoundResponse(savedRound);
    }


}
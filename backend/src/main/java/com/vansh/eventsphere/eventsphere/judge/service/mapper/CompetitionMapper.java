
package com.vansh.eventsphere.eventsphere.judge.service.mapper;

import com.vansh.eventsphere.eventsphere.judge.dto.CompetitionResponse;
import com.vansh.eventsphere.eventsphere.judge.dto.CreateCompetitionRequest;
import com.vansh.eventsphere.eventsphere.judge.model.Competition;

import org.springframework.stereotype.Component;

@Component
public class CompetitionMapper {

    public Competition toEntity(
            String activityId,
            String organizerId,
            CreateCompetitionRequest request) {

        return Competition.builder()
                .activityId(activityId)
                .organizerId(organizerId)
                .judgingEnabled(request.getJudgingEnabled())
                .competitionMode(request.getCompetitionMode())
                .build();
    }

    public CompetitionResponse toResponse(Competition competition) {
        return CompetitionResponse.builder()
                .id(competition.getId())
                .activityId(competition.getActivityId())
                .organizerId(competition.getOrganizerId())
                .judgingEnabled(competition.isJudgingEnabled())
                .competitionMode(competition.getCompetitionMode())
                .createdAt(competition.getCreatedAt())
                .updatedAt(competition.getUpdatedAt())
                .build();
    }
}

package com.vansh.eventsphere.eventsphere.judge.dto;

import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeInvitationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JudgeInvitationResponse {

    private String id;
    private String roundId;
    private String roundName;
    private Integer sequence;
    private String activityId;
    private String activityName;
    private String eventId;
    private String eventName;
    private String organizerId;
    private String judgeId;
    private String email;
    private String invitedName;
    private JudgeInvitationStatus status;
    private LocalDateTime invitedAt;
    private LocalDateTime invitationExpiresAt;
    private LocalDateTime acceptedAt;
    private boolean accountExists;
    private String invitationLink;
}

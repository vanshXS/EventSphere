package com.vansh.eventsphere.eventsphere.judge.model;

import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeInvitationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "judge_invitations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JudgeInvitation {

    @Id
    private String id;

    @Indexed
    private String roundId;

    @Indexed
    private String activityId;

    @Indexed
    private String eventId;

    @Indexed
    private String organizerId;

    @Indexed
    private String email;

    private String invitedName;

    @Indexed
    private String judgeId;

    @Builder.Default
    private JudgeInvitationStatus status = JudgeInvitationStatus.INVITED;

    /** SHA-256 hash of the one-time invitation token. */
    @Indexed
    private String invitationTokenHash;

    private LocalDateTime invitationExpiresAt;
    private LocalDateTime invitedAt;
    private LocalDateTime acceptedAt;
    private LocalDateTime revokedAt;
}

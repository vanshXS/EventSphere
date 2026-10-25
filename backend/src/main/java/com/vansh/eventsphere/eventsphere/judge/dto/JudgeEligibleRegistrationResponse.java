package com.vansh.eventsphere.eventsphere.judge.dto;


import com.vansh.eventsphere.eventsphere.event.model.RegistrationStatus;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationType;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeEvaluationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor @NoArgsConstructor
@Builder
public class JudgeEligibleRegistrationResponse {

    private String registrationId;
    private String activityId;

    private RegistrationType registrationType;
    private RegistrationStatus registrationStatus;

    private String entryName;

    private String participantId;
    private String participantName;

    private String teamId;
    private String teamLeaderId;

    private List<JudgeParticipantResponse> roster;

    private boolean rosterSnapshotAvailable;
    private String rosterNote;

    private LocalDateTime registeredAt;

    private JudgeEvaluationStatus evaluationStatus;
    private BigDecimal myTotalScore;

}

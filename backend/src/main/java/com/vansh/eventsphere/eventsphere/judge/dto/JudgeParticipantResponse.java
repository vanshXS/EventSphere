package com.vansh.eventsphere.eventsphere.judge.dto;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor @NoArgsConstructor
@Builder
public class JudgeParticipantResponse {

    private String participantId;
    private String participantName;
    private boolean teamLeader;

}

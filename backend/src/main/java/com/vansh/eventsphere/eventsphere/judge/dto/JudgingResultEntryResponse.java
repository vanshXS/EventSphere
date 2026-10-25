package com.vansh.eventsphere.eventsphere.judge.dto;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationType;

@Data
@AllArgsConstructor @NoArgsConstructor
@Builder
public class JudgingResultEntryResponse {

    private String registrationId;
    private String entryName;
    private RegistrationType entryType;
    private BigDecimal totalScore;
    private int judgeCount;
    private int rank;
}

package com.vansh.eventsphere.eventsphere.judge.model;

import com.vansh.eventsphere.eventsphere.event.model.RegistrationType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor @NoArgsConstructor
@Builder
public class JudgingResultEntry {

    private String registrationId;
    private String entryName;
    private RegistrationType entryType;
    private BigDecimal totalScore;
    private int judgeCount;
    private int rank;

}

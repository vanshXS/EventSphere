package com.vansh.eventsphere.eventsphere.judge.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class UpdateJudgeRoundRequest {

    @NotBlank
    @Size(max = 100)
    private String name;

    @Size(max = 500)
    private String description;

    private LocalDateTime scheduledStartDateTime;

    private LocalDateTime scheduledEndDateTime;

    @Size(max = 100)
    private String scheduledTimeZoneId;

    @NotEmpty
    @Size(max = 20)
    @Valid
    private List<JudgeCriterionRequest> criteria;
}

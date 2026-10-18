package com.vansh.eventsphere.eventsphere.judge.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.List;

@Data
public class CreateJudgingRoundRequest {

    @NotBlank
    @Size(max = 100)
    private String name;

    @Size(max = 500)
    private String description;

    @NotNull
    @Positive
    private Integer sequence;

    @NotEmpty
    @Size(max = 20)
    @Valid
    private List<JudgeCriterionRequest> criteria;
}

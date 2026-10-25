package com.vansh.eventsphere.eventsphere.judge.dto;


import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor @AllArgsConstructor
public class SaveJudgeEvaluationRequest {

    @Valid
    @Size(max = 20, message = "Too many criterion score.")
    private List<CriterionScoreRequest> score;

    @Size(max = 2000, message = "Feedback cannot exceed 2000 characters.")
    private String feedback;

}

package com.vansh.eventsphere.eventsphere.judge.dto;


import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor @NoArgsConstructor
public class CriterionScoreRequest {

    @NotBlank(message = "Criterion ID is required")
    @Size(max = 100, message = "Criterion ID is too long")
    private String criteriaId;

    @NotNull(message = "Score is required")
    @DecimalMin(
            value = "0.0",
            inclusive = true,
            message = "Score cannot be negative."
    )
    private BigDecimal score;

    @Size(max = 1000, message = "Comment cannot exceed 1000 characters.")
    private String comment;
}

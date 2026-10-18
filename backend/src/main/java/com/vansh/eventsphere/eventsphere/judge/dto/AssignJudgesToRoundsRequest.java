package com.vansh.eventsphere.eventsphere.judge.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class AssignJudgesToRoundsRequest {

    @NotEmpty
    @Size(max = 20)
    private List<@NotBlank String> roundIds;

    @NotEmpty
    @Size(max = 50)
    private List<@NotBlank String> judgeIds;
}

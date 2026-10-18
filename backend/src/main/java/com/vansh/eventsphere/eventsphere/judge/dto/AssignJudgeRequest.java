package com.vansh.eventsphere.eventsphere.judge.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AssignJudgeRequest {

    @NotBlank private String judgeId;
}

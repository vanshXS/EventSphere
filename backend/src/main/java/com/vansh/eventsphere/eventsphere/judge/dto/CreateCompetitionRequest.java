package com.vansh.eventsphere.eventsphere.judge.dto;

import com.vansh.eventsphere.eventsphere.judge.model.enums.CompetitionMode;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateCompetitionRequest {

    @NotNull
    private Boolean judgingEnabled;

    private CompetitionMode competitionMode;

}

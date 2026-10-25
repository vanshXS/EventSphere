package com.vansh.eventsphere.eventsphere.event.dto;
import com.vansh.eventsphere.eventsphere.event.model.ActivityType;
import com.vansh.eventsphere.eventsphere.event.model.EventVisibility;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationType;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CreateActivityRequest {

    @NotBlank(message = "Activity name is required")
    @Size(
            min = 3,
            max = 100,
            message = "Activity name must be between 3 and 100 characters"
    )
    private String name;

    @NotBlank(message = "Activity description is required")
    @Size(
            min = 10,
            max = 2000,
            message = "Activity description must be between 10 and 2000 characters"
    )
    private String description;

    @NotNull(message = "Activity type is required")
    private ActivityType type;

    @NotBlank(message = "Activity rules are required")
    @Size(
            min = 10,
            max = 5000,
            message = "Rules must be between 10 and 5000 characters"
    )
    private String rules;

    @Size(
            max = 200,
            message = "Location cannot exceed 200 characters"
    )
    private String location;

    @NotNull(message = "Activity start date and time are required")
    private LocalDateTime startDateTime;

    @NotNull(message = "Activity end date and time are required")
    private LocalDateTime endDateTime;

    private Integer checkInOpensMinutesBeforeStart;

    @NotNull(message = "Registration deadline is required")
    private LocalDateTime registrationDeadline;

    @NotNull(message = "Registration type is required")
    private RegistrationType registrationType;

    /**
     * Required only for standalone activities.
     * Ignored/validated against parent event for event activities
     */
    private EventVisibility visibility;


    @Positive(message = "Registration capacity must be greater than 0")
    private Integer capacity;

    private Integer minTeamSize;

    private Integer maxTeamSize;

    private boolean requiresApproval = false;



}

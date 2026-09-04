package com.vansh.eventsphere.eventsphere.event.dto;

import com.vansh.eventsphere.eventsphere.event.model.ActivityType;
import com.vansh.eventsphere.eventsphere.event.model.EventVisibility;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UpdateActivityRequest {

    @NotBlank(message = "Activity name is required")
    private String name;

    @NotBlank(message = "Activity description is required")
    @Size(min = 10, max = 2000, message = "Activity description must be between 10 and 2000 characters")
    private String description;

    @NotNull(message = "Activity type is required")
    private ActivityType type;

    @NotBlank(message = "Rules are required")
    @Size(min = 10, max = 5000, message = "Rules must be between 10 and 5000 characters")
    private String rules;

    @NotNull(message = "Registration type is required")
    private RegistrationType registrationType;

    @NotNull(message = "Registration deadline is required")
    private LocalDateTime registrationDeadline;

    @NotNull(message = "Start date and time are required")
    private LocalDateTime startDateTime;

    @NotNull(message = "End date and time are required")
    private LocalDateTime endDateTime;

    @Size(max = 200, message = "Location cannot exceed 200 characters")
    private String location;

    /**
     * Required only for standalone activities.
     * Ignored for event activities, which inherit visibility from the Event.
     */
    private EventVisibility visibility;

    @Positive(message = "Registration capacity must be greater than 0")
    private Integer capacity;

    private Integer minTeamSize;

    private Integer maxTeamSize;
}

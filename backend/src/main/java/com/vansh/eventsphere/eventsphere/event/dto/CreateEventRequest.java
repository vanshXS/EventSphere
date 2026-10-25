package com.vansh.eventsphere.eventsphere.event.dto;

import com.vansh.eventsphere.eventsphere.event.model.ActivityType;
import com.vansh.eventsphere.eventsphere.event.model.EventVisibility;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationType;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor @NoArgsConstructor
public class CreateEventRequest {

    @NotBlank(message = "Event title is required")
    @Size(
            min = 3,
            max = 100,
            message = "Event title must be between 3 and 100 characters"
    )
    private String title;

    @NotBlank(message = "Event description is required")
    @Size(
            min = 10,
            max = 2000,
            message = "Event description must be between 10 and 2000"
    )
    private String description;

    @NotBlank(message = "Venue is required")
    @Size(
            max = 200,
            message = "Venue cannot exceed 200 characters"
    )
    private String venue;

    @NotNull(message = "Start date and time are required")
    @Future(message = "Start date and time must be in the future")
    private LocalDateTime startDateTime;

    @NotNull(message = "End date and time are required")
    @FutureOrPresent(message = "End date and time cannot be in the past")
    private LocalDateTime endDateTime;

    private Integer checkInOpensMinutesBeforeStart;

    @NotNull(message = "Visibility must be set up")
    private EventVisibility visibility;


}

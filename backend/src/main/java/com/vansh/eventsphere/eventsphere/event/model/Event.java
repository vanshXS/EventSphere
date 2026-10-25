package com.vansh.eventsphere.eventsphere.event.model;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@CompoundIndex(
        name = "event_status_start_idx",
        def = "{'event_status' : 1, 'startDateTime': 1}"
)

@CompoundIndex(
        name = "event_status_end_idx",
        def = "{'event_status': 1, 'endDateTime': 1}"
)
@Document(collection = "events")
@Data
@Builder
@NoArgsConstructor @AllArgsConstructor
public class Event {

    public static final int DEFAULT_CHECK_IN_OPENS_MINUTES_BEFORE_START = 60;

    @Id
    private String id;
    private String organizerId;
    private String collegeId;
    private String title;
    private String description;

    private String venue;
    @Indexed
    private LocalDateTime startDateTime;
    @Indexed
    private LocalDateTime endDateTime;
    @Builder.Default
    private Integer checkInOpensMinutesBeforeStart =
            DEFAULT_CHECK_IN_OPENS_MINUTES_BEFORE_START;
    private String rules;

    private EventVisibility visibility;
    @Indexed
    private EventStatus eventStatus;


    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;



}

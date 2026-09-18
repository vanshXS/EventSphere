package com.vansh.eventsphere.eventsphere.event.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@CompoundIndex(
        name = "ticket_checkin_type_idx",
        def = "{'ticketId': 1, 'checkInType': 1}",
        unique = true
)
@Document(collection = "attendance")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Attendance {

    @Id
    private String id;

    @Indexed
    private String registrationId;

    @Indexed
    private String ticketId;

    @Indexed
    private String eventId;

    @Indexed
    private String activityId;

    @Indexed
    private String participantId;

    private CheckInType checkInType;

    @Indexed
    private String checkedInBy;

    private LocalDateTime checkedInAt;
    private long revision;
}

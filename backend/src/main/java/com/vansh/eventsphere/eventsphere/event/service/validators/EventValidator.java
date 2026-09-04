package com.vansh.eventsphere.eventsphere.event.service.validators;

import com.vansh.eventsphere.eventsphere.event.dto.CreateEventRequest;
import com.vansh.eventsphere.eventsphere.event.model.Event;
import com.vansh.eventsphere.eventsphere.event.model.EventStatus;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;


@Component
public class EventValidator {


    public void validateEventDate(CreateEventRequest request) {

        if(!request.getEndDateTime().isAfter(request.getStartDateTime())) {
            throw new IllegalArgumentException(
                    "End date and time must be after start date and time"
            );
        }
    }

    public void validateEventAccess(Event event, String organizerId) {

        if(!event.getOrganizerId().equals(organizerId)) {
            throw new RuntimeException(
                    "You are not allowed to update this event."
            );
        }

        if(event.getEventStatus() != EventStatus.DRAFT){
            throw new IllegalStateException(
                    "Only draft events can be updated"
            );
        }
    }

    public void validateCanPublish(Event event) {

        if(event.getEventStatus() == EventStatus.PUBLISHED) {
            throw new IllegalStateException(
                    "Event already published"
            );
        }

        if(event.getEventStatus() != EventStatus.DRAFT) {
            throw new BadRequestException(
                    "Only draft events can be published"
            );
        }

        LocalDateTime now =  LocalDateTime.now();


        if(!event.getStartDateTime().isAfter(now)){
            throw new BadRequestException(
                    "Event start time must be in the future."
            );
        }
    }


}

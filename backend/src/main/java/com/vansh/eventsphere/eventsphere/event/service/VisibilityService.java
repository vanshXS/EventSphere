package com.vansh.eventsphere.eventsphere.event.service;

import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.event.model.Event;
import com.vansh.eventsphere.eventsphere.event.model.EventVisibility;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class VisibilityService {

   public boolean canViewEvent(
           Event event,
           User participant
   ) {
        return isVisible(
                event.getVisibility(),
                event.getCollegeId(),
                participant
        );
   }

    /**
     * Standalone activities carry their own visibility
     * Event activities inherit visibility from parent Event.
     */

    public boolean canViewStandAloneActivity(
            Activity activity,
            User organizer,
            User participant
    ) {
        return isVisible(
                activity.getVisibility(),
                organizer != null ? organizer.getCollegeId() : null,
                participant
        );
    }

   private boolean isVisible(
           EventVisibility visibility,
           String ownerCollegeId,
           User participant
   ) {
       if(visibility == EventVisibility.OPEN_TO_ALL) return true;

       if(visibility == EventVisibility.COLLEGE_ONLY) {
           if(participant.getCollegeId() == null || ownerCollegeId == null) {
               log.debug(
                       "COLLEGE_ONLY check failed: participantCollegeId={}, ownerCollegeId={}",
                       participant.getCollegeId(),
                       ownerCollegeId
               );
               return false;
           }

           return participant.getCollegeId().equals(ownerCollegeId);

       }
       return false;
   }

}

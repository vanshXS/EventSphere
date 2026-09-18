package com.vansh.eventsphere.eventsphere.event.controller;

import com.vansh.eventsphere.eventsphere.event.dto.AttendanceResponse;
import com.vansh.eventsphere.eventsphere.event.dto.CheckInRequest;
import com.vansh.eventsphere.eventsphere.event.service.AttendanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;

    @PostMapping("/volunteer/attendance/check-in")
    @ResponseStatus(HttpStatus.OK)
    public AttendanceResponse checkIn(
            @Valid @RequestBody CheckInRequest request,
            Authentication authentication
    ) {
        return attendanceService.checkIn(
                request.getQrPayload(),
                authentication.getName()
        );
    }

    @GetMapping("/organizer/events/{eventId}/attendance")
    public List<AttendanceResponse> getEventAttendance(
            @PathVariable String eventId,
            Authentication authentication
    ) {
        return attendanceService.getEventAttendance(
                eventId,
                authentication.getName()
        );
    }

    @GetMapping("/organizer/activities/{activityId}/attendance")
    public List<AttendanceResponse> getActivityAttendance(
            @PathVariable String activityId,
            Authentication authentication
    ) {
        return attendanceService.getActivityAttendance(
                activityId,
                authentication.getName()
        );
    }
}

package com.vansh.eventsphere.eventsphere.college.controller;

import com.vansh.eventsphere.eventsphere.college.model.College;
import com.vansh.eventsphere.eventsphere.college.services.CollegeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/colleges")
public class CollegeController {

    private final CollegeService collegeService;

    @GetMapping("/search")
    public List<College> searchCollege(
            @RequestParam String name
    ) {

        return collegeService.searchCollege(name);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public College createCollege(
            @RequestBody College college
    ) {

        return collegeService.createCollege(college);
    }
}

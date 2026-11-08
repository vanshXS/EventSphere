package com.vansh.eventsphere.eventsphere.college.controller;

import com.vansh.eventsphere.eventsphere.college.dto.CollegeSummaryResponse;
import com.vansh.eventsphere.eventsphere.college.model.College;
import com.vansh.eventsphere.eventsphere.college.service.CollegeService;

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
    public List<CollegeSummaryResponse> searchCollege(
            @RequestParam String name
    ) {

        return collegeService.searchCollege(name);
    }

    @GetMapping("/{id}")
    public CollegeSummaryResponse getCollegeById(
            @PathVariable String id
    ) {
        return collegeService.getCollegeById(id);
    }

}

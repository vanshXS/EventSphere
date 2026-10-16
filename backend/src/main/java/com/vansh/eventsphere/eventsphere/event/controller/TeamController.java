package com.vansh.eventsphere.eventsphere.event.controller;

import com.vansh.eventsphere.eventsphere.event.dto.AddTeamMemberRequest;
import com.vansh.eventsphere.eventsphere.event.dto.ChangeTeamLeaderRequest;
import com.vansh.eventsphere.eventsphere.event.dto.CreateTeamRequest;
import com.vansh.eventsphere.eventsphere.event.dto.TeamResponse;
import com.vansh.eventsphere.eventsphere.event.service.TeamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/participant/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TeamResponse createTeam(
            @Valid @RequestBody CreateTeamRequest request,
            Authentication authentication
    ) {
        return teamService.createTeam(request, authentication.getName());
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<TeamResponse> getMyTeams(
            Authentication authentication
    ) {
        return teamService.getMyTeams(authentication.getName());
    }

    @GetMapping("/{teamId}")
    @ResponseStatus(HttpStatus.OK)
    public TeamResponse getTeam(
            @PathVariable String teamId
    ) {
        return teamService.getTeam(teamId);
    }

    @PostMapping("/{teamId}/members")
    @ResponseStatus(HttpStatus.OK)
    public TeamResponse addMember(
            @PathVariable String teamId,
            @Valid @RequestBody AddTeamMemberRequest request,
            Authentication authentication
    ) {
        return teamService.addMember(teamId, request, authentication.getName());
    }

    @PutMapping("/{teamId}/leader")
    @ResponseStatus(HttpStatus.OK)
    public TeamResponse changeLeader(
            @PathVariable String teamId,
            @Valid @RequestBody ChangeTeamLeaderRequest request,
            Authentication authentication
    ) {
        return teamService.changeLeader(request, teamId, authentication.getName());
    }

    @DeleteMapping("/{teamId}/members/{memberId}")
    @ResponseStatus(HttpStatus.OK)
    public TeamResponse removeMember(
            @PathVariable String teamId,
            @PathVariable String memberId,
            Authentication authentication
    ) {
        return teamService.removeMember(teamId, memberId, authentication.getName());
    }
}



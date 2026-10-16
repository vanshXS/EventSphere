package com.vansh.eventsphere.eventsphere.event.service;

import com.vansh.eventsphere.eventsphere.event.dto.AddTeamMemberRequest;
import com.vansh.eventsphere.eventsphere.event.dto.ChangeTeamLeaderRequest;
import com.vansh.eventsphere.eventsphere.event.dto.CreateTeamRequest;
import com.vansh.eventsphere.eventsphere.event.dto.TeamResponse;
import com.vansh.eventsphere.eventsphere.event.model.Team;
import com.vansh.eventsphere.eventsphere.event.repository.TeamRepository;
import com.vansh.eventsphere.eventsphere.event.service.mappers.TeamMapper;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;
import com.vansh.eventsphere.eventsphere.user.model.Role;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TeamService {

    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final TeamMapper mapper;


    /**
     * Create a new team.
     * The authenticated participant automatically becomes:
     * - creator
     * - leader
     * - first time member
     */
    public TeamResponse createTeam(
            CreateTeamRequest request,
            String creatorId
    ) {

        User creator = getUser(creatorId);
        if (creator.getRole() != Role.PARTICIPANT) {
            throw new BadRequestException("Only participants can create a team.");
        }

        String teamName = request.getName().trim();

        if(teamRepository.existsByNameIgnoreCaseAndLeaderId(teamName, creatorId)) {
            throw new BadRequestException("Team already exists");
        }
        Team team = Team.builder()
                .name(teamName)
                .createdBy(creatorId)
                .leaderId(creatorId)
                .membersId(new ArrayList<>(List.of(creatorId)))
                .build();

        Team savedTeam = teamRepository.save(team);

        return mapper.mapToResponse(savedTeam);

    }

    public TeamResponse getTeam(String teamId) {
        return mapper.mapToResponse(getTeamEntity(teamId));
    }

    public List<TeamResponse> getMyTeams(String participantId) {
        return teamRepository.findByMembersIdContaining(participantId)
                .stream()
                .map(mapper::mapToResponse)
                .toList();
    }

    public TeamResponse addMember(
            String teamId,
            AddTeamMemberRequest request,
            String requesterId
    ) {

        Team team = getTeamEntity(teamId);
        validateLeader(team, requesterId);
        String memberIdentifier = request.getMemberId().trim();

        User member = userRepository.findById(memberIdentifier)
                .or(() -> userRepository.findByEmail(memberIdentifier))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Participant not found with ID or Email: " + memberIdentifier
                ));

        if (member.getRole() != Role.PARTICIPANT) {
            throw new BadRequestException(
                    "Only users with the PARTICIPANT role can be added as team members."
            );
        }

        if(team.getMembersId().contains(member.getUserId())) {
            throw new BadRequestException(
                    "The participant is already a member of the team"
            );
        }
        team.getMembersId().add(member.getUserId());
        Team updatedTeam = teamRepository.save(team);
        return mapper.mapToResponse(updatedTeam);
    }

    public TeamResponse removeMember(
            String teamId,
            String memberId,
            String requesterId
    ) {
        Team team = getTeamEntity(teamId);
        validateLeader(team, requesterId);

        if (team.getLeaderId().equals(memberId)) {
            throw new BadRequestException("Team leader cannot be removed. Transfer leadership first.");
        }

        if (!team.getMembersId().contains(memberId)) {
            throw new BadRequestException("Participant is not a member of this team.");
        }

        team.getMembersId().remove(memberId);
        Team updatedTeam = teamRepository.save(team);
        return mapper.mapToResponse(updatedTeam);
    }

    public TeamResponse changeLeader(
            ChangeTeamLeaderRequest request,
            String teamId,
            String requesterId
    ){
        Team team = getTeamEntity(teamId);
        validateLeader(team, requesterId);

        String newLeaderId =
                request.getLeaderId();

        if(!team.getMembersId().contains(newLeaderId)) {
            throw new BadRequestException(
                    "The new leader must already be a member of the team."
            );
        }
        if(!team.getLeaderId().equals(requesterId)) {
            throw new BadRequestException(
                    "This participant is already a team leader."
            );
        }
        getUser(requesterId);
        team.setLeaderId(newLeaderId);
        Team updatedTeam = teamRepository.save(team);

        return mapper.mapToResponse(updatedTeam);
    }

    //Helper functions
    private Team getTeamEntity(String teamId) {
        return
                teamRepository.findById(teamId)
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Team not found."
                        ));
    }

    private User getUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
    }

    private void validateLeader(
            Team team,
            String requesterId
    ) {
        if(!team.getLeaderId().equals(requesterId)) {
            throw new BadRequestException(
                    "Only the team leader can perform this action."
            );
        }

    }
}

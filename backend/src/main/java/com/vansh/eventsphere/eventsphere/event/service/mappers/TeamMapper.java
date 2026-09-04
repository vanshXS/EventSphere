package com.vansh.eventsphere.eventsphere.event.service.mappers;

import com.vansh.eventsphere.eventsphere.event.dto.TeamMemberDto;
import com.vansh.eventsphere.eventsphere.event.dto.TeamResponse;
import com.vansh.eventsphere.eventsphere.event.model.Team;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class TeamMapper {

    private final UserRepository userRepository;

    public TeamResponse mapToResponse(Team team) {
        int membersCount = team.getMembersId() == null ? 0 : team.getMembersId().size();

        List<TeamMemberDto> members = new ArrayList<>();
        if (team.getMembersId() != null && !team.getMembersId().isEmpty()) {
            List<User> users = userRepository.findAllById(team.getMembersId());
            Map<String, User> userMap = users.stream()
                    .collect(Collectors.toMap(User::getUserId, u -> u, (u1, u2) -> u1));

            members = team.getMembersId().stream().map(mId -> {
                User u = userMap.get(mId);
                if (u != null) {
                    return TeamMemberDto.builder()
                            .userId(u.getUserId())
                            .name(u.getName())
                            .email(u.getEmail())
                            .role(u.getRole())
                            .leader(mId.equals(team.getLeaderId()))
                            .build();
                } else {
                    return TeamMemberDto.builder()
                            .userId(mId)
                            .name("Member (" + mId + ")")
                            .email("")
                            .leader(mId.equals(team.getLeaderId()))
                            .build();
                }
            }).collect(Collectors.toList());
        }

        return TeamResponse.builder()
                .id(team.getId())
                .name(team.getName())
                .createdBy(team.getCreatedBy())
                .leaderId(team.getLeaderId())
                .memberIds(team.getMembersId())
                .members(members)
                .memberCounts(membersCount)
                .createdAt(team.getCreatedAt())
                .updateAt(team.getUpdatedAt())
                .build();
    }
}


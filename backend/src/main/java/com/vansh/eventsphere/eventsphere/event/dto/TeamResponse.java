package com.vansh.eventsphere.eventsphere.event.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamResponse {

    private String id;
    private String name;
    private String createdBy;
    private String leaderId;
    private List<String> memberIds;
    private List<TeamMemberDto> members;
    private int memberCounts;
    private LocalDateTime createdAt;
    private LocalDateTime updateAt;
}

package com.vansh.eventsphere.eventsphere.event.service;

import com.vansh.eventsphere.eventsphere.event.dto.TeamResponse;
import com.vansh.eventsphere.eventsphere.event.model.ActivityRegistration;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationStatus;
import com.vansh.eventsphere.eventsphere.event.model.Team;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRegistrationRepository;
import com.vansh.eventsphere.eventsphere.event.repository.TeamRepository;
import com.vansh.eventsphere.eventsphere.event.service.mappers.TeamMapper;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;
import com.vansh.eventsphere.eventsphere.user.model.Role;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TeamServiceTest {

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TeamMapper mapper;

    @Mock
    private ActivityRegistrationRepository activityRegistrationRepository;

    @InjectMocks
    private TeamService teamService;

    private User leaderUser;
    private User memberUser;
    private Team team;

    @BeforeEach
    void setUp() {
        leaderUser = User.builder()
                .userId("leader-1")
                .name("Leader Name")
                .email("leader@example.com")
                .role(Role.PARTICIPANT)
                .build();

        memberUser = User.builder()
                .userId("member-1")
                .name("Member Name")
                .email("member@example.com")
                .role(Role.PARTICIPANT)
                .build();

        team = Team.builder()
                .id("team-100")
                .name("Alpha Team")
                .createdBy("leader-1")
                .leaderId("leader-1")
                .membersId(new ArrayList<>(List.of("leader-1", "member-1")))
                .build();
    }

    @Test
    void deleteTeam_success_whenLeaderAndNoActiveRegistrations() {
        when(teamRepository.findById("team-100")).thenReturn(Optional.of(team));
        when(userRepository.findById("leader-1")).thenReturn(Optional.of(leaderUser));
        when(activityRegistrationRepository.findByTeamIdIn(List.of("team-100"))).thenReturn(List.of());

        assertDoesNotThrow(() -> teamService.deleteTeam("team-100", "leader-1"));

        verify(teamRepository).delete(team);
    }

    @Test
    void deleteTeam_success_whenLeaderByEmailIdentifier() {
        when(teamRepository.findById("team-100")).thenReturn(Optional.of(team));
        when(userRepository.findById("leader@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("leader@example.com")).thenReturn(Optional.of(leaderUser));
        when(activityRegistrationRepository.findByTeamIdIn(List.of("team-100"))).thenReturn(List.of());

        assertDoesNotThrow(() -> teamService.deleteTeam("team-100", "leader@example.com"));

        verify(teamRepository).delete(team);
    }

    @Test
    void deleteTeam_throwsException_whenTeamNotFound() {
        when(teamRepository.findById("team-999")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> teamService.deleteTeam("team-999", "leader-1"));

        verify(teamRepository, never()).delete(any());
    }

    @Test
    void deleteTeam_throwsException_whenCallerIsNotLeader() {
        when(teamRepository.findById("team-100")).thenReturn(Optional.of(team));
        when(userRepository.findById("member-1")).thenReturn(Optional.of(memberUser));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> teamService.deleteTeam("team-100", "member-1"));

        assertTrue(ex.getMessage().contains("Only the team leader"));
        verify(teamRepository, never()).delete(any());
    }

    @Test
    void deleteTeam_throwsException_whenActiveRegistrationsExist() {
        when(teamRepository.findById("team-100")).thenReturn(Optional.of(team));
        when(userRepository.findById("leader-1")).thenReturn(Optional.of(leaderUser));

        ActivityRegistration activeReg = ActivityRegistration.builder()
                .id("reg-1")
                .teamId("team-100")
                .status(RegistrationStatus.APPROVED)
                .build();

        when(activityRegistrationRepository.findByTeamIdIn(List.of("team-100"))).thenReturn(List.of(activeReg));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> teamService.deleteTeam("team-100", "leader-1"));

        assertTrue(ex.getMessage().contains("active or pending"));
        verify(teamRepository, never()).delete(any());
    }

    @Test
    void deleteTeam_success_whenOnlyCancelledRegistrationsExist() {
        when(teamRepository.findById("team-100")).thenReturn(Optional.of(team));
        when(userRepository.findById("leader-1")).thenReturn(Optional.of(leaderUser));

        ActivityRegistration cancelledReg = ActivityRegistration.builder()
                .id("reg-1")
                .teamId("team-100")
                .status(RegistrationStatus.CANCELLED)
                .build();

        when(activityRegistrationRepository.findByTeamIdIn(List.of("team-100"))).thenReturn(List.of(cancelledReg));

        assertDoesNotThrow(() -> teamService.deleteTeam("team-100", "leader-1"));

        verify(teamRepository).delete(team);
    }
}

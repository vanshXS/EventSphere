package com.vansh.eventsphere.eventsphere.event.service;

import com.vansh.eventsphere.eventsphere.event.dto.ActivityRegistrationRequest;
import com.vansh.eventsphere.eventsphere.event.dto.ActivityRegistrationResponse;
import com.vansh.eventsphere.eventsphere.event.dto.OrganizerRegistrationResponse;
import com.vansh.eventsphere.eventsphere.event.model.*;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRegistrationRepository;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRepository;
import com.vansh.eventsphere.eventsphere.event.repository.EventRepository;
import com.vansh.eventsphere.eventsphere.event.repository.TeamRepository;
import com.vansh.eventsphere.eventsphere.event.service.mappers.ActivityRegistrationMapper;
import com.vansh.eventsphere.eventsphere.event.service.validators.ActivityRegistrationValidator;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.user.model.Role;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ActivityRegistrationServiceTest {

    @Mock
    private ActivityRegistrationRepository activityRegistrationRepository;
    @Mock
    private ActivityRepository activityRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private EventRepository eventRepository;
    @Mock
    private VisibilityService visibilityService;
    @Mock
    private TeamRepository teamRepository;

    private ActivityRegistrationValidator validator;
    private ActivityRegistrationMapper mapper;
    private ActivityRegistrationService service;

    private User participant;
    private Event event;
    private Activity individualActivity;
    private Activity teamActivity;
    private Team team;

    @BeforeEach
    void setUp() {
        validator = new ActivityRegistrationValidator(activityRegistrationRepository, teamRepository);
        mapper = new ActivityRegistrationMapper();
        service = new ActivityRegistrationService(
                mapper,
                activityRegistrationRepository,
                activityRepository,
                userRepository,
                eventRepository,
                teamRepository,
                visibilityService,
                validator
        );

        participant = User.builder()
                .userId("user-123")
                .email("student@college.edu")
                .collegeId("college-1")
                .role(Role.PARTICIPANT)
                .build();

        event = Event.builder()
                .id("event-123")
                .collegeId("college-1")
                .visibility(EventVisibility.COLLEGE_ONLY)
                .build();

        individualActivity = Activity.builder()
                .id("act-ind")
                .eventId("event-123")
                .registrationType(RegistrationType.INDIVIDUAL)
                .registrationDeadline(LocalDateTime.now().plusDays(2))
                .capacity(10)
                .build();

        teamActivity = Activity.builder()
                .id("act-team")
                .eventId("event-123")
                .registrationType(RegistrationType.TEAM)
                .registrationDeadline(LocalDateTime.now().plusDays(2))
                .minTeamSize(2)
                .maxTeamSize(4)
                .capacity(5)
                .build();

        team = Team.builder()
                .id("team-123")
                .name("Alpha Squad")
                .leaderId("user-123")
                .createdBy("user-123")
                .membersId(List.of("user-123", "user-456"))
                .build();
    }

    @Test
    @DisplayName("Should successfully register individual participant")
    void registerIndividual_Success() {
        when(userRepository.findById("user-123")).thenReturn(Optional.of(participant));
        when(activityRepository.findById("act-ind")).thenReturn(Optional.of(individualActivity));
        when(eventRepository.findById("event-123")).thenReturn(Optional.of(event));
        when(visibilityService.canViewEvent(event, participant)).thenReturn(true);
        when(activityRegistrationRepository.existsByActivityIdAndParticipantIdAndStatus("act-ind", "user-123", RegistrationStatus.REGISTERED)).thenReturn(false);
        when(activityRegistrationRepository.countByActivityIdAndStatus("act-ind", RegistrationStatus.REGISTERED)).thenReturn(2L);

        when(activityRegistrationRepository.save(any(ActivityRegistration.class)))
                .thenAnswer(invocation -> {
                    ActivityRegistration reg = invocation.getArgument(0);
                    reg.setId("reg-1");
                    return reg;
                });

        ActivityRegistrationRequest request = new ActivityRegistrationRequest();
        request.setRegistrationType(RegistrationType.INDIVIDUAL);

        ActivityRegistrationResponse response = service.register("act-ind", "user-123", request);

        assertNotNull(response);
        assertEquals("reg-1", response.getId());
        assertEquals("act-ind", response.getActivityId());
        assertEquals("user-123", response.getParticipantId());
        assertEquals(RegistrationStatus.REGISTERED, response.getStatus());
        assertEquals(RegistrationType.INDIVIDUAL, response.getRegistrationType());
    }

    @Test
    @DisplayName("Should successfully register team when participant is a member")
    void registerTeam_Success() {
        when(userRepository.findById("user-123")).thenReturn(Optional.of(participant));
        when(activityRepository.findById("act-team")).thenReturn(Optional.of(teamActivity));
        when(eventRepository.findById("event-123")).thenReturn(Optional.of(event));
        when(visibilityService.canViewEvent(event, participant)).thenReturn(true);
        when(teamRepository.findById("team-123")).thenReturn(Optional.of(team));
        when(activityRegistrationRepository.existsByActivityIdAndTeamIdAndStatus("act-team", "team-123", RegistrationStatus.REGISTERED)).thenReturn(false);
        when(activityRegistrationRepository.countByActivityIdAndStatus("act-team", RegistrationStatus.REGISTERED)).thenReturn(1L);

        when(activityRegistrationRepository.save(any(ActivityRegistration.class)))
                .thenAnswer(invocation -> {
                    ActivityRegistration reg = invocation.getArgument(0);
                    reg.setId("reg-team-1");
                    return reg;
                });

        ActivityRegistrationRequest request = new ActivityRegistrationRequest();
        request.setRegistrationType(RegistrationType.TEAM);
        request.setTeamId("team-123");

        ActivityRegistrationResponse response = service.register("act-team", "user-123", request);

        assertNotNull(response);
        assertEquals("reg-team-1", response.getId());
        assertEquals("team-123", response.getTeamId());
        assertEquals(RegistrationType.TEAM, response.getRegistrationType());
    }

    @Test
    @DisplayName("Should reject team registration if participant is not a member of the team")
    void registerTeam_NotAMember_ThrowsException() {
        when(userRepository.findById("user-999")).thenReturn(Optional.of(
                User.builder().userId("user-999").collegeId("college-1").build()
        ));
        when(activityRepository.findById("act-team")).thenReturn(Optional.of(teamActivity));
        when(eventRepository.findById("event-123")).thenReturn(Optional.of(event));
        when(visibilityService.canViewEvent(any(), any())).thenReturn(true);
        when(teamRepository.findById("team-123")).thenReturn(Optional.of(team));

        ActivityRegistrationRequest request = new ActivityRegistrationRequest();
        request.setRegistrationType(RegistrationType.TEAM);
        request.setTeamId("team-123");

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                service.register("act-team", "user-999", request)
        );
        assertEquals("You are not a member of this team.", ex.getMessage());
    }

    @Test
    @DisplayName("Should reject team registration if team size is less than minTeamSize")
    void registerTeam_TeamSizeTooSmall_ThrowsException() {
        Team smallTeam = Team.builder()
                .id("team-small")
                .name("Solo Team")
                .leaderId("user-123")
                .createdBy("user-123")
                .membersId(List.of("user-123")) // only 1 member, minTeamSize is 2
                .build();

        when(userRepository.findById("user-123")).thenReturn(Optional.of(participant));
        when(activityRepository.findById("act-team")).thenReturn(Optional.of(teamActivity));
        when(eventRepository.findById("event-123")).thenReturn(Optional.of(event));
        when(visibilityService.canViewEvent(any(), any())).thenReturn(true);
        when(teamRepository.findById("team-small")).thenReturn(Optional.of(smallTeam));

        ActivityRegistrationRequest request = new ActivityRegistrationRequest();
        request.setRegistrationType(RegistrationType.TEAM);
        request.setTeamId("team-small");

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                service.register("act-team", "user-123", request)
        );
        assertTrue(ex.getMessage().contains("Team size must be at least 2 members."));
    }

    @Test
    @DisplayName("Should reject team registration if team size exceeds maxTeamSize")
    void registerTeam_TeamSizeTooLarge_ThrowsException() {
        Team largeTeam = Team.builder()
                .id("team-large")
                .name("Large Team")
                .leaderId("user-123")
                .createdBy("user-123")
                .membersId(List.of("user-123", "user-2", "user-3", "user-4", "user-5")) // 5 members, maxTeamSize is 4
                .build();

        when(userRepository.findById("user-123")).thenReturn(Optional.of(participant));
        when(activityRepository.findById("act-team")).thenReturn(Optional.of(teamActivity));
        when(eventRepository.findById("event-123")).thenReturn(Optional.of(event));
        when(visibilityService.canViewEvent(any(), any())).thenReturn(true);
        when(teamRepository.findById("team-large")).thenReturn(Optional.of(largeTeam));

        ActivityRegistrationRequest request = new ActivityRegistrationRequest();
        request.setRegistrationType(RegistrationType.TEAM);
        request.setTeamId("team-large");

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                service.register("act-team", "user-123", request)
        );
        assertTrue(ex.getMessage().contains("Team size cannot exceed 4 members."));
    }

    @Test
    @DisplayName("Should reject registration when registration deadline has passed")
    void register_DeadlinePassed_ThrowsException() {
        Activity expiredActivity = Activity.builder()
                .id("act-exp")
                .eventId("event-123")
                .registrationType(RegistrationType.INDIVIDUAL)
                .registrationDeadline(LocalDateTime.now().minusHours(1))
                .build();

        when(userRepository.findById("user-123")).thenReturn(Optional.of(participant));
        when(activityRepository.findById("act-exp")).thenReturn(Optional.of(expiredActivity));
        when(eventRepository.findById("event-123")).thenReturn(Optional.of(event));
        when(visibilityService.canViewEvent(event, participant)).thenReturn(true);

        ActivityRegistrationRequest request = new ActivityRegistrationRequest();
        request.setRegistrationType(RegistrationType.INDIVIDUAL);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                service.register("act-exp", "user-123", request)
        );
        assertEquals("Registration for this activity has closed.", ex.getMessage());
    }

    @Test
    @DisplayName("Should reject duplicate active registration for individual")
    void register_DuplicateIndividual_ThrowsException() {
        when(userRepository.findById("user-123")).thenReturn(Optional.of(participant));
        when(activityRepository.findById("act-ind")).thenReturn(Optional.of(individualActivity));
        when(eventRepository.findById("event-123")).thenReturn(Optional.of(event));
        when(visibilityService.canViewEvent(event, participant)).thenReturn(true);
        when(activityRegistrationRepository.existsByActivityIdAndParticipantIdAndStatus("act-ind", "user-123", RegistrationStatus.REGISTERED)).thenReturn(true);

        ActivityRegistrationRequest request = new ActivityRegistrationRequest();
        request.setRegistrationType(RegistrationType.INDIVIDUAL);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                service.register("act-ind", "user-123", request)
        );
        assertEquals("You are already registered for this activity.", ex.getMessage());
    }

    @Test
    @DisplayName("Should reject registration when capacity slots are full")
    void register_CapacityFull_ThrowsException() {
        when(userRepository.findById("user-123")).thenReturn(Optional.of(participant));
        when(activityRepository.findById("act-ind")).thenReturn(Optional.of(individualActivity));
        when(eventRepository.findById("event-123")).thenReturn(Optional.of(event));
        when(visibilityService.canViewEvent(event, participant)).thenReturn(true);
        when(activityRegistrationRepository.existsByActivityIdAndParticipantIdAndStatus("act-ind", "user-123", RegistrationStatus.REGISTERED)).thenReturn(false);
        when(activityRegistrationRepository.countByActivityIdAndStatus("act-ind", RegistrationStatus.REGISTERED)).thenReturn(10L); // max capacity is 10

        ActivityRegistrationRequest request = new ActivityRegistrationRequest();
        request.setRegistrationType(RegistrationType.INDIVIDUAL);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                service.register("act-ind", "user-123", request)
        );
        assertEquals("Registration slots for this activity are full.", ex.getMessage());
    }

    @Test
    @DisplayName("Should fetch all registrations for authenticated participant")
    void getMyRegistrations_ReturnsList() {
        ActivityRegistration reg = ActivityRegistration.builder()
                .id("reg-1")
                .activityId("act-ind")
                .participantId("user-123")
                .status(RegistrationStatus.REGISTERED)
                .registrationType(RegistrationType.INDIVIDUAL)
                .registeredAt(LocalDateTime.now())
                .build();

        when(activityRegistrationRepository.findByParticipantId("user-123")).thenReturn(List.of(reg));

        List<ActivityRegistrationResponse> result = service.getMyRegistrations("user-123");

        assertEquals(1, result.size());
        assertEquals("reg-1", result.get(0).getId());
        assertEquals("user-123", result.get(0).getParticipantId());
    }

    @Test
    @DisplayName("Should cancel registration and update status to CANCELLED")
    void cancelRegistration_Success() {
        ActivityRegistration reg = ActivityRegistration.builder()
                .id("reg-1")
                .activityId("act-ind")
                .participantId("user-123")
                .status(RegistrationStatus.REGISTERED)
                .registrationType(RegistrationType.INDIVIDUAL)
                .registeredAt(LocalDateTime.now())
                .build();

        when(activityRegistrationRepository.findById("reg-1")).thenReturn(Optional.of(reg));
        when(activityRegistrationRepository.save(any(ActivityRegistration.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ActivityRegistrationResponse response = service.cancelRegistration("reg-1", "user-123");

        assertEquals(RegistrationStatus.CANCELLED, response.getStatus());
        assertEquals(RegistrationStatus.CANCELLED, reg.getStatus());
    }

    @Test
    @DisplayName("Should reject cancellation if participant does not own the registration")
    void cancelRegistration_NotOwner_ThrowsException() {
        ActivityRegistration reg = ActivityRegistration.builder()
                .id("reg-1")
                .activityId("act-ind")
                .participantId("user-other")
                .status(RegistrationStatus.REGISTERED)
                .build();

        when(activityRegistrationRepository.findById("reg-1")).thenReturn(Optional.of(reg));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                service.cancelRegistration("reg-1", "user-123")
        );
        assertEquals("You can only cancel your own registration.", ex.getMessage());
    }

    @Test
    @DisplayName("Should reject cancellation if registration is already CANCELLED")
    void cancelRegistration_AlreadyCancelled_ThrowsException() {
        ActivityRegistration reg = ActivityRegistration.builder()
                .id("reg-1")
                .activityId("act-ind")
                .participantId("user-123")
                .status(RegistrationStatus.CANCELLED)
                .build();

        when(activityRegistrationRepository.findById("reg-1")).thenReturn(Optional.of(reg));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                service.cancelRegistration("reg-1", "user-123")
        );
        assertEquals("Registration is already cancelled.", ex.getMessage());
    }

    @Test
    @DisplayName("Should return enriched registrations for organizer activity")
    void getRegistrationsForActivity_Success() {
        Activity act = Activity.builder()
                .id("act-ind")
                .organizerId("org-1")
                .build();

        ActivityRegistration reg1 = ActivityRegistration.builder()
                .id("reg-1")
                .activityId("act-ind")
                .participantId("user-123")
                .registrationType(RegistrationType.INDIVIDUAL)
                .status(RegistrationStatus.REGISTERED)
                .registeredAt(LocalDateTime.now())
                .build();

        ActivityRegistration reg2 = ActivityRegistration.builder()
                .id("reg-2")
                .activityId("act-ind")
                .participantId("user-456")
                .teamId("team-123")
                .registrationType(RegistrationType.TEAM)
                .status(RegistrationStatus.REGISTERED)
                .registeredAt(LocalDateTime.now())
                .build();

        User user1 = User.builder().userId("user-123").name("Vansh").email("vansh@college.edu").build();
        User user2 = User.builder().userId("user-456").name("Rahul").email("rahul@college.edu").build();

        when(activityRepository.findById("act-ind")).thenReturn(Optional.of(act));
        when(activityRegistrationRepository.findByActivityId("act-ind")).thenReturn(List.of(reg1, reg2));
        when(userRepository.findById("user-123")).thenReturn(Optional.of(user1));
        when(userRepository.findById("user-456")).thenReturn(Optional.of(user2));
        when(teamRepository.findById("team-123")).thenReturn(Optional.of(team));

        List<OrganizerRegistrationResponse> responses = service.getRegistrationsForActivity("act-ind", "org-1");

        assertNotNull(responses);
        assertEquals(2, responses.size());

        OrganizerRegistrationResponse res1 = responses.get(0);
        assertEquals("reg-1", res1.getId());
        assertEquals("Vansh", res1.getParticipantName());
        assertEquals("vansh@college.edu", res1.getParticipantEmail());
        assertNull(res1.getTeamName());

        OrganizerRegistrationResponse res2 = responses.get(1);
        assertEquals("reg-2", res2.getId());
        assertEquals("Rahul", res2.getParticipantName());
        assertEquals("team-123", res2.getTeamId());
        assertEquals("Alpha Squad", res2.getTeamName());
        assertEquals(List.of("user-123", "user-456"), res2.getTeamMemberIds());
    }

    @Test
    @DisplayName("Should reject organizer viewing registrations if organizer does not own the activity")
    void getRegistrationsForActivity_NotOwner_ThrowsException() {
        Activity act = Activity.builder()
                .id("act-ind")
                .organizerId("org-other")
                .build();

        when(activityRepository.findById("act-ind")).thenReturn(Optional.of(act));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                service.getRegistrationsForActivity("act-ind", "org-1")
        );
        assertEquals("You are not allowed to view registrations for this activity.", ex.getMessage());
    }
}

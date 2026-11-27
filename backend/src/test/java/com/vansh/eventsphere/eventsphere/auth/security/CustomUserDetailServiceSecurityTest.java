package com.vansh.eventsphere.eventsphere.auth.security;

import com.vansh.eventsphere.eventsphere.user.model.Role;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomUserDetailServiceSecurityTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CustomUserDetailService customUserDetailService;

    @Test
    void loadUserByUsername_activeAndEmailVerified_isEnabled() {
        User user = User.builder()
                .userId("u1")
                .email("user@college.edu")
                .password("encoded")
                .role(Role.PARTICIPANT)
                .active(true)
                .emailVerified(true)
                .build();

        when(userRepository.findByEmail("user@college.edu")).thenReturn(Optional.of(user));

        UserDetails details = customUserDetailService.loadUserByUsername("user@college.edu");
        assertTrue(details.isEnabled(), "Active user with verified email should be enabled");
    }

    @Test
    void loadUserByUsername_unverifiedEmail_isDisabled() {
        User user = User.builder()
                .userId("u2")
                .email("unverified@college.edu")
                .password("encoded")
                .role(Role.PARTICIPANT)
                .active(true)
                .emailVerified(false)
                .build();

        when(userRepository.findByEmail("unverified@college.edu")).thenReturn(Optional.of(user));

        UserDetails details = customUserDetailService.loadUserByUsername("unverified@college.edu");
        assertFalse(details.isEnabled(), "User with emailVerified=false must be disabled (cannot log in)");
    }

    @Test
    void loadUserByUsername_inactiveUser_isDisabled() {
        User user = User.builder()
                .userId("u3")
                .email("inactive@college.edu")
                .password("encoded")
                .role(Role.ORGANIZER)
                .active(false)
                .emailVerified(true)
                .build();

        when(userRepository.findByEmail("inactive@college.edu")).thenReturn(Optional.of(user));

        UserDetails details = customUserDetailService.loadUserByUsername("inactive@college.edu");
        assertFalse(details.isEnabled(), "Inactive user must be disabled");
    }

    @Test
    void loadUserByUsername_legacyUserWithNullEmailVerified_isEnabledIfActive() {
        User legacyUser = User.builder()
                .userId("u4")
                .email("legacy@college.edu")
                .password("encoded")
                .role(Role.PARTICIPANT)
                .active(true)
                .emailVerified(null)
                .build();

        when(userRepository.findByEmail("legacy@college.edu")).thenReturn(Optional.of(legacyUser));

        UserDetails details = customUserDetailService.loadUserByUsername("legacy@college.edu");
        assertTrue(details.isEnabled(), "Legacy user with null emailVerified should remain compatible and enabled");
    }
}


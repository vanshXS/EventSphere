
package com.vansh.eventsphere.eventsphere.user.configuration;

import java.time.LocalDateTime;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import com.vansh.eventsphere.eventsphere.user.model.Role;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.security.crypto.password.PasswordEncoder;

@Component
@RequiredArgsConstructor
@Slf4j
public class SuperAdminBootstrap implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${SUPER_ADMIN_EMAIL:}")
    private String adminEmail;

    @Value("${SUPER_ADMIN_PASSWORD:}")
    private String adminPassword;

    @Override
    public void run(ApplicationArguments args) {

        // Never create another Super Admin if one already exists.
        if (userRepository.existsByRole(Role.SUPER_ADMIN)) {
            log.info("Super Admin already exists. Bootstrap skipped.");
            return;
        }

        if (adminEmail == null || adminEmail.isBlank()
                || adminPassword == null || adminPassword.isBlank()) {
            throw new IllegalStateException(
                    "SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be configured."
            );
        }

        String normalizedEmail = adminEmail.trim().toLowerCase();

        if (adminPassword.length() < 12) {
            throw new IllegalStateException(
                    "Super Admin password must contain at least 12 characters."
            );
        }

        // Prevent accidentally overwriting an existing normal account.
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new IllegalStateException(
                    "Configured Super Admin email already belongs to another account."
            );
        }

        LocalDateTime now = LocalDateTime.now();

        User superAdmin = User.builder()
                .name("Super Admin")
                .email(normalizedEmail)
                .password(passwordEncoder.encode(adminPassword))
                .role(Role.SUPER_ADMIN)
                .active(true)
                .createdAt(now)
                .updatedAt(now)
                .build();

        userRepository.save(superAdmin);

        log.info("Initial Super Admin account created successfully.");
    }
}

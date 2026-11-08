
package com.vansh.eventsphere.eventsphere.college.service;

import com.vansh.eventsphere.eventsphere.college.model.OTPChallenge;
import com.vansh.eventsphere.eventsphere.college.repository.OTPChallengeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OTPServiceTest {

    @Mock
    private OTPChallengeRepository repository;

    private OTPService otpService;

    private static final String SECRET = "test-secret-for-otp";

    @BeforeEach
    void setUp() {
        otpService = new OTPService(repository, SECRET);
    }

    @Test
    void generateOTP_shouldReturnSixDigitCode() {
        String otp = otpService.generateOTP();

        assertNotNull(otp);
        assertTrue(otp.matches("\\d{6}"));
    }

    @Test
    void createChallenge_shouldPersistHashedOtpAndReturnRawOtp() {
        when(repository.save(any(OTPChallenge.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        OTPService.GeneratedOTP generated =
                otpService.createChallenge(
                        "application-1",
                        "admin@college.edu",
                        "COLLEGE_DOMAIN_VERIFICATION"
                );

        assertNotNull(generated.rawOtp());
        assertTrue(generated.rawOtp().matches("\\d{6}"));

        OTPChallenge challenge = generated.challenge();

        assertEquals("application-1", challenge.getTargetId());
        assertEquals("admin@college.edu", challenge.getEmail());
        assertEquals(0, challenge.getAttempts());
        assertEquals(5, challenge.getMaxAttempts());

        assertNotEquals(generated.rawOtp(), challenge.getOtpHash());
        assertEquals(
                otpService.hashOTP(generated.rawOtp()),
                challenge.getOtpHash()
        );

        verify(repository).save(any(OTPChallenge.class));
    }

    @Test
    void hashOTP_shouldReturnSameHashForSameInput() {
        String first = otpService.hashOTP("123456");
        String second = otpService.hashOTP("123456");

        assertEquals(first, second);
        assertNotEquals("123456", first);
    }

    @Test
    void verifyOTP_shouldIncrementAttemptsWhenOtpIsWrong() {
        OTPChallenge challenge = createChallenge(0, 5);

        when(repository.save(any(OTPChallenge.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        boolean result = otpService.verifyOTP(challenge, "000000");

        assertFalse(result);
        assertEquals(1, challenge.getAttempts());

        verify(repository).save(challenge);
    }

    @Test
    void verifyOTP_shouldReturnTrueForCorrectOtp() {
        String rawOtp = "123456";

        OTPChallenge challenge = createChallenge(0, 5);
        challenge.setOtpHash(otpService.hashOTP(rawOtp));

        when(repository.save(any(OTPChallenge.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        boolean result = otpService.verifyOTP(challenge, rawOtp);

        assertTrue(result);
        assertEquals(1, challenge.getAttempts());
    }

    @Test
    void verifyOTP_shouldNotIncrementAfterMaximumAttempts() {
        OTPChallenge challenge = createChallenge(5, 5);

        boolean result = otpService.verifyOTP(challenge, "123456");

        assertFalse(result);
        assertEquals(5, challenge.getAttempts());

        verify(repository, never()).save(any());
    }

    @Test
    void findValidChallenge_shouldRejectExpiredChallenge() {
        OTPChallenge challenge = createChallenge(0, 5);
        challenge.setExpiresAt(LocalDateTime.now().minusMinutes(1));

        when(repository
                .findFirstByTargetIdAndEmailAndPurposeOrderByCreatedAtDesc(
                        "application-1",
                        "admin@college.edu",
                        "DOMAIN"
                ))
                .thenReturn(Optional.of(challenge));

        assertTrue(
                otpService.findValidChallenge(
                        "application-1",
                        "admin@college.edu",
                        "DOMAIN"
                ).isEmpty()
        );
    }

    @Test
    void findValidChallenge_shouldRejectExhaustedChallenge() {
        OTPChallenge challenge = createChallenge(5, 5);

        when(repository
                .findFirstByTargetIdAndEmailAndPurposeOrderByCreatedAtDesc(
                        "application-1",
                        "admin@college.edu",
                        "DOMAIN"
                ))
                .thenReturn(Optional.of(challenge));

        assertTrue(
                otpService.findValidChallenge(
                        "application-1",
                        "admin@college.edu",
                        "DOMAIN"
                ).isEmpty()
        );
    }

    @Test
    void canResend_shouldRejectResendWithinSixtySeconds() {
        OTPChallenge challenge = createChallenge(0, 5);
        challenge.setLastSentAt(LocalDateTime.now().minusSeconds(30));

        assertFalse(otpService.canResend(challenge));
    }

    @Test
    void canResend_shouldAllowResendAfterSixtySeconds() {
        OTPChallenge challenge = createChallenge(0, 5);
        challenge.setLastSentAt(LocalDateTime.now().minusSeconds(61));

        assertTrue(otpService.canResend(challenge));
    }

    private OTPChallenge createChallenge(int attempts, int maxAttempts) {
        return OTPChallenge.builder()
                .id("challenge-1")
                .targetId("application-1")
                .email("admin@college.edu")
                .purpose("DOMAIN")
                .otpHash(otpService.hashOTP("123456"))
                .attempts(attempts)
                .maxAttempts(maxAttempts)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .lastSentAt(LocalDateTime.now())
                .build();
    }
}

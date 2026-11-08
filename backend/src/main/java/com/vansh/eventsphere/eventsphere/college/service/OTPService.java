package com.vansh.eventsphere.eventsphere.college.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.vansh.eventsphere.eventsphere.college.model.OTPChallenge;
import com.vansh.eventsphere.eventsphere.college.repository.OTPChallengeRepository;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class OTPService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final OTPChallengeRepository otpChallengeRepository;
    private final String secret;

    public record GeneratedOTP(
            OTPChallenge challenge,
            String rawOtp
    ) {}

    @Autowired
    public OTPService(
            OTPChallengeRepository otpChallengeRepository,
            @Value("${app.college.otp-secret}")
            String secret
    ) {
        this.otpChallengeRepository = otpChallengeRepository;
        this.secret = secret;
    }

    public String generateOTP() {
        int otp = 100000 + RANDOM.nextInt(900000);
        return String.valueOf(otp);
    }

    public String hashOTP(String otp) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");

            byte[] hash = digest.digest(
                    (otp + secret).getBytes(StandardCharsets.UTF_8)
            );

            return Base64.getEncoder().encodeToString(hash);

        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    // Generates one OTP, stores its hash, and returns the raw OTP for emailing.
    public GeneratedOTP createChallenge(
            String targetId,
            String email,
            String purpose
    ) {
        String otp = generateOTP();
        LocalDateTime now = LocalDateTime.now();

        OTPChallenge challenge = OTPChallenge.builder()
                .targetId(targetId)
                .email(email)
                .purpose(purpose)
                .otpHash(hashOTP(otp))
                .attempts(0)
                .maxAttempts(5)
                .expiresAt(now.plusMinutes(10))
                .createdAt(now)
                .lastSentAt(now)
                .build();

        OTPChallenge saved = otpChallengeRepository.save(challenge);

        log.debug(
                "Created OTP challenge for target={}, purpose={}",
                targetId,
                purpose
        );

        return new GeneratedOTP(saved, otp);
    }

    public Optional<OTPChallenge> findLatestChallenge(
            String targetId,
            String email,
            String purpose
    ) {
        return otpChallengeRepository
                .findFirstByTargetIdAndEmailAndPurposeOrderByCreatedAtDesc(
                        targetId,
                        email,
                        purpose
                );
    }

    public Optional<OTPChallenge> findValidChallenge(
            String targetId,
            String email,
            String purpose
    ) {
        return findLatestChallenge(targetId, email, purpose)
                .filter(c -> c.getExpiresAt().isAfter(LocalDateTime.now()))
                .filter(c -> c.getAttempts() < c.getMaxAttempts());
    }

    // Every submitted code consumes one attempt.
    public boolean verifyOTP(OTPChallenge challenge, String otp) {

        if (challenge.getAttempts() >= challenge.getMaxAttempts()) {
            return false;
        }

        challenge.setAttempts(challenge.getAttempts() + 1);
        otpChallengeRepository.save(challenge);

        String providedHash = hashOTP(otp == null ? "" : otp.trim());

        return MessageDigest.isEqual(
                providedHash.getBytes(StandardCharsets.UTF_8),
                challenge.getOtpHash().getBytes(StandardCharsets.UTF_8)
        );
    }

    public boolean canResend(OTPChallenge challenge) {

        if (challenge.getLastSentAt() == null) {
            return true;
        }

        return !challenge.getLastSentAt()
                .plusSeconds(60)
                .isAfter(LocalDateTime.now());
    }

    public void invalidateChallenge(
            String targetId,
            String email,
            String purpose
    ) {
        otpChallengeRepository.deleteByTargetIdAndEmailAndPurpose(
                targetId,
                email,
                purpose
        );
    }

    public void deleteChallenge(OTPChallenge challenge) {
        otpChallengeRepository.delete(challenge);
    }
}
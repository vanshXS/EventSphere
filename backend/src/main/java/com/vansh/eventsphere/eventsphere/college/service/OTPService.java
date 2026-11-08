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

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class OTPService {

    private final OTPChallengeRepository otpChallengeRepository;
    private final String secret;

    @Autowired
    public OTPService(
            OTPChallengeRepository otpChallengeRepository,
            @Value("${app.college.otp-secret:${COLLEGE_OTP_SECRET:default-dev-otp-secret-key-123456}}") String secret) {
        this.otpChallengeRepository = otpChallengeRepository;
        this.secret = secret;
    }

    @PostConstruct
    public void init() {
        if (secret == null || secret.trim().isEmpty()) {
            log.warn("COLLEGE_OTP_SECRET not set. Using random secret for development only.");
        }
    }

    public String generateOTP() {
        SecureRandom random = new SecureRandom();
        int otp = 100000 + random.nextInt(900000);
        return String.valueOf(otp);
    }

    public String hashOTP(String otp) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest((otp + secret).getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    public OTPChallenge createChallenge(String targetId, String email, String purpose) {
        String otp = generateOTP();
        String otpHash = hashOTP(otp);

        OTPChallenge challenge = OTPChallenge.builder()
                .targetId(targetId)
                .email(email)
                .purpose(purpose)
                .otpHash(otpHash)
                .attempts(0)
                .maxAttempts(5)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .createdAt(LocalDateTime.now())
                .lastSentAt(LocalDateTime.now())
                .build();

        OTPChallenge saved = otpChallengeRepository.save(challenge);
        log.debug("Created OTP challenge for target={}, purpose={}", targetId, purpose);
        return saved;
    }

    public Optional<OTPChallenge> findValidChallenge(String targetId, String email, String purpose) {
        return otpChallengeRepository.findFirstByTargetIdAndEmailAndPurposeOrderByCreatedAtDesc(targetId, email, purpose)
                .filter(c -> c.getExpiresAt().isAfter(LocalDateTime.now()))
                .filter(c -> c.getAttempts() < c.getMaxAttempts());
    }

    public boolean verifyOTP(OTPChallenge challenge, String otp) {
        challenge.setAttempts(challenge.getAttempts() + 1);
        otpChallengeRepository.save(challenge);

        String hashed = hashOTP(otp);
        if (hashed.equals(challenge.getOtpHash())) {
            return true;
        }
        return false;
    }

    public void invalidateChallenge(String targetId, String email, String purpose) {
        otpChallengeRepository.deleteByTargetIdAndEmailAndPurpose(targetId, email, purpose);
    }

    public boolean canResend(OTPChallenge challenge) {
        if (challenge.getLastSentAt() == null) return true;
        return challenge.getLastSentAt().plusSeconds(60).isBefore(LocalDateTime.now());
    }

    public void updateLastSent(OTPChallenge challenge) {
        challenge.setLastSentAt(LocalDateTime.now());
        otpChallengeRepository.save(challenge);
    }

    public void deleteChallenge(OTPChallenge challenge) {
        otpChallengeRepository.delete(challenge);
    }
}
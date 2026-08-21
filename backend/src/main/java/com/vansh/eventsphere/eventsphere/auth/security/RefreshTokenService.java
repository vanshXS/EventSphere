package com.vansh.eventsphere.eventsphere.auth.security;

import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.refresh_token.model.RefreshToken;
import com.vansh.eventsphere.eventsphere.refresh_token.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.lang.ref.Reference;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    private final SecureRandom secureRandom = new SecureRandom();

    public String createRefreshToken(User user) {

        byte[] randomBytes = new byte[16];

        secureRandom.nextBytes(randomBytes);

        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
        String tokenHash = hasToken(rawToken);

        RefreshToken refreshToken = RefreshToken.builder()
                .userId(user.getUserId())
                .tokenHash(tokenHash)
                .expiredAt(
                        LocalDateTime.now().plusSeconds(refreshTokenExpiration / 1000)
                )
                .revoked(false)
                .createdAt(LocalDateTime.now())
                .build();

        refreshTokenRepository.save(refreshToken);

        return rawToken;
    }

    public void revokeToken(String rawToken) {

        String hashToken = hasToken(rawToken);

        refreshTokenRepository.findByTokenHash(hashToken)
                .ifPresent(refreshToken -> {
                    refreshToken.setRevoked(true);
                    refreshTokenRepository.save(refreshToken);
                });
    }

    public RefreshToken validateRefreshToken(String rawToken) {

        String hashToken = hasToken(rawToken);

        RefreshToken refreshToken = refreshTokenRepository.findByTokenHash(hashToken)
                .orElseThrow(() -> new RuntimeException("Refresh token not found"));

        if(refreshToken.getExpiredAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Refresh token is expired");
        }

        if(refreshToken.isRevoked()) {
            throw new RuntimeException("Refresh token is revoked");
        }

        return refreshToken;

    }

    public String hasToken(String token) {

        try {

            MessageDigest digest = MessageDigest.getInstance("SHA-256");

            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));

            return Base64.getEncoder().encodeToString(hash);

        }catch(Exception e) {
            throw new IllegalStateException("Could not hash refresh token", e);
        }
    }
}

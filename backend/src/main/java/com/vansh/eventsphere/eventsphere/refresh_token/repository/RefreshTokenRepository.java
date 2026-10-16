package com.vansh.eventsphere.eventsphere.refresh_token.repository;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.vansh.eventsphere.eventsphere.refresh_token.model.RefreshToken;
import org.springframework.stereotype.Repository;

@Repository
public interface RefreshTokenRepository extends MongoRepository<RefreshToken, String> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);
    void deleteAllByUserId(String userId);
    
}

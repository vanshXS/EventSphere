package com.vansh.eventsphere.eventsphere.user.repository;

import java.util.Optional;


import org.springframework.data.mongodb.repository.MongoRepository;

import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.model.Role;

public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    boolean existsByRole(Role role);

}

package com.vansh.eventsphere.eventsphere.college.repository;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;
import com.vansh.eventsphere.eventsphere.college.model.CollegeAdminInvitation;
public interface CollegeAdminInvitationRepository extends MongoRepository<CollegeAdminInvitation, String> {
    Optional<CollegeAdminInvitation> findByTokenHash(String tokenHash);
}

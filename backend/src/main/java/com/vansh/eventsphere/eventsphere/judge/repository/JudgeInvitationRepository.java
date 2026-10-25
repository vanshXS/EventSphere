package com.vansh.eventsphere.eventsphere.judge.repository;

import com.vansh.eventsphere.eventsphere.judge.model.JudgeInvitation;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeInvitationStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface JudgeInvitationRepository extends MongoRepository<JudgeInvitation, String> {

    Optional<JudgeInvitation> findByInvitationTokenHashAndStatus(
            String invitationTokenHash,
            JudgeInvitationStatus status
    );

    List<JudgeInvitation> findByRoundId(String roundId);

    List<JudgeInvitation> findByRoundIdAndStatus(String roundId, JudgeInvitationStatus status);

    List<JudgeInvitation> findByRoundIdAndEmailAndStatusIn(
            String roundId,
            String email,
            Collection<JudgeInvitationStatus> statuses
    );

}

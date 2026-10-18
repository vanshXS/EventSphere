
package com.vansh.eventsphere.eventsphere.judge.repository;

import com.vansh.eventsphere.eventsphere.judge.model.JudgeAssignment;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeAssignmentStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface JudgeAssignmentRepository
        extends MongoRepository<JudgeAssignment, String> {

    Optional<JudgeAssignment> findByRoundIdAndJudgeId(
            String roundId,
            String judgeId
    );

    List<JudgeAssignment> findByRoundIdAndStatus(
            String roundId,
            JudgeAssignmentStatus status
    );

    List<JudgeAssignment> findByJudgeIdAndStatus(
            String judgeId,
            JudgeAssignmentStatus status
    );

    boolean existsByRoundIdAndJudgeIdAndStatus(
            String roundId,
            String judgeId,
            JudgeAssignmentStatus status
    );

    List<JudgeAssignment> findByRoundId(String roundId);
}


package com.vansh.eventsphere.eventsphere.judge.repository;

import com.vansh.eventsphere.eventsphere.judge.model.JudgeEvaluation;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeEvaluationStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface JudgeEvaluationRepository
        extends MongoRepository<JudgeEvaluation, String> {

    Optional<JudgeEvaluation> findByRoundIdAndRegistrationIdAndJudgeId(
            String roundId,
            String registrationId,
            String judgeId
    );

    List<JudgeEvaluation> findByRoundIdAndRegistrationId(
            String roundId,
            String registrationId
    );

    List<JudgeEvaluation> findByRoundIdAndJudgeId(
            String roundId,
            String judgeId
    );

    List<JudgeEvaluation> findByRoundIdAndStatus(
            String roundId,
            JudgeEvaluationStatus status
    );

    boolean existsByRoundIdAndRegistrationIdAndJudgeIdAndStatus(
            String roundId,
            String registrationId,
            String judgeId,
            JudgeEvaluationStatus status
    );
}

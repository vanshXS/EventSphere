package com.vansh.eventsphere.eventsphere.common.transaction;

import com.mongodb.MongoException;
import org.springframework.data.mongodb.MongoTransactionManager;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Supplier;

/**
 * Runs database work in a MongoDB transaction and retries it when two
 * requests conflict. Holds no domain logic, so any module can reuse it.
 */
@Component
public class TransactionRunner {

    private static final int MAX_ATTEMPTS = 5;
    private static final String TRANSIENT = "TransientTransactionError";
    private static final String UNKNOWN_COMMIT = "UnknownTransactionCommitResult";

    private final MongoTemplate mongoTemplate;
    private final TransactionTemplate template;

    public TransactionRunner(
            MongoTemplate mongoTemplate,
            MongoTransactionManager transactionManager
    ) {
        this.mongoTemplate = mongoTemplate;
        this.template = new TransactionTemplate(transactionManager);
        this.template.setPropagationBehavior(
                TransactionDefinition.PROPAGATION_REQUIRES_NEW
        );
    }

    public <T> T run(Supplier<T> work) {
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                return template.execute(status -> work.get());

            } catch (RuntimeException exception) {

                // The commit may already have succeeded. Never rerun the work.
                if (hasLabel(exception, UNKNOWN_COMMIT)) {
                    throw new ResponseStatusException(
                            HttpStatus.SERVICE_UNAVAILABLE,
                            "The save result could not be confirmed. Refresh "
                                    + "and check the current state before retrying.",
                            exception
                    );
                }

                // Validation and permission failures are answers, not conflicts.
                if (!hasLabel(exception, TRANSIENT)) {
                    throw exception;
                }

                if (attempt == MAX_ATTEMPTS) {
                    throw new ResponseStatusException(
                            HttpStatus.SERVICE_UNAVAILABLE,
                            "This record is busy. Please try again shortly.",
                            exception
                    );
                }

                pause(attempt);
            }
        }

        throw new IllegalStateException("Transaction attempts exhausted.");
    }

    public void run(Runnable work) {
        run(() -> {
            work.run();
            return null;
        });
    }

    /**
     * Forces competing transactions to write the same document, so MongoDB
     * can detect the conflict. The stored value is meaningless.
     * Call this inside run(...) before reading data you intend to act on.
     */
    public void guard(Class<?> documentType, String id) {
        var result = mongoTemplate.updateFirst(
                Query.query(Criteria.where("id").is(id)),
                new Update().inc("revision", 1L),
                documentType
        );

        if (result.getMatchedCount() != 1) {
            throw new IllegalStateException(
                    "Record not found while guarding: " + id
            );
        }
    }

    private boolean hasLabel(Throwable exception, String label) {
        Throwable current = exception;
        while (current != null) {
            if (current instanceof MongoException mongo
                    && mongo.hasErrorLabel(label)) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private void pause(int attempt) {
        long delay = ThreadLocalRandom.current().nextLong(25, 76) * attempt;
        try {
            Thread.sleep(delay);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "The request was interrupted. Please refresh before retrying.",
                    exception
            );
        }
    }
}